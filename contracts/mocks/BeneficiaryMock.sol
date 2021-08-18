// SPDX-License-Identifier: MIT
pragma solidity ^0.6.12;

import "../IDistributable.sol";

contract BeneficiaryMock is IDistributable {
    function triggerDistribute() external override {
        emit Distributed(1e18);
    }
}