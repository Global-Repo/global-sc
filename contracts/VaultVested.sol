// SPDX-License-Identifier: MIT
pragma solidity ^0.6.12;

import "./SafeBEP20.sol";
import "./Math.sol";
import "./IStrategy.sol";
import "./IGlobalMasterChef.sol";
import "./PausableUpgradeable.sol";
import "./WhitelistUpgradeable.sol";
import "./IMinter.sol";
import "./IRouterV2.sol";
import "./TokenAddresses.sol";
import './IPathFinder.sol';

contract VaultVested is IStrategy, PausableUpgradeable, WhitelistUpgradeable {
    using SafeBEP20 for IBEP20;
    using SafeMath for uint;
    using SafeMath for uint16;

    IBEP20 private global;
    IBEP20 private bnb;
    IGlobalMasterChef private globalMasterChef;
    IMinter private minter;
    address private treasury;
    address private vaultLocked;
    IRouterV2 private router;
    IPathFinder private pathFinder;
    TokenAddresses private tokenAddresses;

    uint private constant DUST = 1000;
    address private constant GLOBAL_BURN_ADDRESS = 0x000000000000000000000000000000000000dEaD;

    uint256 public pid;
    uint public totalShares;
    mapping (address => uint) private _shares;
    mapping (address => uint) private _principal;
    mapping (address => uint) private _depositedAt;
    mapping (address => uint) private _bnbEarned;

    struct PenaltyFees {
        uint16 fee;       // % to locked vault (in Global)
        uint256 interval; // Meanwhile, penalty fees will be apply (timestamp)
    }

    struct DistributeBNB {
        uint16 percentage; // % to distribute BNB among users
        uint256 minAmount; // amount to start distributing BNB among users
    }

    PenaltyFees public penaltyFees;
    DistributeBNB public distributeBNB;

    event Distributed(uint distributedAmount, uint numberOfUsers);
/*
    modifier distributeRewards() {
        uint currentBNBAmount = bnb.balanceOf(address(this));

        if (currentBNBAmount >= distributeBNB.minAmount) {
            uint bnbToDistribute = currentBNBAmount.div(distributeBNB.percentage).div(10000);

            for (uint i; i < _shares.length - 1; i++) {
                uint userSharesPercent = _shares[i].div(totalShares);
                uint bnbToUser = bnbToDistribute.mul(userSharesPercent);

                _bnbEarned[i] = _bnbEarned[i].add(bnbToUser);
            }

            emit Distributed(bnbToDistribute, _shares.length);
        }
        _;
    }
*/
    constructor(
        address _global,
        address _bnb,
        address _globalMasterChef,
        address _treasury,
        address _vaultLocked,
        address _tokenAddresses,
        address _router,
        address _pathFinder
    ) public {
        pid = 0;
        global = IBEP20(_global);
        bnb = IBEP20(_bnb);
        globalMasterChef = IGlobalMasterChef(_globalMasterChef);
        treasury = _treasury;
        vaultLocked = _vaultLocked;

        global.safeApprove(_globalMasterChef, uint(~0));

        __PausableUpgradeable_init();
        __WhitelistUpgradeable_init();

        tokenAddresses = TokenAddresses(_tokenAddresses);
        router = IRouterV2(_router);
        pathFinder = IPathFinder(_pathFinder);

        // TODO: to setters
        distributeBNB.percentage = 2000; // 20%
        distributeBNB.minAmount  = 1e18; // 1 BNB
    }

    // init minter
    function setMinter(address _minter) external {
        require(IMinter(_minter).isMinter(address(this)) == true, "This vault must be a minter in minter's contract");
        global.safeApprove(_minter, 0);
        global.safeApprove(_minter, uint(~0));
        minter = IMinter(_minter);
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
        (amount,) = globalMasterChef.userInfo(pid, address(this));
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
        return address(global);
    }

    // TODO: from variable perque sigui del user i no del vault X que els envia
    function deposit(uint _amount) public override {
        _deposit(_amount, msg.sender);

        if (isWhitelist(msg.sender) == false) {
            _principal[msg.sender] = _principal[msg.sender].add(_amount);
            _depositedAt[msg.sender] = block.timestamp;
        }
    }

    function depositAll() external override {
        deposit(global.balanceOf(msg.sender));
    }

    function withdrawAll() external override {
        uint amount = balanceOf(msg.sender);
        uint principal = principalOf(msg.sender);
        uint profit = amount > principal ? amount.sub(principal) : 0;

        uint globalHarvested = _withdrawStakingToken(amount);

        handlePenaltyFees(amount);
        //handleRewards();

        totalShares = totalShares.sub(_shares[msg.sender]);
        delete _shares[msg.sender];
        delete _principal[msg.sender];
        delete _depositedAt[msg.sender];
        delete _bnbEarned[msg.sender];

        _harvest(globalHarvested);
    }

    function harvest() external override {
        uint globalHarvested = _withdrawStakingToken(0);
        _harvest(globalHarvested);
    }

    function withdraw(uint shares) external override onlyWhitelisted {
        uint amount = balance().mul(shares).div(totalShares);

        uint globalHarvested = _withdrawStakingToken(amount);

        totalShares = totalShares.sub(shares);
        _shares[msg.sender] = _shares[msg.sender].sub(shares);

        _harvest(globalHarvested);
    }

    function withdrawUnderlying(uint _amount) external override {
        uint amount = Math.min(_amount, _principal[msg.sender]);
        uint shares = Math.min(amount.mul(totalShares).div(balance()), _shares[msg.sender]);

        uint globalHarvested = _withdrawStakingToken(amount);

        totalShares = totalShares.sub(shares);
        _shares[msg.sender] = _shares[msg.sender].sub(shares);
        _principal[msg.sender] = _principal[msg.sender].sub(amount);

        _harvest(globalHarvested);
    }

    function handlePenaltyFees(uint _amount) private {
        if (_depositedAt[msg.sender].add(penaltyFees.interval) < block.timestamp) {
            // No penalty fees
            global.safeTransfer(msg.sender, _amount);
            emit Withdrawn(msg.sender, _amount, 0);
            return;
        }

        uint amountToVaultLocked = _amount.mul(penaltyFees.fee).div(10000);
        uint amountToUser = _amount.sub(amountToVaultLocked);

        if (amountToVaultLocked < DUST) {
            amountToUser = amountToUser.add(amountToVaultLocked);
        } else {
            bnb.safeTransfer(vaultLocked, amountToVaultLocked);
        }

        global.safeTransfer(msg.sender, amountToUser);
        emit Withdrawn(msg.sender, amountToUser, 0);
    }

    function handleRewards(uint _amount) private {
        if (_amount < DUST) {
            return; // No rewards
        }

        // TODO que es fan amb els rewards del pool de GLOBAL?
        bnb.safeTransfer(msg.sender, _bnbEarned[msg.sender]);
        emit ProfitPaid(msg.sender, _bnbEarned[msg.sender]);
    }

    function getReward() external override {
        uint amount = earned(msg.sender);
        uint shares = Math.min(amount.mul(totalShares).div(balance()), _shares[msg.sender]);

        uint globalHarvested = _withdrawStakingToken(amount);

        totalShares = totalShares.sub(shares);
        _shares[msg.sender] = _shares[msg.sender].sub(shares);
        _cleanupIfDustShares();

        _harvest(globalHarvested);
    }

    function _depositStakingToken(uint amount) private returns(uint globalHarvested) {
        uint before = global.balanceOf(address(this));
        globalMasterChef.enterStaking(amount);
        globalHarvested = global.balanceOf(address(this)).add(amount).sub(before);
    }

    function _withdrawStakingToken(uint amount) private returns(uint globalHarvested) {
        uint before = global.balanceOf(address(this));
        globalMasterChef.leaveStaking(amount);
        globalHarvested = global.balanceOf(address(this)).sub(amount).sub(before);
    }

    function _harvest(uint globalAmount) private {
        if (globalAmount > 0) {
            emit Harvested(globalAmount);
            globalMasterChef.enterStaking(globalAmount);
        }
    }

    function _deposit(uint _amount, address _to) private notPaused {
        global.safeTransferFrom(msg.sender, address(this), _amount);

        uint shares = totalShares == 0 ? _amount : (_amount.mul(totalShares)).div(balance());
        totalShares = totalShares.add(shares);
        _shares[_to] = _shares[_to].add(shares);

        uint globalHarvested = _depositStakingToken(_amount);
        emit Deposited(msg.sender, _amount);

        _harvest(globalHarvested);
    }

    function _cleanupIfDustShares() private {
        uint shares = _shares[msg.sender];
        if (shares > 0 && shares < DUST) {
            totalShares = totalShares.sub(shares);
            delete _shares[msg.sender];
        }
    }

    // SALVAGE PURPOSE ONLY
    // @dev _stakingToken(GLOBAL) must not remain balance in this contract. So dev should be able to salvage staking token transferred by mistake.
    function recoverToken(address _token, uint amount) virtual external onlyOwner {
        IBEP20(_token).safeTransfer(owner(), amount);

        emit Recovered(_token, amount);
    }
}