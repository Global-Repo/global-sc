// SPDX-License-Identifier: Unlicensed
pragma solidity >= 0.6.12;

import "./IFactory.sol";
import "./Pair.sol";

contract Factory is IFactory {
    bytes32 public constant override INIT_CODE_PAIR_HASH = keccak256(abi.encodePacked(type(Pair).creationCode));

    address public override feeTo;
    uint public override feeNum;
    uint public override feeDenum;
    address public override feeToSetter;

    mapping(address => mapping(address => address)) public override getPair;
    address[] public override allPairs;

    event PairCreated(address indexed token0, address indexed token1, address pair, uint);

    constructor(address _feeToSetter) public {
        feeToSetter = _feeToSetter;
    }

    function feeTo() external override view returns (address)
    {
        return (feeTo,feeNum,feeDenum);
    }

    function allPairsLength() external override view returns (uint) {
        return allPairs.length;
    }

    function createPair(address tokenA, address tokenB) external override returns (address pair) {
        require(tokenA != tokenB, 'Pancake: IDENTICAL_ADDRESSES');
        (address token0, address token1) = tokenA < tokenB ? (tokenA, tokenB) : (tokenB, tokenA);
        require(token0 != address(0), 'Pancake: ZERO_ADDRESS');
        require(getPair[token0][token1] == address(0), 'Pancake: PAIR_EXISTS'); // single check is sufficient
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

    function setFeeTo(address _feeTo, uint _feeNum, uint _feeDenum) external override {
        require(msg.sender == feeToSetter, 'Pancake: FORBIDDEN');
        require(_feeNum < _feeDenum, 'You cannot set the fees to the total or more tnan the total of the fees');
        require(0 <= _feeNum, 'You cannot set numerator of the fees below 0');
        require(0 < _feeDenum, 'You cannot set denominator of the fees to 0 or below');
        feeTo = _feeTo;
        feeNum = _feeNum;
        feeDenum = _feeDenum;
    }

    function setFeeToSetter(address _feeToSetter) external override {
        require(msg.sender == feeToSetter, 'Pancake: FORBIDDEN');
        feeToSetter = _feeToSetter;
    }
}