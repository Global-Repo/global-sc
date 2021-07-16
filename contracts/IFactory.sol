// SPDX-License-Identifier: Unlicensed
pragma solidity >=0.6.6;

interface IFactory {
    event PairCreated(address indexed token0, address indexed token1, address pair, uint);
    event DevFeeChanged(address _devFeeTo, uint _devFeeNum, uint _devFeeDenum);
    event SwapFeeChanged(uint _swapFee);
    event FeeSetterChanged(address _feeSetter);

    function getSwapFee() external view returns (uint);
    function getDevFee() external view returns (address, uint, uint);
    function feeSetter() external view returns (address);

    function getPair(address tokenA, address tokenB) external view returns (address pair);
    function allPairs(uint) external view returns (address pair);
    function allPairsLength() external view returns (uint);

    function createPair(address tokenA, address tokenB) external returns (address pair);

    function setSwapFee(uint) external;
    function setDevFee(address, uint, uint) external;
    function setFeeSetter(address) external;

    function INIT_CODE_PAIR_HASH() external view returns (bytes32);
}