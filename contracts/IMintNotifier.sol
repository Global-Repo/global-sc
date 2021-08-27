// SPDX-License-Identifier: MIT
pragma solidity ^0.6.12;

interface IMintNotifier {
    function notify(address _for, uint _amount) external;
}