// SPDX-License-Identifier: Unlicensed
pragma solidity >=0.6.6;

interface ICallee {
    function pancakeCall(address sender, uint amount0, uint amount1, bytes calldata data) external;
}