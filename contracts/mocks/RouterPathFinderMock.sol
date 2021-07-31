// SPDX-License-Identifier: MIT
pragma solidity ^0.6.12;

import "../IRouterPathFinder.sol";

contract RouterPathFinderMock is IRouterPathFinder {
    function findPath(address _tokenA, address _tokenB) external override returns (address[] memory path) {
        address[] memory path = new address[](2);
        path[0] = _tokenA;
        path[1] = _tokenB;

        return path;
    }
}