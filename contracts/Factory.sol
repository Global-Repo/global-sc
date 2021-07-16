// SPDX-License-Identifier: Unlicensed
pragma solidity >= 0.6.12;

import "./IFactory.sol";
import "./Pair.sol";

contract Factory is IFactory {
    // bytes32 public constant INIT_CODE_PAIR_HASH = keccak256(abi.encodePacked(type(Pair).creationCode));

    address public devFeeTo;
    uint public devFeeNum;
    uint public devFeeDenum;
    uint public swapFee;
    address public override feeSetter;

    mapping(address => mapping(address => address)) public override getPair;
    address[] public override allPairs;

    event PairCreated(address indexed token0, address indexed token1, address pair, uint);
    event DevFeeChanged(address _devFeeTo, uint _devFeeNum, uint _devFeeDenum);
    event SwapFeeChanged(uint _swapFee);
    event FeeSetterChanged(address _feeSetter);

    constructor(address _feeSetter) public {
        feeSetter = _feeSetter;
        devFeeNum = 2; //originalment 4
        devFeeDenum = 9; // originalment 18
        swapFee = 18;
    }

    function INIT_CODE_PAIR_HASH() external override view returns (bytes32) {
       return keccak256(abi.encodePacked(type(Pair).creationCode));
    }

    function getDevFee() external override view returns (address, uint, uint)
    {
        return (devFeeTo,devFeeNum,devFeeDenum);
    }

    function getSwapFee() external override view returns (uint)
    {
        return swapFee;
    }

    function allPairsLength() external override view returns (uint) {
        return allPairs.length;
    }

    function createPair(address tokenA, address tokenB) external override returns (address pair) {
        require(tokenA != tokenB, 'IDENTICAL_ADDRESSES');
        (address token0, address token1) = tokenA < tokenB ? (tokenA, tokenB) : (tokenB, tokenA);
        require(token0 != address(0), 'ZERO_ADDRESS');
        require(getPair[token0][token1] == address(0), 'PAIR_EXISTS');
        bytes memory bytecode = type(Pair).creationCode;
        bytes32 salt = keccak256(abi.encodePacked(token0, token1));
        assembly {
            pair := create2(0, add(bytecode, 32), mload(bytecode), salt)
        }
        IPair(pair).initialize(token0, token1);
        getPair[token0][token1] = pair;
        getPair[token1][token0] = pair; // populate mapping in the reverse direction
        allPairs.push(pair);
        emit PairCreated(token0, token1, pair, allPairs.length);
    }

    function setDevFee(address _devFeeTo, uint _devFeeNum, uint _devFeeDenum) external override {
        require(msg.sender == feeSetter, 'FORBIDDEN');
        require(_devFeeNum < _devFeeDenum, 'You cannot set the fees to the total or more tnan the total of the fees');
        require(0 < _devFeeDenum, 'You cannot set denominator of the fees to 0');
        devFeeTo = _devFeeTo;
        devFeeNum = _devFeeNum;
        devFeeDenum = _devFeeDenum;
        emit DevFeeChanged(_devFeeTo, _devFeeNum, _devFeeDenum);
    }

    //Es seteja la fee que es fa a cada swap en base 10000
    function setSwapFee(uint _swapFee) external override {
        require(msg.sender == feeSetter, 'FORBIDDEN');
        require(_swapFee <= 25, 'You cannot set the swap fees above 25');
        swapFee = _swapFee;
        emit SwapFeeChanged(_swapFee);
    }

    function setFeeSetter(address _feeSetter) external override {
        require(msg.sender == feeSetter, 'FORBIDDEN');
        feeSetter = _feeSetter;
        emit FeeSetterChanged(_feeSetter);
    }
}