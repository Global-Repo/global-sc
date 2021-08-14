// SPDX-License-Identifier: MIT
pragma solidity ^0.6.12;

import "./SafeBEP20.sol";
import './DevPower.sol';

contract VaultDistribution is DevPower {
    using SafeBEP20 for IBEP20;
    using SafeMath for uint;

    IBEP20 public distributionToken;
    IBEP20 public beneficiaryToken;
    address[] public beneficiaries;
    mapping (address => bool) depositories;
    uint public minTokenAmountToDistribute;

    event Deposited(address depository, uint amount);
    event Distributed(uint distributedAmount, uint numberOfBeneficiaries);

    modifier onlyDepositories() {
        require(depositories[msg.sender] == true, "Only depositories can perform this action");
        _;
    }

    modifier distributeTokens() {
        _;
        _distribute();
    }

    constructor(address _distributionToken, address _beneficiaryToken, address _devPower) public {
        distributionToken = IBEP20(_distributionToken);
        beneficiaryToken = IBEP20(_beneficiaryToken);
        minTokenAmountToDistribute = 1e18; // 1 BEP20 Token
        transferDevPower(_devPower);
    }

    function setMinTokenAmountToDistribute(uint _newAmount) external onlyDevPower {
        require(_newAmount >= 0, "Min token amount to distribute must be greater than 0");
        minTokenAmountToDistribute = _newAmount;
    }

    function setDepositary(address _depository, bool _canDeposit) external onlyDevPower {
        if (_canDeposit) {
            depositories[_depository] = _canDeposit;
            distributionToken.safeApprove(_depository, 0); // TODO: it needs to approve manually?
            // TODO el safe approve shauria de fer desde el cakevault, etc contra aquest distrib. vault
            distributionToken.safeApprove(_depository, uint(~0));
        } else {
            delete depositories[_depository];
        }
    }

    function addBeneficiary(address _beneficiary) external onlyDevPower {
        for (uint8 i = 0; i < beneficiaries.length; i++) {
            if (beneficiaries[i] == _beneficiary) {
                // Beneficiary exists already.
                return;
            }
        }

        beneficiaries.push(_beneficiary);
    }

    function removeBeneficiary(address _beneficiary) external onlyDevPower {
        for (uint8 i = 0; i < beneficiaries.length; i++) {
            if (beneficiaries[i] == _beneficiary) {
                delete beneficiaries[i];
            }
        }
    }

    function isBeneficiary(address _beneficiary) external view returns (bool) {
        for (uint8 i = 0; i < beneficiaries.length; i++) {
            if (beneficiaries[i] == _beneficiary) {
                return true;
            }
        }

        return false;
    }

    function deposit(uint _amount) public onlyDepositories distributeTokens {
        distributionToken.transferFrom(msg.sender, address(this), _amount);

        emit Deposited(msg.sender, _amount);
    }

    function _distribute() private {
        uint currentDistributionTokenAmount = distributionToken.balanceOf(address(this));

        if (currentDistributionTokenAmount < minTokenAmountToDistribute) {
            // Nothing to distribute.
            return;
        }

        uint totalBeneficiaryTokens = 0;
        for (uint8 i = 0; i < beneficiaries.length; i++) {
            totalBeneficiaryTokens = totalBeneficiaryTokens + beneficiaryToken.balanceOf(beneficiaries[i]);
        }

        for (uint8 i = 0; i < beneficiaries.length; i++) {
            uint beneficiaryDistributionPercentage = beneficiaryToken.balanceOf(beneficiaries[i]).mul(100).div(totalBeneficiaryTokens);
            uint amountForBeneficiary = currentDistributionTokenAmount.mul(beneficiaryDistributionPercentage).div(100);
            distributionToken.safeTransfer(beneficiaries[i], amountForBeneficiary);
        }

        emit Distributed(currentDistributionTokenAmount, beneficiaries.length);
    }
}