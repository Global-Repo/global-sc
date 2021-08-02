// SPDX-License-Identifier: MIT
pragma solidity ^0.6.12;

import './Ownable.sol';

interface IPathHelper {
    function addRouteAddress(address _token, address _tokenRoute) external;
    function removeRouteAddress(address _token) external;
    function getRouteAddress(address _token) external view returns (address);

    function findPath(address _tokenFrom, address _tokenTo) external view returns (address[] memory);
}