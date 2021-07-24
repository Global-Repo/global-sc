// SPDX-License-Identifier: MIT
pragma solidity ^0.6.12;

import "hardhat/console.sol";

import "./SafeBEP20.sol";
import "./Math.sol";
import "./IStrategy.sol";
import "./ICakeMasterChef.sol";
import "./IBunnyMinter.sol";
import "./PausableUpgradeable.sol";
import "./WhitelistUpgradeable.sol";
import "./IMinter.sol";

contract VaultCake is IStrategy, PausableUpgradeable, WhitelistUpgradeable {
    using SafeBEP20 for IBEP20;
    using SafeMath for uint;
    using SafeMath for uint16;

    IBEP20 private CAKE;
    IBEP20 private GLOBAL;
    ICakeMasterChef private CAKE_MASTER_CHEF;
    IMinter private minter;
    address private keeper;

    uint public constant override pid = 0;
    uint private constant DUST = 1000;
    uint16 public constant MAX_WITHDRAWAL_FEES = 100; // 1%

    uint public totalShares;
    mapping (address => uint) private _shares;
    mapping (address => uint) private _principal;
    mapping (address => uint) private _depositedAt;

    // Durant 4 dies cobrarem els burn i team (dels "que depositem principal" que s'estan stakejant), a partir de 4 dies no cobrem res
    struct WithdrawalFees {
        uint16 burn; // 0.6% swap del asset per global + burn del global
        uint16 team; // 0.1% swap a busd i transfer a devaddress
        uint256 interval;
    }

    WithdrawalFees public withdrawalFees;

    struct RewardsFees {
        uint16 toUser;        // 75% to user tal qual
        uint16 toOperations; // 4% swap to busd i transfer a treasurery
        uint16 toBuyGlobal;   // 6% swap to busd i transfer a treasurery
        uint16 toBuyBNB;      // 15% swap a BNB i transfer to locked/vested/staked vault (el que falta)
        uint16 extraNativeTokenMinted;    	// 100 cakes de rewards menys operations i menys bnb ha de superar aquests dos 15%+4% = 19% (ha de ser el mínim)
    }

    RewardsFees public rewardsFees;

    event Recovered(address token, uint amount);

    constructor(
        address _cake,
        address _global,
        address _cakeMasterChef,
        address _keeper
    ) public {
        CAKE = IBEP20(_cake);
        GLOBAL = IBEP20(_global);
        CAKE_MASTER_CHEF = ICakeMasterChef(_cakeMasterChef);
        keeper = _keeper;

        CAKE.safeApprove(_cakeMasterChef, uint(~0));

        __PausableUpgradeable_init();
        __WhitelistUpgradeable_init();

        setDefaultWithdrawalFees();
        setDefaultRewardFees();
    }

    // init minter
    function setMinter(address _minter) external {
        require(IMinter(_minter).isMinter(address(this)) == true, "Vault needs to be a minter's mintator");
        CAKE.safeApprove(_minter, 0);
        CAKE.safeApprove(_minter, uint(~0));
        minter = IMinter(_minter);
    }

    function setWithdrawalFees(uint16 burn, uint16 team, uint256 interval) public onlyOwner {
        require(burn.add(team) <= MAX_WITHDRAWAL_FEES, "Withdrawal fees too high");

        withdrawalFees.burn = burn;
        withdrawalFees.team = team;
        withdrawalFees.interval = interval;
    }

    function setRewardsFees(uint16 toUser, uint16 toOperations, uint16 toBuyGlobal, uint16 toBuyBNB) public onlyOwner {
        require(toUser.add(toOperations).add(toBuyGlobal).add(toBuyBNB) == 10000, "Rewards fees must add up to 100%");

        rewardsFees.toUser = toUser;
        rewardsFees.toOperations = toOperations;
        rewardsFees.toBuyGlobal = toBuyGlobal;
        rewardsFees.toBuyBNB = toBuyBNB;
    }

    function setDefaultWithdrawalFees() private {
        setWithdrawalFees(60, 10, 4 days);
    }

    function setDefaultRewardFees() private {
        setRewardsFees(7500, 400, 600, 1500);
    }

    function canMint() internal view returns (bool) {
        return address(minter) != address(0) && minter.isMinter(address(this));
    }

    // TODO: remove it, used for test only
    function isVaultMintable() external view returns (bool) {
        return address(minter) != address(0) && minter.isMinter(address(this));
    }

    function totalSupply() external view override returns (uint) {
        return totalShares;
    }

    function balance() public view override returns (uint amount) {
        (amount,) = CAKE_MASTER_CHEF.userInfo(pid, address(this));
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

    function rewardsToken() external view override returns (address) {
        return address(CAKE);
    }

    function deposit(uint _amount) public override {
        _deposit(_amount, msg.sender);

        if (isWhitelist(msg.sender) == false) {
            _principal[msg.sender] = _principal[msg.sender].add(_amount);
            _depositedAt[msg.sender] = block.timestamp;
        }
    }

    function depositAll() external override {
        deposit(CAKE.balanceOf(msg.sender));
    }

    function withdrawAll() external override {
        uint amount = balanceOf(msg.sender);
        uint principal = principalOf(msg.sender);
        uint depositTimestamp = _depositedAt[msg.sender];

        totalShares = totalShares.sub(_shares[msg.sender]);
        delete _shares[msg.sender];
        delete _principal[msg.sender];
        delete _depositedAt[msg.sender];

        uint cakeHarvested = _withdrawStakingToken(amount);

        uint profit = amount > principal ? amount.sub(principal) : 0;
        //uint withdrawalFee = canMint() ? _minter.withdrawalFee(principal, depositTimestamp) : 0;
        uint withdrawalFee = 0;
        //uint performanceFee = canMint() ? _minter.performanceFee(profit) : 0;
        uint performanceFee = 0;

        if (withdrawalFee.add(performanceFee) > DUST) {
            //_minter.mintFor(address(CAKE), withdrawalFee, performanceFee, msg.sender, depositTimestamp);
            minter.mintNativeTokens(0);
            if (performanceFee > 0) {
                emit ProfitPaid(msg.sender, profit, performanceFee);
            }
            amount = amount.sub(withdrawalFee).sub(performanceFee);
        }

        CAKE.safeTransfer(msg.sender, amount);
        emit Withdrawn(msg.sender, amount, withdrawalFee);

        _harvest(cakeHarvested);
    }

    function harvest() external override {
        uint cakeHarvested = _withdrawStakingToken(0);
        _harvest(cakeHarvested);
    }

    function withdraw(uint shares) external override onlyWhitelisted {
        uint amount = balance().mul(shares).div(totalShares);
        totalShares = totalShares.sub(shares);
        _shares[msg.sender] = _shares[msg.sender].sub(shares);
        uint cakeHarvested = _withdrawStakingToken(amount);
        CAKE.safeTransfer(msg.sender, amount);
        emit Withdrawn(msg.sender, amount, 0);

        _harvest(cakeHarvested);
    }

    // @dev underlying only + withdrawal fee + no perf fee
    function withdrawUnderlying(uint _amount) external {
        uint amount = Math.min(_amount, _principal[msg.sender]);
        uint shares = Math.min(amount.mul(totalShares).div(balance()), _shares[msg.sender]);
        totalShares = totalShares.sub(shares);
        _shares[msg.sender] = _shares[msg.sender].sub(shares);
        _principal[msg.sender] = _principal[msg.sender].sub(amount);

        uint cakeHarvested = _withdrawStakingToken(amount);
        uint depositTimestamp = _depositedAt[msg.sender];
        //uint withdrawalFee = canMint() ? _minter.withdrawalFee(amount, depositTimestamp) : 0;
        uint withdrawalFee = 0;
        if (withdrawalFee > DUST) {
            //_minter.mintFor(address(CAKE), withdrawalFee, 0, msg.sender, depositTimestamp);
            minter.mintNativeTokens(0);
            amount = amount.sub(withdrawalFee);
        }

        CAKE.safeTransfer(msg.sender, amount);
        emit Withdrawn(msg.sender, amount, withdrawalFee);

        _harvest(cakeHarvested);
    }

    function getReward() external override {
        uint amount = earned(msg.sender);
        uint shares = Math.min(amount.mul(totalShares).div(balance()), _shares[msg.sender]);
        totalShares = totalShares.sub(shares);
        _shares[msg.sender] = _shares[msg.sender].sub(shares);
        _cleanupIfDustShares();

        uint cakeHarvested = _withdrawStakingToken(amount);
        uint depositTimestamp = _depositedAt[msg.sender];
        //uint performanceFee = canMint() ? _minter.performanceFee(amount) : 0;
        uint performanceFee = 0;
        if (performanceFee > DUST) {
            //_minter.mintFor(address(CAKE), 0, performanceFee, msg.sender, depositTimestamp);
            minter.mintNativeTokens(0);
            amount = amount.sub(performanceFee);
        }

        CAKE.safeTransfer(msg.sender, amount);
        emit ProfitPaid(msg.sender, amount, performanceFee);

        _harvest(cakeHarvested);
    }

    /* ========== PRIVATE FUNCTIONS ========== */

    function _depositStakingToken(uint amount) private returns(uint cakeHarvested) {
        uint before = CAKE.balanceOf(address(this));
        CAKE_MASTER_CHEF.enterStaking(amount);
        cakeHarvested = CAKE.balanceOf(address(this)).add(amount).sub(before);
    }

    function _withdrawStakingToken(uint amount) private returns(uint cakeHarvested) {
        uint before = CAKE.balanceOf(address(this));
        CAKE_MASTER_CHEF.leaveStaking(amount);
        cakeHarvested = CAKE.balanceOf(address(this)).sub(amount).sub(before);
    }

    function _harvest(uint cakeAmount) private {
        if (cakeAmount > 0) {
            emit Harvested(cakeAmount);
            CAKE_MASTER_CHEF.enterStaking(cakeAmount);
        }
    }

    function _deposit(uint _amount, address _to) private notPaused {
        uint _pool = balance();

        CAKE.safeTransferFrom(msg.sender, address(this), _amount);

        uint shares = totalShares == 0 ? _amount : (_amount.mul(totalShares)).div(_pool);
        totalShares = totalShares.add(shares);
        _shares[_to] = _shares[_to].add(shares);

        uint cakeHarvested = _depositStakingToken(_amount);
        emit Deposited(msg.sender, _amount);

        _harvest(cakeHarvested);
    }

    function _cleanupIfDustShares() private {
        uint shares = _shares[msg.sender];
        if (shares > 0 && shares < DUST) {
            totalShares = totalShares.sub(shares);
            delete _shares[msg.sender];
        }
    }

    /* ========== SALVAGE PURPOSE ONLY ========== */

    // @dev _stakingToken(CAKE) must not remain balance in this contract. So dev should be able to salvage staking token transferred by mistake.
    function recoverToken(address _token, uint amount) virtual external onlyOwner {
        IBEP20(_token).safeTransfer(owner(), amount);

        emit Recovered(_token, amount);
    }
}