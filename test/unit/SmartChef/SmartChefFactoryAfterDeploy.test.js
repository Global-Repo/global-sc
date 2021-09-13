const ethers = require("hardhat").ethers;
const { expect } = require("chai");
const { BigNumber } = require("@ethersproject/bignumber");
const {
  deployToken,
  deployGlobal,
  deploySmartChefFactory,
} = require("../../helpers/singleDeploys.js");

const TOKEN_DECIMALS = 18;
const BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER = BigNumber.from(10).pow(TOKEN_DECIMALS);
const NATIVE_TOKEN_PER_BLOCK = BigNumber.from(40).mul(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER);
const DAY_IN_SECONDS = 86400;

let startBlock = null;

let nativeToken;
let tokenA;
let smartChefFactory;

beforeEach(async function () {
  [owner, addr1, lockedVault, ...addrs] = await ethers.getSigners();

  const CURRENT_BLOCK = await ethers.provider.getBlockNumber();
  startBlock = CURRENT_BLOCK + 1;

  nativeToken = await deployGlobal();
  tokenA = await deployToken("Token A", "A");
  const INITIAL_SUPPLY = BigNumber.from(1000000).mul(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER);

  await tokenA.mint(INITIAL_SUPPLY);
  await nativeToken.mint(INITIAL_SUPPLY);

  smartChefFactory = await deploySmartChefFactory();/*

  const TokenA = await ethers.getContractFactory("BEP20");
  tokenA = await TokenA.deploy('tokenA', 'AA');
  await tokenA.deployed();

  const TokenB = await ethers.getContractFactory("BEP20");
  tokenB = await TokenB.deploy('tokenB', 'BB');
  await tokenB.deployed();*/

  /*const Weth = await ethers.getContractFactory("BEP20");
  weth = await Weth.deploy('Wrapped BNB', 'WBNB');
  await weth.deployed();*/

  /*const TokenAddresses = await ethers.getContractFactory("TokenAddresses");
  tokenAddresses = await TokenAddresses.deploy();
  await tokenAddresses.deployed();

  const PathFinder = await ethers.getContractFactory("PathFinder");
  pathFinder = await PathFinder.deploy(tokenAddresses.address);
  await pathFinder.deployed();


  // Set up scenarios
  const INITIAL_SUPPLY = BigNumber.from(100).mul(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER);

  await tokenA.mint(INITIAL_SUPPLY);
  await tokenB.mint(INITIAL_SUPPLY);
  await tokenA.approve(router.address, INITIAL_SUPPLY.toHexString());
  await tokenB.approve(router.address, INITIAL_SUPPLY.toHexString());*/
});

describe("SmartChefFactory: After deployment", function () {
  it("Should deploy 1 pool", async function () {
    //expect(await smartChefFactory.poolLength()).to.equal(1);

    let myFirstPool = smartChefFactory.deployPool(nativeToken.address,tokenA.address,BigNumber.from(10).mul(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER),
        await ethers.provider.getBlockNumber(), (await ethers.provider.getBlockNumber())+100, BigNumber.from(1000).mul(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER), owner.address).
    to.emit(NewSmartChefContract);



    const INITIAL_SUPPLY_REWARD = BigNumber.from(1000).mul(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER);
    console.log("AQUI");
    console.log(myFirstPool);
    console.log(INITIAL_SUPPLY_REWARD);
    await tokenA.transfer(myFirstPool,INITIAL_SUPPLY_REWARD);

    /*const INITIAL_SUPPLY_STAKED = BigNumber.from(100).mul(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER);
    await nativeToken.transfer(addr1.address,INITIAL_SUPPLY_REWARD);

    myFirstPool.connect(addr1).deposit(INITIAL_SUPPLY_STAKED);
    await ethers.provider.send("evm_mine");
    myFirstPool.connect(addr1).withdraw(INITIAL_SUPPLY_STAKED);*/


  });

  it("Should deploy 1 pool", async function () {
    //expect(await smartChefFactory.poolLength()).to.equal(1);

    let myFirstPool = smartChefFactory.deployPool(nativeToken.address,tokenA.address,BigNumber.from(10).mul(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER),
        await ethers.provider.getBlockNumber(), (await ethers.provider.getBlockNumber())+100, BigNumber.from(1000).mul(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER), owner.address).
    to.emit(NewSmartChefContract);



    const INITIAL_SUPPLY_REWARD = BigNumber.from(1000).mul(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER);
    console.log("AQUI");
    console.log(myFirstPool);
    console.log(INITIAL_SUPPLY_REWARD);
    await tokenA.transfer(myFirstPool,INITIAL_SUPPLY_REWARD);

    /*const INITIAL_SUPPLY_STAKED = BigNumber.from(100).mul(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER);
    await nativeToken.transfer(addr1.address,INITIAL_SUPPLY_REWARD);

    myFirstPool.connect(addr1).deposit(INITIAL_SUPPLY_STAKED);
    await ethers.provider.send("evm_mine");
    myFirstPool.connect(addr1).withdraw(INITIAL_SUPPLY_STAKED);*/

    let smartChef = await deploySmartChef();

    smartChef.initialize(
        _stakedToken,
        _rewardToken,
        _rewardPerBlock,
        _startBlock,
        _bonusEndBlock,
        _poolLimitPerUser,
        _admin
    );
  });
});