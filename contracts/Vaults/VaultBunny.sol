// SPDX-License-Identifier: MIT
pragma solidity ^0.6.12;

import "../Libraries/SafeBEP20.sol";
import "../Libraries/Math.sol";
import "../Helpers/IMinter.sol";
import "../Helpers/IPathFinder.sol";
import "../Helpers/TokenAddresses.sol";
import "../Modifiers/PausableUpgradeable.sol";
import "../Modifiers/WhitelistUpgradeable.sol";
import "../IRouterV2.sol";
import "./Interfaces/IStrategy.sol";
import "./Externals/IBunnyPoolStrategy.sol";
import "./VaultVested.sol";

contract VaultBunny is IStrategy, PausableUpgradeable, WhitelistUpgradeable {
    using SafeBEP20 for IBEP20;
    using SafeMath for uint;
    using SafeMath for uint16;

    IBEP20 private bunny;
    IBEP20 private global;
    IBEP20 private wbnb;
    IBunnyPoolStrategy private pool;
    IMinter private minter;
    address private treasury;
    address private keeper;
    IRouterV2 private router;
    IPathFinder private pathFinder;
    TokenAddresses private tokenAddresses;

    uint16 public constant MAX_WITHDRAWAL_FEES = 100; // 1%
    uint private constant DUST = 1000;
    uint private constant SLIPPAGE = 9500;
    address private constant GLOBAL_BURN_ADDRESS = 0x000000000000000000000000000000000000dEaD;

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
        uint16 toBuyBNB;     // % to keeper as vault (in BNB)
        uint16 toMintGlobal; // % to mint global multiplier (relation to toBuyGlobal)
    }

    WithdrawalFees public withdrawalFees;
    Rewards public rewards;

    // TODO: in use?
    modifier onlyKeeper {
        require(msg.sender == keeper || msg.sender == owner(), 'VaultController: caller is not the owner or keeper');
        _;
    }

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
        address _bunny,
        address _global,
        address _wbnb,
        address _pool,
        address _treasury,
        address _tokenAddresses,
        address _router,
        address _pathFinder,
        address _keeper
    ) public {
        // BUNNY = 0xC9849E6fdB743d08fAeE3E34dd2D1bc69EA11a51
        // BUNNY_POOL = 0xCADc8CB26c8C7cB46500E61171b5F27e9bd7889D;
        // Minter = 0x8cB88701790F650F273c8BB2Cc4c5f439cd65219
        // WBNB = 0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c
        bunny = IBEP20(_bunny);
        global = IBEP20(_global);
        wbnb = IBEP20(_wbnb);
        pool = IBunnyPoolStrategy(_pool);
        treasury = _treasury;
        keeper = _keeper;

        bunny.safeApprove(_pool, uint(~0));
        // TODO approve to vested and distributor

        __PausableUpgradeable_init();
        __WhitelistUpgradeable_init();

        setDefaultWithdrawalFees();
        setDefaultRewardFees();

        tokenAddresses = TokenAddresses(_tokenAddresses);
        router = IRouterV2(_router);
        pathFinder = IPathFinder(_pathFinder);
    }

    // init minter
    function setMinter(address _minter) external onlyOwner {
        require(IMinter(_minter).isMinter(address(this)) == true, "This vault must be a minter in minter's contract");
        bunny.safeApprove(_minter, 0);
        bunny.safeApprove(_minter, uint(~0));
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
        uint16 _toBuyBNB,
        uint16 _toMintGlobal
    ) public onlyOwner {
        require(_toUser.add(_toOperations).add(_toBuyGlobal).add(_toBuyBNB) == 10000, "Rewards must add up to 100%");

        rewards.toUser = _toUser;
        rewards.toOperations = _toOperations;
        rewards.toBuyGlobal = _toBuyGlobal;
        rewards.toBuyBNB = _toBuyBNB;
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

    function balance() public view override returns (uint) {
        return pool.balanceOf(address(this));
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
        return address(bunny);
    }

    function rewardsToken() external view override returns (address) {
        return address(wbnb);
    }

    function deposit(uint _amount) public override onlyNonContract {
        _deposit(_amount, msg.sender);

        _principal[msg.sender] = _principal[msg.sender].add(_amount);
        _depositedAt[msg.sender] = block.timestamp;
    }

    function depositAll() external override onlyNonContract {
        deposit(bunny.balanceOf(msg.sender));
    }

    function withdrawAll() external override onlyNonContract {
        uint amount = balanceOf(msg.sender);
        uint principal = principalOf(msg.sender);
        uint profit = amount > principal ? amount.sub(principal) : 0;

        pool.withdraw(amount);

        handleWithdrawalFees(principal);
        handleRewards(profit);

        totalShares = totalShares.sub(_shares[msg.sender]);
        delete _shares[msg.sender];
        delete _principal[msg.sender];
        delete _depositedAt[msg.sender];
    }

    // TODO: modifier onlyKeeper in vault bunny
    function harvest() external override onlyNonContract {
        pool.getReward();

        // TODO: ensure reward of pool is in WBNB and not BUNNY
        uint deadline = block.timestamp;

        address[] memory pathToBunny = new address[](2);
        pathToBunny[0]=tokenAddresses.findByName(tokenAddresses.BUNNY());
        pathToBunny[1]=tokenAddresses.findByName(tokenAddresses.WBNB());

        uint[] memory amountsPredicted = router.getAmountsOut(wbnb.balanceOf(address(this)), pathToBunny);
        uint[] memory amounts = router.swapExactTokensForTokens(wbnb.balanceOf(address(this)),
            (amountsPredicted[amountsPredicted.length-1].mul(SLIPPAGE)).div(10000), pathToBunny, address(this), deadline);

        uint harvested = amounts[amounts.length-1];
        emit Harvested(harvested);

        pool.deposit(harvested);
    }

    function withdraw(uint shares) external override onlyWhitelisted onlyNonContract {
        uint amount = balance().mul(shares).div(totalShares);

        totalShares = totalShares.sub(shares);
        _shares[msg.sender] = _shares[msg.sender].sub(shares);
        _principal[msg.sender] = _principal[msg.sender].sub(amount);

        pool.withdraw(amount);

        handleWithdrawalFees(amount);
    }

    function withdrawUnderlying(uint _amount) external override onlyNonContract {
        uint amount = Math.min(_amount, _principal[msg.sender]);
        uint shares = Math.min(amount.mul(totalShares).div(balance()), _shares[msg.sender]);

        totalShares = totalShares.sub(shares);
        _shares[msg.sender] = _shares[msg.sender].sub(shares);
        _principal[msg.sender] = _principal[msg.sender].sub(amount);

        pool.withdraw(amount);

        handleWithdrawalFees(amount);
    }

    // TODO: nonReentrant modifier
    function getReward() external override onlyNonContract {
        uint amount = earned(msg.sender);
        uint shares = Math.min(amount.mul(totalShares).div(balance()), _shares[msg.sender]);

        totalShares = totalShares.sub(shares);
        _shares[msg.sender] = _shares[msg.sender].sub(shares);
        _cleanupIfDustShares();

        pool.withdraw(amount);

        handleRewards(amount);
    }

    function handleWithdrawalFees(uint _amount) private {
        if (_depositedAt[msg.sender].add(withdrawalFees.interval) < block.timestamp) {
            // No withdrawal fees
            bunny.safeTransfer(msg.sender, _amount);
            emit Withdrawn(msg.sender, _amount, 0);
            return;
        }

        uint deadline = block.timestamp.add(2 hours);
        uint amountToBurn = _amount.mul(withdrawalFees.burn).div(10000);
        uint amountToTeam = _amount.mul(withdrawalFees.team).div(10000);
        uint amountToUser = _amount.sub(amountToTeam).sub(amountToBurn);

        address[] memory pathToGlobal = pathFinder.findPath(
            tokenAddresses.findByName(tokenAddresses.BUNNY()),
            tokenAddresses.findByName(tokenAddresses.GLOBAL())
        );

        address[] memory pathToBusd = pathFinder.findPath(
            tokenAddresses.findByName(tokenAddresses.BUNNY()),
            tokenAddresses.findByName(tokenAddresses.BUSD())
        );

        if (amountToBurn < DUST) {
            amountToUser = amountToUser.add(amountToBurn);
        } else {
            uint[] memory amountsPredicted = router.getAmountsOut(amountToBurn, pathToGlobal);
            router.swapExactTokensForTokens(amountToBurn, (amountsPredicted[amountsPredicted.length-1].mul(SLIPPAGE)).div(10000),
                pathToGlobal, GLOBAL_BURN_ADDRESS, deadline);
        }

        if (amountToTeam < DUST) {
            amountToUser = amountToUser.add(amountToTeam);
        } else {

            uint[] memory amountsPredicted = router.getAmountsOut(amountToTeam, pathToBusd);
            router.swapExactTokensForTokens(amountToTeam, (amountsPredicted[amountsPredicted.length-1].mul(SLIPPAGE)).div(10000),
                pathToBusd, treasury, deadline);
        }

        bunny.safeTransfer(msg.sender, amountToUser);
        emit Withdrawn(msg.sender, amountToUser, 0);
    }

    function handleRewards(uint _amount) private {
        if (_amount < DUST) {
            return; // No rewards
        }

        uint deadline = block.timestamp.add(2 hours);
        uint amountToUser = _amount.mul(rewards.toUser).div(10000);
        uint amountToOperations = _amount.mul(rewards.toOperations).div(10000);
        uint amountToBuyGlobal = _amount.mul(rewards.toBuyGlobal).div(10000);
        uint amountToBuyBNB = _amount.mul(rewards.toBuyBNB).div(10000);

        address[] memory pathToGlobal = pathFinder.findPath(
            tokenAddresses.findByName(tokenAddresses.BUNNY()),
            tokenAddresses.findByName(tokenAddresses.GLOBAL())
        );

        address[] memory pathToBusd = pathFinder.findPath(
            tokenAddresses.findByName(tokenAddresses.BUNNY()),
            tokenAddresses.findByName(tokenAddresses.BUSD())
        );

        address[] memory pathToBnb = pathFinder.findPath(
            tokenAddresses.findByName(tokenAddresses.BUNNY()),
            tokenAddresses.findByName(tokenAddresses.BNB())
        );

        if (amountToOperations < DUST) {
            amountToUser = amountToUser.add(amountToOperations);
        } else {
            uint[] memory amountsPredicted = router.getAmountsOut(amountToOperations, pathToBusd);
            router.swapExactTokensForTokens(amountToOperations, (amountsPredicted[amountsPredicted.length-1].mul(SLIPPAGE)).div(10000),
                pathToBusd, treasury, deadline);
        }

        if (amountToBuyBNB < DUST) {
            amountToUser = amountToUser.add(amountToBuyBNB);
        } else {
            uint[] memory amountsPredicted = router.getAmountsOut(amountToBuyBNB, pathToBnb);
            router.swapExactTokensForTokens(amountToBuyBNB, (amountsPredicted[amountsPredicted.length-1].mul(SLIPPAGE)).div(10000),
                pathToBnb, keeper, deadline);
        }

        if (amountToBuyGlobal < DUST) {
            amountToUser = amountToUser.add(amountToBuyGlobal);
        } else {
            uint[] memory amountsPredicted = router.getAmountsOut(amountToBuyGlobal, pathToGlobal);
            uint[] memory amounts = router.swapExactTokensForTokens(amountToBuyGlobal, (amountsPredicted[amountsPredicted.length-1].mul(SLIPPAGE)).div(10000),
                pathToGlobal, address(this), deadline);
            uint amountGlobalBought = amounts[amounts.length-1];

            global.safeTransfer(keeper, amountGlobalBought); // To keeper as bunny vault

            uint amountToMintGlobal = amountGlobalBought.mul(rewards.toMintGlobal).div(10000);
            minter.mintNativeTokens(amountToMintGlobal, address(this));
            VaultVested(keeper).deposit(amountToMintGlobal, msg.sender);
        }

        bunny.safeTransfer(msg.sender, amountToUser);
        emit ProfitPaid(msg.sender, amountToUser);
    }

    function _deposit(uint _amount, address _to) private notPaused {
        bunny.safeTransferFrom(msg.sender, address(this), _amount);

        uint shares = totalShares == 0 ? _amount : (_amount.mul(totalShares)).div(balance());
        totalShares = totalShares.add(shares);
        _shares[_to] = _shares[_to].add(shares);

        pool.deposit(_amount);
        emit Deposited(_to, _amount);
    }

    function _cleanupIfDustShares() private {
        uint shares = _shares[msg.sender];
        if (shares > 0 && shares < DUST) {
            totalShares = totalShares.sub(shares);
            delete _shares[msg.sender];
        }
    }

    // SALVAGE PURPOSE ONLY
    // @dev _stakingToken(token) must not remain balance in this contract. So dev should be able to salvage staking token transferred by mistake.
    function recoverToken(address _token, uint amount) virtual external onlyOwner {
        IBEP20(_token).safeTransfer(owner(), amount);

        emit Recovered(_token, amount);
    }
}