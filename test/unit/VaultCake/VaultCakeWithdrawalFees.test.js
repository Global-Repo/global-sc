const ethers = require("hardhat").ethers;
const { expect } = require("chai");
const { BigNumber } = require("@ethersproject/bignumber");

const TOKEN_DECIMALS = 18;
const BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER = BigNumber.from(10).pow(TOKEN_DECIMALS);
const NATIVE_TOKEN_PER_BLOCK = BigNumber.from(40).mul(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER);
const OWNER_INITIAL_CAKES = BigNumber.from(100).mul(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER);
const ROUTER_INITIAL_TOKENS = BigNumber.from(100).mul(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER);

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
let vaultCake;
let busd;

beforeEach(async function () {
  [owner, treasury, keeper, user1, user2, user3, user4, ...addrs] = await ethers.getSigners();

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

  const VaultCake = await ethers.getContractFactory("VaultCake");
  vaultCake = await VaultCake.deploy(
      cakeToken.address,
      nativeToken.address,
      cakeMasterChefMock.address,
      treasury.address,
      tokenAddresses.address,
      routerMock.address,
      routerPathFinder.address,
      keeper.address
  );
  await vaultCake.deployed();

  const Busd = await ethers.getContractFactory("BEP20");
  busd = await Busd.deploy('Binance USD', 'BUSD');
  await busd.deployed();

  // Set up scenarios
  await nativeToken.mint(ROUTER_INITIAL_TOKENS);
  await busd.mint(ROUTER_INITIAL_TOKENS);
  await weth.mint(ROUTER_INITIAL_TOKENS);
  await nativeToken.transfer(routerMock.address, ROUTER_INITIAL_TOKENS);
  await busd.transfer(routerMock.address, ROUTER_INITIAL_TOKENS);
  await weth.transfer(routerMock.address, ROUTER_INITIAL_TOKENS);
  await nativeToken.transferOwnership(minter.address);

  await minter.setMinter(vaultCake.address, true);
  await vaultCake.setMinter(minter.address);

  // Mint 100 cake tokens to owner
  await cakeToken.mint(OWNER_INITIAL_CAKES);

  // Cake's owner now is cake MC
  await cakeToken.transferOwnership(cakeMasterChefMock.address);

  // Addresses for fees and rewards
  tokenAddresses.addToken("GLOBAL", nativeToken.address);
  tokenAddresses.addToken("CAKE", cakeToken.address);
  tokenAddresses.addToken("BNB", weth.address);
  tokenAddresses.addToken("BUSD", busd.address);
});

describe("VaultCake: Withdrawal fees", function () {
  it("--", async function () {

  });
});