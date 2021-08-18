// SPDX-License-Identifier: MIT
pragma solidity ^0.6.12;

import "./SafeBEP20.sol";
import "./Math.sol";
import "./IGlobalMasterChef.sol";
import './DepositoryRestriction.sol';
import "./IDistributable.sol";

contract VaultVested is DepositoryRestriction, IDistributable {
    using SafeBEP20 for IBEP20;
    using SafeMath for uint;
    using SafeMath for uint16;

    IBEP20 private global;
    IBEP20 private bnb;
    IGlobalMasterChef private globalMasterChef;
    address private vaultLocked;

    uint private constant DUST = 1000;

    uint256 public pid;
    uint public totalShares;
    uint public minTokenAmountToDistribute;
    mapping (address => uint) private _shares;
    mapping (address => uint) private _principal;
    mapping (address => uint) private _depositedAt;
    mapping (address => uint) private _bnbEarned;

    struct PenaltyFees {
        uint16 fee;       // % to locked vault (in Global)
        uint256 interval; // Meanwhile, penalty fees will be apply (timestamp)
    }

    PenaltyFees public penaltyFees;

    event Deposited(address indexed user, uint amount);
    event Withdrawn(address indexed user, uint amount, uint withdrawalFee);
    event ProfitPaid(address indexed user, uint amount);
    event Recovered(address token, uint amount);

    /*modifier distributeTokens() {
        _;
        _distribute();
    }*/

    constructor(
        address _global,
        address _bnb,
        address _globalMasterChef,
        address _vaultLocked
    ) public {
        pid = 0;
        global = IBEP20(_global);
        bnb = IBEP20(_bnb);
        globalMasterChef = IGlobalMasterChef(_globalMasterChef);
        vaultLocked = _vaultLocked;

        minTokenAmountToDistribute = 1e18; // 1 BEP20 Token

        _allowance(global, _globalMasterChef);
    }

    function triggerDistribute() external override {
        _distribute();
    }

    function totalSupply() external view returns (uint) {
        return totalShares;
    }

    function balance() public view returns (uint amount) {
        (amount,) = globalMasterChef.userInfo(pid, address(this));
    }

    function balanceOf(address account) public view returns(uint) {
        if (totalShares == 0) return 0;
        return balance().mul(sharesOf(account)).div(totalShares);
    }

    function withdrawableBalanceOf(address account) public view returns (uint) {
        return balanceOf(account);
    }

    function sharesOf(address account) public view returns (uint) {
        return _shares[account];
    }

    function principalOf(address account) public view returns (uint) {
        return _principal[account];
    }

    function earned(address account) public view returns (uint) {
        if (balanceOf(account) >= principalOf(account) + DUST) {
            return balanceOf(account).sub(principalOf(account));
        } else {
            return 0;
        }
    }

    function priceShare() external view returns(uint) {
        if (totalShares == 0) return 1e18;
        return balance().mul(1e18).div(totalShares);
    }

    function depositedAt(address account) external view returns (uint) {
        return _depositedAt[account];
    }

    function rewardsToken() external view returns (address) {
        return address(bnb);
    }

    function deposit(uint _amount, address _account) public onlyDepositories {
        global.safeTransferFrom(msg.sender, address(this), _amount);

        uint shares = totalShares == 0 ? _amount : (_amount.mul(totalShares)).div(balance());
        totalShares = totalShares.add(shares);
        _shares[_account] = _shares[_account].add(shares);
        _principal[msg.sender] = _principal[msg.sender].add(_amount);
        _depositedAt[msg.sender] = block.timestamp;

        uint globalHarvested = _depositStakingToken(_amount);
        emit Deposited(msg.sender, _amount);
    }

    function withdrawAll() external {
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
    }

    function withdrawUnderlying(uint _amount) external {
        uint amount = Math.min(_amount, _principal[msg.sender]);
        uint shares = Math.min(amount.mul(totalShares).div(balance()), _shares[msg.sender]);

        uint globalHarvested = _withdrawStakingToken(amount);

        totalShares = totalShares.sub(shares);
        _shares[msg.sender] = _shares[msg.sender].sub(shares);
        _principal[msg.sender] = _principal[msg.sender].sub(amount);
    }

    function getReward() external {
        uint amount = earned(msg.sender);
        uint shares = Math.min(amount.mul(totalShares).div(balance()), _shares[msg.sender]);

        uint globalHarvested = _withdrawStakingToken(amount);

        totalShares = totalShares.sub(shares);
        _shares[msg.sender] = _shares[msg.sender].sub(shares);
        _cleanupIfDustShares();
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
            global.safeTransfer(vaultLocked, amountToVaultLocked);
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

    function _distribute() private {
        uint currentBNBAmount = bnb.balanceOf(address(this));

        if (currentBNBAmount < minTokenAmountToDistribute) {
            // Nothing to distribute.
            return;
        }
        /*
        for (uint i; i < _shares.length - 1; i++) {
            uint userSharesPercent = _shares[i].div(totalShares);
            uint bnbToUser = currentBNBAmount.mul(userSharesPercent);

            _bnbEarned[i] = _bnbEarned[i].add(bnbToUser);
        }
        */
        emit Distributed(currentBNBAmount);
    }
}