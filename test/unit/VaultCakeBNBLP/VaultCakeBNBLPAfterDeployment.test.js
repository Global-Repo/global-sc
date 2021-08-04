const ethers = require("hardhat").ethers;
const { expect } = require("chai");
const { BigNumber } = require("@ethersproject/bignumber");

const PID = 999;
const TOKEN_DECIMALS = 18;
const BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER = BigNumber.from(10).pow(TOKEN_DECIMALS);
const NATIVE_TOKEN_PER_BLOCK = BigNumber.from(40).mul(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER);

let startBlock;

let cakeToken;
let nativeToken;
let factory;
let weth;
let router;
let minter;
let cakeMasterChefMock;
let tokenAddresses;
let routerMock;
let routerPathFinder;
let vaultCakeBNBLP;

beforeEach(async function () {
  [owner, treasury, keeper, addr3, ...addrs] = await ethers.getSigners();

  const CURRENT_BLOCK = await ethers.provider.getBlockNumber();
  startBlock = CURRENT_BLOCK + 1;

  const CakeToken = await ethers.getContractFactory("BEP20");
  cakeToken = await CakeToken.deploy('CakeToken', 'CAKE');
  await cakeToken.deployed();

  const NativeToken = await ethers.getContractFactory("NativeToken");
  nativeToken = await NativeToken.deploy();
  await nativeToken.deployed();

  const Factory = await ethers.getContractFactory("Factory");
  factory = await Factory.deploy(owner.address);
  await factory.deployed();

  const Weth = await ethers.getContractFactory("BEP20");
  weth = await Weth.deploy('Wrapped BNB', 'WBNB');
  await weth.deployed();

  const Router = await ethers.getContractFactory("Router");
  router = await Router.deploy(factory.address, weth.address);
  await router.deployed();

  const Minter = await ethers.getContractFactory("MasterChef");
  minter = await Minter.deploy(
      nativeToken.address,
      NATIVE_TOKEN_PER_BLOCK,
      startBlock,
      keeper.address,
      router.address
  );
  await minter.deployed();

  const CakeMasterChefMock = await ethers.getContractFactory("CakeMasterChefMock");
  cakeMasterChefMock = await CakeMasterChefMock.deploy(cakeToken.address);
  await cakeMasterChefMock.deployed();

  const TokenAddresses = await ethers.getContractFactory("TokenAddresses");
  tokenAddresses = await TokenAddresses.deploy();
  await tokenAddresses.deployed();

  const RouterMock = await ethers.getContractFactory("RouterMock");
  routerMock = await RouterMock.deploy();
  await routerMock.deployed();

  const RouterPathFinder = await ethers.getContractFactory("RouterPathFinderMock");
  routerPathFinder = await RouterPathFinder.deploy();
  await routerPathFinder.deployed();

  const VaultCakeBNBLP = await ethers.getContractFactory("VaultCakeBNBLP");
  vaultCakeBNBLP = await VaultCakeBNBLP.deploy(
      PID,
      cakeToken.address,
      nativeToken.address,
      cakeMasterChefMock.address,
      treasury.address,
      tokenAddresses.address,
      routerMock.address,
      routerPathFinder.address,
      keeper.address
  );
  await vaultCakeBNBLP.deployed();

  // Set up scenarios
  await nativeToken.transferOwnership(minter.address);
});

describe("VaultCakeBNBLP: After deployment", function () {
  it("Check Cake BNB LP pool id (pid)", async function () {
    expect(await vaultCakeBNBLP.pid()).to.equal(PID);
  });
});