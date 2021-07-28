// SPDX-License-Identifier: MIT
pragma solidity ^0.6.12;

import './IBEP20.sol';

interface IPather {
    function getRouteAddress(address _token) external view returns (address);
}