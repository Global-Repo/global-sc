// SPDX-License-Identifier: Unlicensed
pragma solidity 0.6.12;

import './MasterChef.sol';
import './IBEP20.sol';

interface IMigratorChef {
    function migrate(IBEP20 token) external returns (IBEP20);
}