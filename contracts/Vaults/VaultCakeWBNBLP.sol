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

contract VaultCakeWBNBLP is IStrategy, PausableUpgradeable, WhitelistUpgradeable {
    using SafeBEP20 for IBEP20;
    using SafeMath for uint;
    using SafeMath for uint16;

    IBEP20 private lpToken;
    IBEP20 private global;
    ICakeMasterChef private cakeMasterChef;
    IRouterV2 private cakeRouter;
    IMinter private minter;
    address private treasury;
    address private keeper;
    IRouterV2 private globalRouter;
    IPathFinder private pathFinder;
    TokenAddresses private tokenAddresses;

    uint16 public constant MAX_WITHDRAWAL_FEES = 100; // 1%
    uint private constant DUST = 1000;
    address private constant GLOBAL_BURN_ADDRESS = 0x000000000000000000000000000000000000dEaD;

    uint256 public pid;
    uint public totalShares;
    mapping (address => uint) private _shares;
    mapping (address => uint) private _principal;
    mapping (address => uint) private _depositedAt;

    struct WithdrawalFees {
        uint16 burn;      // % to burn (in Global)
        uint16 team;      // % to devs (in BUSD)
        uint256 interval; // Meanwhile, fees will be apply (timestamp)
    }

    struct Rewards {
        uint16 toUser;       // % to user
        uint16 toOperations; // % to treasury (in BUSD)
        uint16 toBuyGlobal;  // % to keeper as user (in Global)
        uint16 toBuyWBNB;     // % to keeper as vault (in WBNB)
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
        address _cakeMasterChef,
        address _cakeRouter,
        address _treasury,
        address _tokenAddresses,
        address _router,
        address _pathFinder,
        address _keeper
    ) public {
        pid = _pid;
        lpToken = IBEP20(_lpToken);
        global = IBEP20(_global);
        cakeMasterChef = ICakeMasterChef(_cakeMasterChef);
        cakeRouter = IRouterV2(_cakeRouter);
        treasury = _treasury;
        keeper = _keeper;

        lpToken.safeApprove(_cakeMasterChef, uint(~0));

        __PausableUpgradeable_init();
        __WhitelistUpgradeable_init();

        setDefaultWithdrawalFees();
        setDefaultRewardFees();

        tokenAddresses = TokenAddresses(_tokenAddresses);
        globalRouter = IRouterV2(_router);
        pathFinder = IPathFinder(_pathFinder);

        IPair pair = IPair(tokenAddresses.findByName(tokenAddresses.CAKE_WBNB_LP()));
        IBEP20(address(pair)).safeApprove(address(cakeRouter), uint(- 1));

        address CAKE = tokenAddresses.findByName(tokenAddresses.CAKE());
        IBEP20(CAKE).safeApprove(address(globalRouter), uint(- 1));

        address WBNB = tokenAddresses.findByName(tokenAddresses.WBNB());
        IBEP20(WBNB).safeApprove(address(globalRouter), uint(- 1));
    }

    // init minter
    function setMinter(address _minter) external {
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
        return address(global);
    }

    function rewardsToken() external view override returns (address) {
        return address(lpToken);
    }

    function deposit(uint _amount) public override onlyNonContract {
        _deposit(_amount, msg.sender);

        if (isWhitelist(msg.sender) == false) {
            _principal[msg.sender] = _principal[msg.sender].add(_amount);
            _depositedAt[msg.sender] = block.timestamp;
        }
    }

    function depositAll() external override onlyNonContract {
        deposit(lpToken.balanceOf(msg.sender));
    }

    function withdrawAll() external override onlyNonContract {
        uint amount = balanceOf(msg.sender);
        uint principal = principalOf(msg.sender);
        uint profit = amount > principal ? amount.sub(principal) : 0;

        uint lpTokenHarvested = _withdrawStakingToken(amount);

        handleWithdrawalFees(principal);
        handleRewards(profit);

        totalShares = totalShares.sub(_shares[msg.sender]);
        delete _shares[msg.sender];
        delete _principal[msg.sender];
        delete _depositedAt[msg.sender];

        _harvest(lpTokenHarvested);
    }

    function harvest() external override onlyNonContract {
        uint lpTokenHarvested = _withdrawStakingToken(0);
        _harvest(lpTokenHarvested);
    }

    function withdraw(uint shares) external override onlyWhitelisted onlyNonContract {
        uint amount = balance().mul(shares).div(totalShares);

        uint lpTokenHarvested = _withdrawStakingToken(amount);

        handleWithdrawalFees(amount);

        totalShares = totalShares.sub(shares);
        _shares[msg.sender] = _shares[msg.sender].sub(shares);

        _harvest(lpTokenHarvested);
    }

    function withdrawUnderlying(uint _amount) external override onlyNonContract {
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

    function handleWithdrawalFees(uint _amount) private {
        if (_depositedAt[msg.sender].add(withdrawalFees.interval) < block.timestamp) {
            // No withdrawal fees
            lpToken.safeTransfer(msg.sender, _amount);
            emit Withdrawn(msg.sender, _amount, 0);
            return;
        }

        uint deadline = block.timestamp;
        uint amountToBurn = _amount.mul(withdrawalFees.burn).div(10000);
        uint amountToTeam = _amount.mul(withdrawalFees.team).div(10000);
        uint amountToUser = _amount.sub(amountToTeam).sub(amountToBurn);

        address[] memory pathToGlobal = pathFinder.findPath(
            tokenAddresses.findByName(tokenAddresses.CAKE_WBNB_LP()),
            tokenAddresses.findByName(tokenAddresses.GLOBAL())
        );

        address[] memory pathToBusd = pathFinder.findPath(
            tokenAddresses.findByName(tokenAddresses.CAKE_WBNB_LP()),
            tokenAddresses.findByName(tokenAddresses.BUSD())
        );

        if (amountToBurn < DUST) {
            amountToUser = amountToUser.add(amountToBurn);
        } else {
            globalRouter.swapExactTokensForTokens(amountToBurn, 0, pathToGlobal, GLOBAL_BURN_ADDRESS, deadline);
        }

        if (amountToTeam < DUST) {
            amountToUser = amountToUser.add(amountToTeam);
        } else {
            globalRouter.swapExactTokensForTokens(amountToTeam, 0, pathToBusd, treasury, deadline);
        }

        lpToken.safeTransfer(msg.sender, amountToUser);
        emit Withdrawn(msg.sender, amountToUser, 0);
    }

    function handleRewards(uint _amount) private {
        if (_amount < DUST) {
            return; // No rewards
        }

        address WBNB = tokenAddresses.findByName(tokenAddresses.WBNB());
        address CAKE = tokenAddresses.findByName(tokenAddresses.CAKE());

        uint amountCake;
        uint amountWBNB;
        uint amountFinal;

        (amountWBNB, amountCake) = cakeRouter.removeLiquidity(WBNB, CAKE, _amount, 0, 0, address(this), block.timestamp);
        uint256[] memory wbnbsSwaped = globalRouter.swapExactTokensForTokens(amountWBNB, 0, pathFinder.findPath(WBNB,CAKE), address(this), block.timestamp);
        amountFinal = amountCake.add(wbnbsSwaped[wbnbsSwaped.length-1]);

        uint deadline = block.timestamp;
        uint amountToUser = amountFinal.mul(rewards.toUser).div(10000);
        uint amountToOperations = amountFinal.mul(rewards.toOperations).div(10000);
        uint amountToBuyGlobal = amountFinal.mul(rewards.toBuyGlobal).div(10000);
        uint amountToBuyWBNB = amountFinal.mul(rewards.toBuyWBNB).div(10000);


        address[] memory pathToGlobal = pathFinder.findPath(
            tokenAddresses.findByName(tokenAddresses.CAKE()),
            tokenAddresses.findByName(tokenAddresses.GLOBAL())
        );

        address[] memory pathToBusd = pathFinder.findPath(
            tokenAddresses.findByName(tokenAddresses.CAKE()),
            tokenAddresses.findByName(tokenAddresses.BUSD())
        );

        address[] memory pathToWbnb = pathFinder.findPath(
            tokenAddresses.findByName(tokenAddresses.CAKE()),
            tokenAddresses.findByName(tokenAddresses.WBNB())
        );

        if (amountToOperations < DUST) {
            amountToUser = amountToUser.add(amountToOperations);
        } else {
            globalRouter.swapExactTokensForTokens(amountToOperations, 0, pathToBusd, treasury, deadline);
        }

        if (amountToBuyWBNB < DUST) {
            amountToUser = amountToUser.add(amountToBuyWBNB);
        } else {
            globalRouter.swapExactTokensForTokens(amountToBuyWBNB, 0, pathToWbnb, keeper, deadline);
        }

        if (amountToBuyGlobal < DUST) {
            amountToUser = amountToUser.add(amountToBuyGlobal);
        } else {
            uint[] memory amounts = globalRouter.swapExactTokensForTokens(amountToBuyGlobal, 0, pathToGlobal, address(this), deadline);
            uint amountGlobalBought = amounts[amounts.length-1];

            global.safeTransfer(keeper, amountGlobalBought); // To keeper as cake vault

            uint amountToMintGlobal = amountGlobalBought.mul(rewards.toMintGlobal).div(10000);
            minter.mintNativeTokens(amountToMintGlobal, msg.sender);
            global.safeTransfer(keeper, amountToMintGlobal); // TODO to keeper as user and not as cake vault
        }

        lpToken.safeTransfer(msg.sender, amountToUser);
        emit ProfitPaid(msg.sender, amountToUser);
    }

    function _depositStakingToken(uint amount) private returns(uint lpTokenHarvested) {
        uint before = lpToken.balanceOf(address(this));
        cakeMasterChef.deposit(pid, amount);
        lpTokenHarvested = lpToken.balanceOf(address(this)).add(amount).sub(before);
    }

    function _withdrawStakingToken(uint amount) private returns(uint lpTokenHarvested) {
        uint before = lpToken.balanceOf(address(this));
        cakeMasterChef.withdraw(pid, amount);
        lpTokenHarvested = lpToken.balanceOf(address(this)).sub(amount).sub(before);
    }

    function _harvest(uint lpTokenAmount) private {
        if (lpTokenAmount > 0) {
            emit Harvested(lpTokenAmount);
            cakeMasterChef.enterStaking(lpTokenAmount);
        }
    }

    // TODO: nonReentrant ?
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

    // SALVAGE PURPOSE ONLY
    // @dev _stakingToken() must not remain balance in this contract. So dev should be able to salvage staking token transferred by mistake.
    function recoverToken(address _token, uint amount) virtual external onlyOwner {
        IBEP20(_token).safeTransfer(owner(), amount);

        emit Recovered(_token, amount);
    }
}