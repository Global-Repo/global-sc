changes

- PancakeLibrary.getReserves ; commented // pairFor(factory, tokenA, tokenB); (no es fa servir)      -- IGUAL Q BISWAP
- PancakeLibrary.getAmountOut ; added swapfee								-- IGUAL Q BISWAP
- PancakeLibrary.getAmountIn ; added swapfee								-- IGUAL Q BISWAP
- PancakeLibrary.getAmountsOut ;  added swapFee = IFactory(factory).getSwapFee() and modified call to getAmountOut including swap;
- PancakeLibrary.getAmountsIn ;   added swapFee = IFactory(factory).getSwapFee() and modified call to getAmountIn including swap;


- Router.getAmountIn(); added swapFee 									-- IGUAL Q BISWAP
- Router.getAmountOut(); added swapFee 									-- IGUAL Q BISWAP
- Router._swapSupportingFeeOnTransferTokens(); added swapFee = IFactory(factory).getSwapFee() and swapFee to PancakeLibrary.getAmountOut call 




== biswap tenen == 
	    //biswap genera BIWAP COINS amb una part de les fees que se li cobren al user per cada swap.
	    //ho fa amb la funcio swap de la ISwapFeeReward interface. 
	    //per ferho necessita oracle, per saber quanta quantitat de coins pertoquen per certa pasta

	    if (swapFeeReward != address(0)) {
                ISwapFeeReward(swapFeeReward).swap(msg.sender, input, output, amountOut);
            }
 



