// SPDX-License-Identifier: MIT
pragma solidity ^0.6.12;

import "./IMintNotifier.sol";
import "hardhat/console.sol";

contract MintNotifier is IMintNotifier {

    event GlobalsMinted(address _for, uint _amount);

    function notify(address _for, uint _amount) external override {
        emit GlobalsMinted(_for,_amount);
    }
}