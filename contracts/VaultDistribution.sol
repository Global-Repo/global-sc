// SPDX-License-Identifier: MIT
pragma solidity ^0.6.12;

import "hardhat/console.sol";

import "./SafeBEP20.sol";
import "./Math.sol";
import './DevPower.sol';

contract VaultDistribution is DevPower {
    using SafeBEP20 for IBEP20;
    using SafeMath for uint16;
    using SafeMath for uint256;

    struct Beneficiary {
        address id;
        uint16 percentage;
    }

    IBEP20 public distributionToken;
    Beneficiary[] public beneficiaries;
    mapping (address => bool) depositories;
    uint16 public totalDistributionPercentage;
    uint16 public maxDistributionPercentage;
    uint256 public minTokenAmountToDistribute;

    event Deposit(address depository, uint256 amount);
    event Distributed(uint256 distributedAmount, uint256 numberOfBeneficiaries);

    modifier onlyDepositories() {
        require(depositories[msg.sender] == true, "Only depositories can perform this action");
        _;
    }

    modifier distributeTokens() {
        uint currentTokenAmount = distributionToken.balanceOf(address(this));

        if (currentTokenAmount >= minTokenAmountToDistribute) {
            for (uint8 i = 0; i < beneficiaries.length; i++) {
                uint256 amount = currentTokenAmount.mul(beneficiaries[i].percentage).div(10000);
                distributionToken.safeTransfer(beneficiaries[i].id, amount);
            }
        }

        emit Distributed(currentTokenAmount, beneficiaries.length);
        _;
    }

    constructor(address _distributionToken, address _devPower) public {
        distributionToken = IBEP20(_distributionToken);

        totalDistributionPercentage = 0;
        maxDistributionPercentage = 10000; // 100%
        minTokenAmountToDistribute = 1e18; // 1 Token

        transferDevPower(_devPower);
    }

    function setMaxDistributionPercentage(uint16 _newPercentage) external onlyDevPower {
        require(_newPercentage <= 10000, "Max distribution percentage must not be greater than 100%");
        require(_newPercentage > 0, "Max distribution percentage must not be smaller than 0%");
        maxDistributionPercentage = _newPercentage;
    }

    function setMinTokenAmountToDistribute(uint256 _newAmount) external onlyDevPower {
        require(_newAmount >= 0, "Min token amount to distribute must be greater than 0");
        minTokenAmountToDistribute = _newAmount;
    }

    function setDepositary(address _depository, bool _canDeposit) external onlyDevPower {
        if (_canDeposit) {
            depositories[_depository] = _canDeposit;
            distributionToken.safeApprove(_depository, 0);
        } else {
            delete depositories[_depository];
        }
    }

    function setBeneficiary(address _beneficiary, uint16 _distributionPercentage) external onlyDevPower {
        for (uint8 i = 0; i < beneficiaries.length; i++) {
            // Beneficiary already exists. Update percentage.
            if (beneficiaries[i].id == _beneficiary) {
                require(
                    totalDistributionPercentage - beneficiaries[i].percentage + _distributionPercentage <= maxDistributionPercentage,
                    "Maximum total distribution percentage achieved"
                );

                beneficiaries[i].percentage = _distributionPercentage;
            }
        }

        require(
            totalDistributionPercentage + _distributionPercentage <= maxDistributionPercentage,
            "Maximum total distribution percentage achieved"
        );

        Beneficiary memory beneficiary;
        beneficiary.id = _beneficiary;
        beneficiary.percentage = _distributionPercentage;
        beneficiaries.push(beneficiary);

        totalDistributionPercentage = totalDistributionPercentage + _distributionPercentage;
    }

    function deposit(uint _amount) public onlyDepositories distributeTokens {
        distributionToken.safeTransferFrom(msg.sender, address(this), _amount);

        emit Deposit(msg.sender, _amount);
    }
}