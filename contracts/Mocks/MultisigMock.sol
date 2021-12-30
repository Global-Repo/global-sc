// SPDX-License-Identifier: MIT
pragma solidity ^0.6.12;

import "../Modifiers/Ownable.sol";

contract MultisigMock is Ownable {
    uint public amount = 0;
    function increase() external onlyOwner returns (uint) {
        amount = amount + 1;
        return amount;
    }
}