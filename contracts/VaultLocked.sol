// SPDX-License-Identifier: MIT
pragma solidity ^0.6.12;

import "./SafeBEP20.sol";
import "./Math.sol";
import "./IDistributable.sol";

contract VaultLocked is IDistributable {
    using SafeBEP20 for IBEP20;
    using SafeMath for uint;
    using SafeMath for uint16;

    IBEP20 private global;
    IBEP20 private bnb;

    uint256 public lockedInterval;

    event Deposited(address indexed _account, uint _amount);

    function triggerDistribute() external override {
        //_distribute();
    }

    // TODO: Only depositories?
    function deposit(uint _amount, address _account) public {
        global.safeTransferFrom(msg.sender, address(this), _amount);

        /*
        uint shares = totalShares == 0 ? _amount : (_amount.mul(totalShares)).div(balance());
        totalShares = totalShares.add(shares);
        _shares[_account] = _shares[_account].add(shares);
        _principal[_account] = _principal[_account].add(_amount);
        _depositedAt[_account] = block.timestamp;
        */

        emit Deposited(_account, _amount);
    }
}