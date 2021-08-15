// SPDX-License-Identifier: MIT
pragma solidity >=0.6.6;

import "hardhat/console.sol";
import "../IRouterV2.sol";
import "../IBEP20.sol";
import "../SafeBEP20.sol";

contract RouterMock {
    using SafeBEP20 for IBEP20;

    // Needs to be set up with the proper tokens for transfer them.
    function swapExactTokensForTokens(
        uint amountIn,
        uint amountOutMin,
        address[] calldata path,
        address to,
        uint deadline
    ) external virtual returns (uint[] memory amounts) {
        IBEP20 token = IBEP20(path[1]);
        token.safeTransfer(to, amountIn);

        return amounts;
    }
}