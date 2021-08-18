// SPDX-License-Identifier: MIT
pragma solidity ^0.6.12;

interface IDistributable {
    function triggerDistribute() external;

    event Distributed(uint _distributedAmount);
}