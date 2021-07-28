// SPDX-License-Identifier: MIT
pragma solidity ^0.6.12;

interface IPathHelper {
    function findPath(address _tokenFrom, address _tokenTo) external view returns (address[] memory);
}