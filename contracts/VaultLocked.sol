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

    constructor(address _global, address _bnb) public {
        global = IBEP20(_global);
        bnb = IBEP20(_bnb);
    }

    function triggerDistribute() external override {
        _distribute();
    }

    // Deposit globals
    // Users can deposit globals here
    function deposit(uint _amount, address _account) public {
        global.safeTransferFrom(msg.sender, address(this), _amount);

        emit Deposited(_account, _amount);
    }

    function _distribute() private {
        // TODO
    }
}