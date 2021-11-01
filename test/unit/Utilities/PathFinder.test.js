const ethers = require("hardhat").ethers;
const { expect } = require("chai");
const { BigNumber } = require("@ethersproject/bignumber");

const TOKEN_DECIMALS = 18;
const BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER = BigNumber.from(10).pow(TOKEN_DECIMALS);
const NATIVE_TOKEN_PER_BLOCK = BigNumber.from(40).mul(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER);
const DAY_IN_SECONDS = 86400;

let startBlock = null;

let nativeToken;
let factory;
let router;
let tokenA;
let tokenB;
let tokenARoute;
let tokenBRoute;
let weth;
let masterChef;

var afegirPool = async function (token0, token1)
{
  let date = new Date();
  const deadline = date.setTime(date.getTime() + 2 * 86400000); // +2 days

  await router.addLiquidity(
      token0.address,
      token1.address,
      BigNumber.from(10).mul(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER),
      BigNumber.from(10).mul(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER),
      BigNumber.from(1).mul(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER),
      BigNumber.from(1).mul(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER),
      owner.address,
      deadline
  );

  //add pool A-B
  await masterChef.addPool(
      BigNumber.from(40).mul(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER),
      await factory.getPair(token0.address, token1.address),
      DAY_IN_SECONDS * 3,
      DAY_IN_SECONDS * 3,
      50,
      50,
      100,
      100
  );
}

beforeEach(async function () {
  [owner, addr1, lockedVault, ...addrs] = await ethers.getSigners();

  const CURRENT_BLOCK = await ethers.provider.getBlockNumber();
  startBlock = CURRENT_BLOCK + 1;

  const NativeToken = await ethers.getContractFactory("NativeToken");
  nativeToken = await NativeToken.deploy();
  await nativeToken.deployed();

  //A-B-WBNB-C-D

  const TokenA = await ethers.getContractFactory("BEP20");
  tokenA = await TokenA.deploy('tokenA', 'AA');
  await tokenA.deployed();

  const TokenB = await ethers.getContractFactory("BEP20");
  tokenB = await TokenB.deploy('tokenB', 'BB');
  await tokenB.deployed();

  const TokenC = await ethers.getContractFactory("BEP20");
  tokenC = await TokenC.deploy('tokenC', 'AA');
  await tokenC.deployed();

  const TokenD = await ethers.getContractFactory("BEP20");
  tokenD = await TokenD.deploy('tokenD', 'BB');
  await tokenD.deployed();

  const Factory = await ethers.getContractFactory("Factory");
  factory = await Factory.deploy(owner.address);
  await factory.deployed();

  const Weth = await ethers.getContractFactory("BEP20");
  WBNB = await Weth.deploy('Wrapped BNB', 'WBNB');
  await WBNB.deployed();

  const Router = await ethers.getContractFactory("Router");
  router = await Router.deploy(factory.address, WBNB.address);
  await router.deployed();

  const TokenAddresses = await ethers.getContractFactory("TokenAddresses");
  tokenAddresses = await TokenAddresses.deploy();
  await tokenAddresses.deployed();

  const PathFinder = await ethers.getContractFactory("PathFinder");
  pathFinder = await PathFinder.deploy(tokenAddresses.address);
  await pathFinder.deployed();

  const MasterChefInternal = await ethers.getContractFactory("MasterChefInternal");
  masterChefInternal = await MasterChefInternal.deploy(tokenAddresses.address,pathFinder.address);
  await masterChefInternal.deployed();

  const MasterChef = await ethers.getContractFactory("MasterChef");
  masterChef = await MasterChef.deploy(
      masterChefInternal.address,
      nativeToken.address,
      NATIVE_TOKEN_PER_BLOCK,
      startBlock,
      router.address,
      tokenAddresses.address,
      pathFinder.address
  );
  await masterChef.deployed();
  await masterChefInternal.transferOwnership(masterChef.address);
  await pathFinder.transferOwnership(masterChefInternal.address);

  // Set up scenarios
  const INITIAL_SUPPLY = BigNumber.from(100).mul(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER);

  await tokenA.mint(INITIAL_SUPPLY);
  await tokenB.mint(INITIAL_SUPPLY);
  await tokenC.mint(INITIAL_SUPPLY);
  await tokenD.mint(INITIAL_SUPPLY);
  await WBNB.mint(INITIAL_SUPPLY);
  await tokenA.approve(router.address, INITIAL_SUPPLY.toHexString());
  await tokenB.approve(router.address, INITIAL_SUPPLY.toHexString());
  await tokenC.approve(router.address, INITIAL_SUPPLY.toHexString());
  await tokenD.approve(router.address, INITIAL_SUPPLY.toHexString());
  await WBNB.approve(router.address, INITIAL_SUPPLY.toHexString());
  tokenAddresses.addToken(tokenAddresses.BNB(), WBNB.address);
});

describe("PathFinder", function () {

  it("Check a path A-B-WBNB-C-D", async function () {

    await afegirPool(WBNB,tokenB);
    await afegirPool(tokenA,tokenB);
    await afegirPool(WBNB,tokenC);
    await afegirPool(tokenC,tokenD);

    expect(await pathFinder.findPath(tokenA.address,tokenD.address)).to.eql([tokenA.address,tokenB.address,WBNB.address,tokenC.address,tokenD.address]);
    expect(await pathFinder.findPath(tokenA.address,tokenC.address)).to.eql([tokenA.address,tokenB.address,WBNB.address,tokenC.address]);
    expect(await pathFinder.findPath(tokenD.address,tokenA.address)).to.eql([tokenD.address,tokenC.address,WBNB.address,tokenB.address,tokenA.address]);
    expect(await pathFinder.findPath(tokenC.address,tokenA.address)).to.eql([tokenC.address,WBNB.address,tokenB.address,tokenA.address]);
    expect(await pathFinder.findPath(WBNB.address,tokenD.address)).to.eql([WBNB.address,tokenC.address,tokenD.address]);
    expect(await pathFinder.findPath(tokenD.address,WBNB.address)).to.eql([tokenD.address,tokenC.address,WBNB.address]);
    expect(await pathFinder.findPath(WBNB.address,tokenB.address)).to.eql([WBNB.address,tokenB.address]);
    expect(await pathFinder.findPath(tokenB.address,WBNB.address)).to.eql([tokenB.address,WBNB.address]);
    expect(await pathFinder.findPath(WBNB.address,tokenC.address)).to.eql([WBNB.address,tokenC.address]);
    expect(await pathFinder.findPath(tokenC.address,WBNB.address)).to.eql([tokenC.address,WBNB.address]);
    expect(await pathFinder.findPath(tokenA.address,tokenB.address)).to.eql([tokenA.address,tokenB.address]);
    expect(await pathFinder.findPath(tokenD.address,tokenC.address)).to.eql([tokenD.address,tokenC.address]);
  });

  it("Should not allow to add a disconected pair", async function () {
    await expect(afegirPool(tokenA,tokenB)).to.be.revertedWith("[f] Add: token/s not connected to WBNB");
  });

  it("Should not allow to add a pair with a token too far away from BNB", async function () {
    await afegirPool(WBNB,tokenB);
    await afegirPool(tokenA,tokenB);
    await expect(afegirPool(tokenA,tokenC)).to.be.revertedWith("[f] Add: token/s not connected to WBNB");
  });
});