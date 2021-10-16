const ethers = require("hardhat").ethers;
const { expect } = require("chai");
const { BigNumber } = require("@ethersproject/bignumber");

const TOKEN_DECIMALS = 18;
const BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER = BigNumber.from(10).pow(TOKEN_DECIMALS);
const NATIVE_TOKEN_PER_BLOCK = BigNumber.from(40).mul(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER);

let startBlock;

let bunnyToken;
let nativeToken;
let factory;
let weth;
let router;
let minter;
let bunnyPoolMock;
let tokenAddresses;
let routerMock;
let routerPathFinder;
let vaultBunny;
let pathFinder;
let masterChefInternal;

beforeEach(async function () {
  [owner, treasury, keeper, addr3, ...addrs] = await ethers.getSigners();

  const CURRENT_BLOCK = await ethers.provider.getBlockNumber();
  startBlock = CURRENT_BLOCK + 1;

  const BunnyToken = await ethers.getContractFactory("BEP20");
  bunnyToken = await BunnyToken.deploy('BunnyToken', 'BUNNY');
  await bunnyToken.deployed();

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

  const TokenAddresses = await ethers.getContractFactory("TokenAddresses");
  tokenAddresses = await TokenAddresses.deploy();
  await tokenAddresses.deployed();

  const PathFinder = await ethers.getContractFactory("PathFinder");
  pathFinder = await PathFinder.deploy(tokenAddresses.address);
  await pathFinder.deployed();

  const MasterChefInternal = await ethers.getContractFactory("MasterChefInternal");
  masterChefInternal = await MasterChefInternal.deploy(tokenAddresses.address, pathFinder.address);
  await masterChefInternal.deployed();

  const Minter = await ethers.getContractFactory("MasterChef");
  minter = await Minter.deploy(
      masterChefInternal.address,
      nativeToken.address,
      NATIVE_TOKEN_PER_BLOCK,
      startBlock,
      router.address,
      tokenAddresses.address,
      pathFinder.address
  );
  await minter.deployed();
  await pathFinder.transferOwnership(minter.address);

  const BunnyPoolMock = await ethers.getContractFactory("BunnyPoolMock");
  bunnyPoolMock = await BunnyPoolMock.deploy(bunnyToken.address);
  await bunnyPoolMock.deployed();

  const RouterMock = await ethers.getContractFactory("RouterMock");
  routerMock = await RouterMock.deploy();
  await routerMock.deployed();

  const VaultBunny = await ethers.getContractFactory("VaultBunny");
  vaultBunny = await VaultBunny.deploy(
      bunnyToken.address,
      nativeToken.address,
      weth.address,
      bunnyPoolMock.address,
      treasury.address,
      tokenAddresses.address,
      routerMock.address,
      pathFinder.address,
      keeper.address
  );
  await vaultBunny.deployed();

  // Set up scenarios
  await nativeToken.transferOwnership(minter.address);
});

describe("VaultBunny: After deployment", function () {
  it("Staking token is cake", async function () {
    expect(await vaultBunny.stakingToken()).to.equal(bunnyToken.address);
  });
});