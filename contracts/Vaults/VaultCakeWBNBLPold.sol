// SPDX-License-Identifier: MIT
pragma solidity ^0.6.12;

import "../Libraries/SafeBEP20.sol";
import "../Libraries/Math.sol";
import '../Helpers/IPathFinder.sol';
import "../Helpers/TokenAddresses.sol";
import "../Helpers/IMinter.sol";
import "../Modifiers/PausableUpgradeable.sol";
import "../Modifiers/WhitelistUpgradeable.sol";
import "../Tokens/IPair.sol";
import "../IRouterV2.sol";
import "./Interfaces/IStrategy.sol";
import "./Externals/ICakeMasterChef.sol";
import "./VaultVested.sol";
import './VaultDistribution.sol';
import 'hardhat/console.sol';

// Rep cakes + ven la mitat per bnb i fa addliquidity a (cake-bnb) i el lp autocompund
// withdraw es treuren tots els cake-bnb, al user se li torna els lps inicials (principal) i els rewards es converteixen
// a cake (fent remove liquidity) convertint els bnb a cake
// amb el cake es fa handle rewards
contract VaultCakeWBNBLPold is IStrategy, PausableUpgradeable, WhitelistUpgradeable {
    using SafeBEP20 for IBEP20;
    using SafeMath for uint;
    using SafeMath for uint16;

    IBEP20 public lpToken;
    IBEP20 public global;
    IBEP20 public cake;
    IBEP20 public wbnb;
    ICakeMasterChef public cakeMasterChef;
    IRouterV2 public cakeRouter;
    IMinter public minter;
    address public treasury;
    VaultVested public vaultVested;
    VaultDistribution public vaultDistribution;
    IRouterV2 public globalRouter;
    IPathFinder public pathFinder;
    TokenAddresses public tokenAddresses;

    uint16 public constant MAX_WITHDRAWAL_FEES = 100; // 1%
    uint public constant DUST = 1000;
    uint private constant SLIPPAGE = 9500;
    address public constant GLOBAL_BURN_ADDRESS = 0x000000000000000000000000000000000000dEaD;

    uint256 public pid;
    uint public totalShares;
    mapping (address => uint) public _shares;
    mapping (address => uint) public _principal;
    mapping (address => uint) public _depositedAt;

    struct WithdrawalFees {
        uint16 burn;      // % to burn (in Global)
        uint16 team;      // % to devs (in BUSD)
        uint256 interval; // Meanwhile, fees will be apply (timestamp)
    }

    struct Rewards {
        uint16 toUser;       // % to user
        uint16 toOperations; // % to treasury (in BUSD)
        uint16 toBuyGlobal;  // % to keeper as user (in Global)
        uint16 toBuyWBNB;    // % to keeper as vault (in WBNB)
        uint16 toMintGlobal; // % to mint global multiplier (relation to toBuyGlobal)
    }

    WithdrawalFees public withdrawalFees;
    Rewards public rewards;

    modifier onlyNonContract() {
        require(tx.origin == msg.sender);
        address a = msg.sender;
        uint32 size;
        assembly {
            size := extcodesize(a)
        }
        require(size == 0, "Contract calls not allowed");
        _;
    }

    constructor(
        uint256 _pid,
        address _lpToken,
        address _global,
        address _cake,
        address _wbnb,
        address _cakeMasterChef,
        address _cakeRouter,
        address _treasury,
        address _tokenAddresses,
        address _globalRouter,
        address _pathFinder,
        address _vaultDistribution,
        address _vaultVested
    ) public {
        pid = _pid;
        lpToken = IBEP20(_lpToken);
        global = IBEP20(_global);
        cake = IBEP20(_cake);
        wbnb = IBEP20(_wbnb);
        cakeMasterChef = ICakeMasterChef(_cakeMasterChef);
        cakeRouter = IRouterV2(_cakeRouter);
        treasury = _treasury;
        vaultVested = VaultVested(_vaultVested);
        vaultDistribution = VaultDistribution(_vaultDistribution);

        lpToken.safeApprove(_cakeMasterChef, uint(~0));

        __PausableUpgradeable_init();
        __WhitelistUpgradeable_init();

        setDefaultWithdrawalFees();
        setDefaultRewardFees();

        tokenAddresses = TokenAddresses(_tokenAddresses);
        globalRouter = IRouterV2(_globalRouter);
        pathFinder = IPathFinder(_pathFinder);

        IPair pair = IPair(tokenAddresses.findByName(tokenAddresses.CAKE_WBNB_LP()));
        _allowance(IBEP20(address(pair)), _cakeRouter);
        _allowance(cake, _globalRouter);
        _allowance(wbnb, _globalRouter);
    }

    function setMinter(address _minter) external onlyOwner {
        require(IMinter(_minter).isMinter(address(this)) == true, "This vault must be a minter in minter's contract");
        lpToken.safeApprove(_minter, 0);
        lpToken.safeApprove(_minter, uint(~0));
        minter = IMinter(_minter);
    }

    function setWithdrawalFees(uint16 burn, uint16 team, uint256 interval) public onlyOwner {
        require(burn.add(team) <= MAX_WITHDRAWAL_FEES, "Withdrawal fees too high");

        withdrawalFees.burn = burn;
        withdrawalFees.team = team;
        withdrawalFees.interval = interval;
    }

    function setRewards(
        uint16 _toUser,
        uint16 _toOperations,
        uint16 _toBuyGlobal,
        uint16 _toBuyWBNB,
        uint16 _toMintGlobal
    ) public onlyOwner {
        require(_toUser.add(_toOperations).add(_toBuyGlobal).add(_toBuyWBNB) == 10000, "Rewards must add up to 100%");

        rewards.toUser = _toUser;
        rewards.toOperations = _toOperations;
        rewards.toBuyGlobal = _toBuyGlobal;
        rewards.toBuyWBNB = _toBuyWBNB;
        rewards.toMintGlobal = _toMintGlobal;
    }

    function setDefaultWithdrawalFees() private {
        setWithdrawalFees(60, 10, 4 days);
    }

    function setDefaultRewardFees() private {
        setRewards(7500, 400, 600, 1500, 25000);
    }

    function canMint() internal view returns (bool) {
        return address(minter) != address(0) && minter.isMinter(address(this));
    }

    function totalSupply() external view override returns (uint) {
        return totalShares;
    }

    function balance() public view override returns (uint amount) {
        (amount,) = cakeMasterChef.userInfo(pid, address(this));
    }

    function balanceOf(address account) public view override returns(uint) {
        if (totalShares == 0) return 0;
        return balance().mul(sharesOf(account)).div(totalShares);
    }

    function withdrawableBalanceOf(address account) public view override returns (uint) {
        return balanceOf(account);
    }

    function sharesOf(address account) public view override returns (uint) {
        return _shares[account];
    }

    function principalOf(address account) public view override returns (uint) {
        return _principal[account];
    }

    function earned(address account) public view override returns (uint) {
        if (balanceOf(account) >= principalOf(account) + DUST) {
            return balanceOf(account).sub(principalOf(account));
        } else {
            return 0;
        }
    }

    function priceShare() external view override returns(uint) {
        if (totalShares == 0) return 1e18;
        return balance().mul(1e18).div(totalShares);
    }

    function depositedAt(address account) external view override returns (uint) {
        return _depositedAt[account];
    }

    function stakingToken() external view returns (address) {
        return address(lpToken);
    }

    function rewardsToken() external view override returns (address) {
        return address(cake);
    }

    function deposit(uint _amount) public override onlyNonContract {
        _deposit(_amount, msg.sender);
        _principal[msg.sender] = _principal[msg.sender].add(_amount);
        _depositedAt[msg.sender] = block.timestamp;
    }

    function depositAll() external override onlyNonContract {
        deposit(lpToken.balanceOf(msg.sender));
    }

    function withdrawAll() external override onlyNonContract {
        uint amount = balanceOf(msg.sender);
        uint principal = principalOf(msg.sender);
        uint profit = amount > principal ? amount.sub(principal) : 0;

        (uint cakeHarvested) = _withdrawStakingToken(amount);

        handleWithdrawalFees(principal);
        handleRewards(profit);

        totalShares = totalShares.sub(_shares[msg.sender]);
        delete _shares[msg.sender];
        delete _principal[msg.sender];
        delete _depositedAt[msg.sender];

        _harvest(cakeHarvested);
    }

    function harvest() external override onlyNonContract {
        uint lpTokenHarvested = _withdrawStakingToken(0);
        _harvest(lpTokenHarvested);
    }

    function withdraw(uint shares) external override onlyWhitelisted onlyNonContract {
        require(balance() > 0, "Nothing to withdraw");
        uint amount = balance().mul(shares).div(totalShares);

        uint lpTokenHarvested = _withdrawStakingToken(amount);

        handleWithdrawalFees(amount);

        totalShares = totalShares.sub(shares);
        _shares[msg.sender] = _shares[msg.sender].sub(shares);
        _principal[msg.sender] = _principal[msg.sender].sub(amount);

        _harvest(lpTokenHarvested);
    }

    function withdrawUnderlying(uint _amount) external override onlyNonContract {
        require(balance() > 0, "Nothing to withdraw");
        uint amount = Math.min(_amount, _principal[msg.sender]);
        uint shares = Math.min(amount.mul(totalShares).div(balance()), _shares[msg.sender]);

        uint lpTokenHarvested = _withdrawStakingToken(amount);

        handleWithdrawalFees(amount);

        totalShares = totalShares.sub(shares);
        _shares[msg.sender] = _shares[msg.sender].sub(shares);
        _principal[msg.sender] = _principal[msg.sender].sub(amount);

        _harvest(lpTokenHarvested);
    }

    function getReward() external override onlyNonContract {
        uint amount = earned(msg.sender);
        uint shares = Math.min(amount.mul(totalShares).div(balance()), _shares[msg.sender]);

        uint lpTokenHarvested = _withdrawStakingToken(amount);

        handleRewards(amount);

        totalShares = totalShares.sub(shares);
        _shares[msg.sender] = _shares[msg.sender].sub(shares);
        _cleanupIfDustShares();

        _harvest(lpTokenHarvested);
    }

    // Receives lpToken as amount
    function handleWithdrawalFees(uint _amount) private {
        // Swaps lpToken to CAKE and BNB (remove liquidity)
        (uint amountCake, uint amountBNB) = cakeRouter.removeLiquidity(
            address(cake),
            address(wbnb),
            _amount,
            0,
            0,
            address(this),
            block.timestamp
        );

        // No withdrawal fees
        if (_depositedAt[msg.sender].add(withdrawalFees.interval) < block.timestamp) {
            // Swaps BNB to CAKE
            address[] memory pathToCake = pathFinder.findPath(address(wbnb), address(cake));
            uint[] memory amountsPredicted = globalRouter.getAmountsOut(amountBNB, pathToCake);
            uint[] memory amountsCake = globalRouter.swapExactTokensForTokens(
                amountBNB,
                (amountsPredicted[amountsPredicted.length-1].mul(SLIPPAGE)).div(10000),
                pathToCake,
                address(this),
                block.timestamp
            );

            uint amountCakeSwapped = amountsCake[amountsCake.length-1];

            cake.safeTransfer(msg.sender, amountCake.add(amountCakeSwapped));
            emit Withdrawn(msg.sender, amountCake.add(amountCakeSwapped), 0);
            return;
        }

        // Swaps CAKE to BNB
        address[] memory pathToBnb = pathFinder.findPath(address(cake), address(wbnb));
        uint[] memory amountsPredicted = globalRouter.getAmountsOut(amountCake, pathToBnb);
        uint[] memory amountsBNB = globalRouter.swapExactTokensForTokens(
            amountCake,
            (amountsPredicted[amountsPredicted.length-1].mul(SLIPPAGE)).div(10000),
            pathToBnb,
            address(this),
            block.timestamp
        );

        // Total BNB swapped amount + BNB
        uint totalAmountBNB = amountsBNB[amountsBNB.length-1].add(amountBNB);

        uint amountToBurn = totalAmountBNB.mul(withdrawalFees.burn).div(10000);
        uint amountToTeam = totalAmountBNB.mul(withdrawalFees.team).div(10000);
        uint amountToUser = totalAmountBNB.sub(amountToTeam).sub(amountToBurn);

        address[] memory pathToGlobal = pathFinder.findPath(address(wbnb), address(global));
        address[] memory pathToBusd = pathFinder.findPath(address(wbnb), tokenAddresses.findByName(tokenAddresses.BUSD()));

        // Swaps BNB to GLOBAL and burns GLOBAL
        if (amountToBurn < DUST) {
            amountToUser = amountToUser.add(amountToBurn);
        } else {
            uint[] memory amountsPredicted = globalRouter.getAmountsOut(amountToBurn, pathToGlobal);
            globalRouter.swapExactTokensForTokens(
                amountToBurn,
                (amountsPredicted[amountsPredicted.length-1].mul(SLIPPAGE)).div(10000),
                pathToGlobal,
                GLOBAL_BURN_ADDRESS,
                block.timestamp
            );
        }

        // Swaps BNB to BUSD and sends BUSD to treasury
        if (amountToTeam < DUST) {
            amountToUser = amountToUser.add(amountToTeam);
        } else {
            uint[] memory amountsPredicted = globalRouter.getAmountsOut(amountToTeam, pathToBusd);
            globalRouter.swapExactTokensForTokens(
                amountToTeam,
                (amountsPredicted[amountsPredicted.length-1].mul(SLIPPAGE)).div(10000),
                pathToBusd,
                treasury,
                block.timestamp
            );
        }

        // Swaps BNB to CAKE and sends CAKES to user
        address[] memory pathToCake = pathFinder.findPath(address(wbnb), address(cake));
        uint[] memory amountsPredictedToCake = globalRouter.getAmountsOut(amountToUser, pathToBnb);
        uint[] memory amountsCake = globalRouter.swapExactTokensForTokens(
            amountToUser,
            (amountsPredictedToCake[amountsPredictedToCake.length-1].mul(SLIPPAGE)).div(10000),
            pathToCake,
            address(this),
            block.timestamp
        );

        uint amountCakeSwapped = amountsCake[amountsCake.length-1];

        cake.safeTransfer(msg.sender, amountCakeSwapped);
        emit Withdrawn(msg.sender, amountCakeSwapped, 0);
    }

    // TODO: rewards from staking are in cake not in LPs
    function handleRewards(uint _amount) private {
        if (_amount < DUST) {
            return; // No rewards
        }

        // Swaps lpToken to CAKE and BNB (remove liquidity)
        (uint amountCake, uint amountBNB) = cakeRouter.removeLiquidity(
            address(cake),
            address(wbnb),
            _amount,
            0,
            0,
            address(this),
            block.timestamp
        );

        // Swaps CAKE to BNB
        address[] memory pathToBnb = pathFinder.findPath(address(cake), address(wbnb));
        uint[] memory amountsPredicted = globalRouter.getAmountsOut(amountCake, pathToBnb);
        uint[] memory amountsBNB = globalRouter.swapExactTokensForTokens(
            amountCake,
            (amountsPredicted[amountsPredicted.length-1].mul(SLIPPAGE)).div(10000),
            pathToBnb,
            address(this),
            block.timestamp
        );

        // Total BNB swapped amount + BNB
        uint totalAmountBNB = amountsBNB[amountsBNB.length-1].add(amountBNB);

        uint deadline = block.timestamp;
        uint amountToUser = totalAmountBNB.mul(rewards.toUser).div(10000);
        uint amountToOperations = totalAmountBNB.mul(rewards.toOperations).div(10000);
        uint amountToBuyGlobal = totalAmountBNB.mul(rewards.toBuyGlobal).div(10000);
        uint amountToBuyWBNB = totalAmountBNB.mul(rewards.toBuyWBNB).div(10000);

        // Swaps BNB for BUSD and sends BUSD to treasury
        if (amountToOperations < DUST) {
            amountToUser = amountToUser.add(amountToOperations);
        } else {
            address[] memory pathToBusd = pathFinder.findPath(
                tokenAddresses.findByName(tokenAddresses.BNB()),
                tokenAddresses.findByName(tokenAddresses.BUSD())
            );
            uint[] memory amountsPredicted = globalRouter.getAmountsOut(amountToOperations, pathToBusd);
            globalRouter.swapExactTokensForTokens(
                amountToOperations,
                (amountsPredicted[amountsPredicted.length-1].mul(SLIPPAGE)).div(10000),
                pathToBusd,
                treasury,
                deadline
            );
        }

        // Sends BNB to distribution vault
        if (amountToBuyWBNB < DUST) {
            amountToUser = amountToUser.add(amountToBuyWBNB);
        } else {
            wbnb.approve(address(vaultDistribution), amountToBuyWBNB);
            vaultDistribution.deposit(amountToBuyWBNB);
        }

        // Swaps BNB for GLOBAL and sends GLOBAL to vested vault (as user)
        // Mints GLOBAL and sends GLOBAL to vested vault (as user)
        if (amountToBuyGlobal < DUST) {
            amountToUser = amountToUser.add(amountToBuyGlobal);
        } else {
            address[] memory pathToGlobal = pathFinder.findPath(address(cake), address(global));
            uint[] memory amountsPredicted = globalRouter.getAmountsOut(amountToBuyGlobal, pathToGlobal);
            uint[] memory amountsGlobal = globalRouter.swapExactTokensForTokens(
                amountToBuyGlobal,
                (amountsPredicted[amountsPredicted.length-1].mul(SLIPPAGE)).div(10000),
                pathToGlobal,
                address(this),
                deadline
            );

            uint amountGlobalBought = amountsGlobal[amountsGlobal.length-1];
            global.approve(address(vaultVested), amountGlobalBought);
            vaultVested.deposit(amountGlobalBought, msg.sender);

            uint amountToMintGlobal = amountGlobalBought.mul(rewards.toMintGlobal).div(10000);
            minter.mintNativeTokens(amountToMintGlobal, address(this));
            global.approve(address(vaultVested), amountToMintGlobal);
            vaultVested.deposit(amountToMintGlobal, msg.sender);
        }

        // Swaps BNB to CAKE and sends CAKES to user
        address[] memory pathToCake = pathFinder.findPath(address(wbnb), address(cake));
        uint[] memory amountsPredictedToCake = globalRouter.getAmountsOut(amountToUser, pathToBnb);
        uint[] memory amountsCake = globalRouter.swapExactTokensForTokens(
            amountToUser,
            (amountsPredictedToCake[amountsPredictedToCake.length-1].mul(SLIPPAGE)).div(10000),
            pathToCake,
            address(this),
            block.timestamp
        );

        uint amountCakeSwapped = amountsCake[amountsCake.length-1];
        cake.safeTransfer(msg.sender, amountCakeSwapped);
        emit ProfitPaid(msg.sender, amountCakeSwapped);
    }

    function _depositStakingToken(uint amount) private returns(uint lpTokenHarvested) {
        uint before = lpToken.balanceOf(address(this));
        cakeMasterChef.deposit(pid, amount);
        lpTokenHarvested = lpToken.balanceOf(address(this)).add(amount).sub(before);
    }

    function _withdrawStakingToken(uint amount) private returns(uint cakeHarvested) {
        uint before = cake.balanceOf(address(this));
        cakeMasterChef.withdraw(pid, amount);
        cakeHarvested = cake.balanceOf(address(this)).sub(before);
    }

    function _harvest(uint _cakeHarvested) private {
        if (_cakeHarvested > 0) {
            // Swaps half of cakes to BNB
            address[] memory pathToBNB = pathFinder.findPath(address(cake), address(wbnb));
            uint[] memory amountsPredicted = globalRouter.getAmountsOut(_cakeHarvested.div(2), pathToBNB);
            uint[] memory amountsBNB = globalRouter.swapExactTokensForTokens(
                _cakeHarvested.div(2),
                (amountsPredicted[amountsPredicted.length-1].mul(SLIPPAGE)).div(10000),
                pathToBNB,
                address(this),
                block.timestamp
            );

            uint amountBNBSwapped = amountsBNB[amountsBNB.length-1];

            // Swap BNB and CAKE to LP (add liquidity)
            cakeRouter.addLiquidity(
                address(cake),
                address(wbnb),
                _cakeHarvested.div(2),
                amountBNBSwapped,
                0,
                0,
                address(this),
                block.timestamp
            );

            cakeMasterChef.deposit(pid, lpToken.balanceOf(address(this)));
            emit Harvested(_cakeHarvested);
        }
    }

    function _deposit(uint _amount, address _to) private notPaused {
        lpToken.safeTransferFrom(msg.sender, address(this), _amount);

        uint shares = totalShares == 0 ? _amount : (_amount.mul(totalShares)).div(balance());
        totalShares = totalShares.add(shares);
        _shares[_to] = _shares[_to].add(shares);

        uint lpTokenHarvested = _depositStakingToken(_amount);
        emit Deposited(msg.sender, _amount);

        _harvest(lpTokenHarvested);
    }

    function _cleanupIfDustShares() private {
        uint shares = _shares[msg.sender];
        if (shares > 0 && shares < DUST) {
            totalShares = totalShares.sub(shares);
            delete _shares[msg.sender];
        }
    }

    function _allowance(IBEP20 _token, address _account) private {
        _token.safeApprove(_account, uint(0));
        _token.safeApprove(_account, uint(~0));
    }

    // SALVAGE PURPOSE ONLY
    // @dev _stakingToken() must not remain balance in this contract. So dev should be able to salvage staking token transferred by mistake.
    function recoverToken(address _token, uint amount) virtual external onlyOwner {
        IBEP20(_token).safeTransfer(owner(), amount);

        emit Recovered(_token, amount);
    }
}