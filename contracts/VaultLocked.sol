// SPDX-License-Identifier: MIT
pragma solidity ^0.6.12;

import "./SafeBEP20.sol";
import "./Math.sol";
import "./IGlobalMasterChef.sol";
import "./IDistributable.sol";
import './Ownable.sol';
import "./DepositoryRestriction.sol";
import './ReentrancyGuard.sol';

// Hem d'afegir un harvest lockup obligatori a cada dipòsit del temps definit a la variable indicada (crear-la).
// Hem de fer que es distribueixin els tokens GLOBAL que el contracte JA TÉ (fer aquesta part).

contract VaultLocked is IDistributable, Ownable, DepositoryRestriction, ReentrancyGuard {
    using SafeBEP20 for IBEP20;
    using SafeMath for uint;
    using SafeMath for uint16;

    struct DepositInfo {
        uint amount;
        uint256 nextHarvest;
    }

    mapping (address=>DepositInfo[]) private depositInfo;

    IBEP20 private global;
    IBEP20 private bnb;
    IGlobalMasterChef private globalMasterChef;

    uint public constant DUST = 1000;
    uint256 public constant LOCKUP = 2592000;

    uint256 public pid;
    uint public minTokenAmountToDistribute;
    uint public minGlobalAmountToDistribute;
    address[] public users;
    mapping (address => uint) private principal;
    mapping (address => uint) private bnbEarned;
    mapping (address => uint) private globalEarned;
    uint public totalSupply;
    uint256 public lastRewardEvent;
    uint256 public rewardInterval;

    event RewardsDeposited(address indexed _account, uint _amount);
    event Deposited(address indexed _user, uint _amount);
    event Withdrawn(address indexed _user, uint _amount);
    event RewardPaid(address indexed _user, uint _amount, uint _amount2);
    event DistributedGLOBAL(uint GLOBALAmount);

    constructor(
        address _global,
        address _bnb,
        address _globalMasterChef,
        uint256 _rewardInterval
    ) public {
        // Pid del vault.
        pid = 3;

        // Li passem el address de global
        global = IBEP20(_global);

        // Li passem el address de bnb
        bnb = IBEP20(_bnb);

        // Li passem el address del masterchef a on es depositaràn els GLOBALs
        globalMasterChef = IGlobalMasterChef(_globalMasterChef);

        // Es repartirà 1bnb com a mínim. En cas contrari, no repartirem.
        minTokenAmountToDistribute = 1e18; // 1 BEP20 Token
        minGlobalAmountToDistribute = 100e18; // 1 BEP20 Token

        // ????????? Cal?????
        _allowance(global, _globalMasterChef);

        rewardInterval = _rewardInterval;

        lastRewardEvent = block.timestamp;
    }

    function setRewardInterval(uint256 _rewardInterval) external onlyOwner {
        rewardInterval = _rewardInterval;
    }

    function setMinGlobalAmountToDistribute(uint _minGlobalAmountToDistribute) external onlyOwner {
        minGlobalAmountToDistribute = _minGlobalAmountToDistribute;
    }

    function triggerDistribute() external nonReentrant override {
        _distributeBNB();
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

    function bnbToEarn(address _account) public view returns (uint) {
        if (principalOf(_account) > 0) {
            return bnbEarned[_account];
        } else {
            return 0;
        }
    }

    function globalToEarn(address _account) public view returns (uint) {
        if (principalOf(_account) > 0) {
            return globalEarned[_account];
        } else {
            return 0;
        }
    }

    function rewardsToken() external view returns (address) {
        return address(bnb);
    }

    // TODO: set vested vault as depository
    function depositRewards(uint _amount) public onlyDepositories {
        global.safeTransferFrom(msg.sender, address(this), _amount);

        _distributeGLOBAL();

        emit RewardsDeposited(msg.sender, _amount);
    }

    // Deposit globals.
    function deposit(uint _amount) public nonReentrant {
        bool userExists = false;
        global.safeTransferFrom(msg.sender, address(this), _amount);

        depositInfo[msg.sender].push(DepositInfo({
        amount: _amount,
        nextHarvest: block.timestamp.add(LOCKUP)
        }));
        globalMasterChef.enterStaking(_amount);


        for (uint j = 0; j < users.length; j++) {
            if (users[j] == msg.sender)
            {
                userExists = true;
                break;
            }
        }
        if (!userExists){
            users.push(msg.sender);
        }

        totalSupply = totalSupply.add(_amount);
        principal[msg.sender] = principal[msg.sender].add(_amount);

        if (bnbToEarn(msg.sender) == 0) {
            bnbEarned[msg.sender] = 0;
        }

        if (globalToEarn(msg.sender) == 0) {
            globalEarned[msg.sender] = 0;
        }

        emit Deposited(msg.sender, _amount);
    }

    function availableForWithdraw(uint256 _time, address _user) public view returns (uint totalAmount)
    {
        DepositInfo[] memory myDeposits =  depositInfo[_user];
        for(uint i=0; i< myDeposits.length; i++)
        {
            if(myDeposits[i].nextHarvest<_time)
            {
                totalAmount=totalAmount.add(myDeposits[i].amount);
            }
        }
    }

    function removeAvailableDeposits(address user) private
    {
        uint256 now = block.timestamp;

        while(depositInfo[user].length > 0 && depositInfo[user][0].nextHarvest<now)
        {
            for (uint i = 0; i<depositInfo[user].length-1; i++)
            {
                depositInfo[user][i] = depositInfo[user][i+1];
            }
            depositInfo[user].pop();
        }
    }

    // Withdraw all only
    function withdraw() external nonReentrant{
        uint amount = availableForWithdraw(block.timestamp,msg.sender);
        require(amount > 0, "VaultLocked: you have no tokens to withdraw!");
        uint earnedBNB = bnbToEarn(msg.sender);
        uint earnedGLOBAL = globalToEarn(msg.sender);

        removeAvailableDeposits(msg.sender);

        globalMasterChef.leaveStaking(amount);
        handleRewards(earnedBNB,earnedGLOBAL);
        totalSupply = totalSupply.sub(amount);
        _deleteUser(msg.sender);
        delete principal[msg.sender];
        delete bnbEarned[msg.sender];
    }

    function getReward() external nonReentrant {
        uint earnedBNB = bnbToEarn(msg.sender);
        uint earnedGLOBAL = globalToEarn(msg.sender);
        handleRewards(earnedBNB,earnedGLOBAL);
        delete bnbEarned[msg.sender];
        delete globalEarned[msg.sender];
    }

    function handleRewards(uint _earnedBNB, uint _earnedGLOBAL) private {
        if (_earnedBNB > DUST) {
            bnb.safeTransfer(msg.sender, _earnedBNB);
            return; // No rewards
        }
        if (_earnedGLOBAL > DUST) {
            global.safeTransfer(msg.sender, _earnedGLOBAL);
            return; // No rewards
        }

        emit RewardPaid(msg.sender, _earnedBNB, _earnedGLOBAL);
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

    function _distributeBNB() private {
        uint currentBNBAmount = bnb.balanceOf(address(this));

        if (currentBNBAmount < minTokenAmountToDistribute) {
            // Nothing to distribute.
            return;
        }

        for (uint i=0; i < users.length; i++) {
            uint userPercentage = principalOf(users[i]).mul(100).div(totalSupply);
            uint bnbToUser = currentBNBAmount.mul(userPercentage).div(100);

            bnbEarned[users[i]] = bnbEarned[users[i]].add(bnbToUser);
        }

        emit Distributed(currentBNBAmount);
    }

    function _distributeGLOBAL() private {
        uint currentGLOBALAmount = global.balanceOf(address(this));
        // TODO: revisar lastRewardEvent.add(rewardInterval)>=block.timestamp ha de ser <
        if(lastRewardEvent.add(rewardInterval)>=block.timestamp && currentGLOBALAmount >= minGlobalAmountToDistribute)
        {
            lastRewardEvent = block.timestamp;
            for (uint i=0; i < users.length; i++) {
                uint userPercentage = principalOf(users[i]).mul(100).div(totalSupply);
                uint globalToUser = currentGLOBALAmount.mul(userPercentage).div(100).div(20);

                globalEarned[users[i]] = globalEarned[users[i]].add(globalToUser);
            }
            emit DistributedGLOBAL(currentGLOBALAmount);
        }
    }
}