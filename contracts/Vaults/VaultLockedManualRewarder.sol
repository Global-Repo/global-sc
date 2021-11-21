// SPDX-License-Identifier: MIT
pragma solidity ^0.6.12;

import "../Libraries/SafeBEP20.sol";
import "../Libraries/Math.sol";
import '../Modifiers/Ownable.sol';
import "./VaultLockedManual.sol";

contract VaultLockedManualRewarder is Ownable {
    using SafeBEP20 for IBEP20;
    using SafeMath for uint;
    using SafeMath for uint16;

    IBEP20 public global;
    VaultLockedManual public vaultLockedManual;

    event DistributedREWARDS(address indexed _user, uint GLOBALAmount);

    constructor(
        address _global,
        address _vaultLockedManual
    ) public {
        vaultLockedManual = VaultLockedManual(_vaultLockedManual);
        global = IBEP20(_global);
    }

    function distributeRewards(uint firstUser, uint lastUser, uint amount) private {
        address actualUser;
        uint globalToUser;
        for (uint i=firstUser; i <= lastUser; i++) {
            actualUser = vaultLockedManual.users(i);
            globalToUser = amount.mul(vaultLockedManual.amountOfUser(actualUser)).div(vaultLockedManual.totalSupply());

            global.transfer(actualUser,globalToUser);

            emit DistributedREWARDS(actualUser,globalToUser);
        }
    }
}