// SPDX-License-Identifier: MIT
pragma solidity ^0.6.12;

interface IRouterPathFinder {
    function findPath(address _tokenA, address _tokenB, uint16 _maxDepth) external returns (address[] memory path);
}