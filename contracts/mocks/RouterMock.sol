// SPDX-License-Identifier: MIT
pragma solidity >=0.6.6;

import "../IRouterV2.sol";

contract RouterMock {
    function swapExactTokensForTokens(
        uint amountIn,
        uint amountOutMin,
        address[] calldata path,
        address to,
        uint deadline
    ) external virtual returns (uint[] memory amounts) {
        return amounts;
    }
}
