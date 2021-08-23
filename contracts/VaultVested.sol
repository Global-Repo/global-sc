// SPDX-License-Identifier: MIT
pragma solidity ^0.6.12;

import "./SafeBEP20.sol";
import "./Math.sol";
import "./IGlobalMasterChef.sol";
import './DepositoryRestriction.sol';
import "./IDistributable.sol";
import "./VaultLocked.sol";

contract VaultVested is DepositoryRestriction, IDistributable {
    using SafeBEP20 for IBEP20;
    using SafeMath for uint;
    using SafeMath for uint16;

    IBEP20 private global;
    IBEP20 private bnb;
    IGlobalMasterChef private globalMasterChef;
    VaultLocked private vaultLocked;

    uint private constant DUST = 1000;
    uint256 public pid;

    uint public minTokenAmountToDistribute;
    uint256 public lastDistributedEvent;
    uint256 public distributionInterval;

    address[] public users;
    mapping (address => uint) private principal;
    mapping (address => uint) private depositedAt;
    mapping (address => uint) private bnbEarned;
    uint public totalSupply;

    struct PenaltyFees {
        uint16 fee;       // % to locked vault (in Global)
        uint256 interval; // Meanwhile, penalty fees will be apply (timestamp)
    }

    PenaltyFees public penaltyFees;

    event Deposited(address indexed _user, uint _amount);
    event Withdrawn(address indexed _user, uint _amount, uint _penaltyFees);
    event RewardPaid(address indexed _user, uint _amount);

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
        vaultLocked = VaultLocked(_vaultLocked);

        minTokenAmountToDistribute = 1e18; // 1 BEP20 Token
        distributionInterval = 12 hours;
        lastDistributedEvent = block.timestamp;

        _allowance(global, _globalMasterChef);
        _allowance(global, _vaultLocked);
    }

    function triggerDistribute() external override {
        _distribute();
    }

    function setDistributionInterval(uint _distributionInterval) external onlyDevPower {
        distributionInterval = _distributionInterval;
    }

    function balance() public view returns (uint amount) {
        (amount,) = globalMasterChef.userInfo(pid, address(this));
    }

    function balanceOf(address _account) public view returns(uint) {
        if (totalSupply == 0) return 0;
        return principalOf(_account);
    }

    function principalOf(address _account) public view returns (uint) {
        return principal[_account];
    }

    function earned(address _account) public view returns (uint) {
        if (principalOf(_account) > 0) {
            return bnbEarned[_account];
        } else {
            return 0;
        }
    }

    function rewardsToken() external view returns (address) {
        return address(bnb);
    }

    // Deposit globals.
    // Depository will deposit globals but the account tracking is for the user.
    function deposit(uint _amount, address _account) public onlyDepositories {
        global.safeTransferFrom(msg.sender, address(this), _amount);

        globalMasterChef.enterStaking(_amount);

        if (depositedAt[_account] == 0) {
            users.push(_account);
        }

        depositedAt[_account] = block.timestamp;
        totalSupply = totalSupply.add(_amount);
        principal[_account] = principal[_account].add(_amount);

        if (earned(_account) == 0) {
            bnbEarned[_account] = 0;
        }

        emit Deposited(_account, _amount);
    }

    // Withdraw all only
    function withdraw() external {
        uint amount = balanceOf(msg.sender);
        uint earned = earned(msg.sender);

        globalMasterChef.leaveStaking(amount);

        handlePenaltyFees(amount);
        handleRewards(earned);

        totalSupply = totalSupply.sub(amount);
        delete depositedAt[msg.sender];
        _deleteUser(msg.sender);
        delete principal[msg.sender];
        delete bnbEarned[msg.sender];
    }

    function getReward() external {
        uint earned = earned(msg.sender);

        handleRewards(earned);

        delete bnbEarned[msg.sender];
    }

    function handlePenaltyFees(uint _amount) private {
        if (depositedAt[msg.sender].add(penaltyFees.interval) < block.timestamp) {
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
            vaultLocked.depositRewards(amountToVaultLocked);
        }

        global.safeTransfer(msg.sender, amountToUser);

        emit Withdrawn(msg.sender, amountToUser, amountToVaultLocked);
    }

    function handleRewards(uint _earned) private {
        if (_earned < DUST) {
            return; // No rewards
        }

        bnb.safeTransfer(msg.sender, _earned);

        emit RewardPaid(msg.sender, _earned);
    }

    function _allowance(IBEP20 _token, address _account) private {
        _token.safeApprove(_account, uint(0));
        _token.safeApprove(_account, uint(~0));
    }

    function _deleteUser(address _account) private {
        for (uint8 i = 0; i < users.length; i++) {
            if (users[i] == _account) {
                delete users[i];
            }
        }
    }

    function _distribute() private {
        uint currentBNBAmount = bnb.balanceOf(address(this));

        if (lastDistributedEvent.add(distributionInterval) < block.timestamp) {
            // Nothing to distribute.
            return;
        }

        if (currentBNBAmount < minTokenAmountToDistribute) {
            // Nothing to distribute.
            return;
        }

        for (uint i=0; i < users.length; i++) {
            uint userPercentage = principalOf(users[i]).mul(100).div(totalSupply);
            uint bnbToUser = currentBNBAmount.mul(userPercentage).div(100);

            bnbEarned[users[i]] = bnbEarned[users[i]].add(bnbToUser);
        }

        lastDistributedEvent = block.timestamp;

        emit Distributed(currentBNBAmount);
    }
}