const {TOKEN_DECIMALS, greet} = require("../../helpers");

const ethers = require("hardhat").ethers;
const { expect } = require("chai");
const { BigNumber } = require("@ethersproject/bignumber");

const BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER = BigNumber.from(10).pow(TOKEN_DECIMALS);
const NATIVE_TOKEN_PER_BLOCK = BigNumber.from(40).mul(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER);

greet()

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

  const TokenAddresses = await ethers.getContractFactory("TokenAddresses");
  tokenAddresses = await TokenAddresses.deploy();
  await tokenAddresses.deployed();

  const PathFinder = await ethers.getContractFactory("PathFinder");
  pathFinder = await PathFinder.deploy(tokenAddresses.address);
  await pathFinder.deployed();

  const Minter = await ethers.getContractFactory("MasterChef");
  minter = await Minter.deploy(
      nativeToken.address,
      NATIVE_TOKEN_PER_BLOCK,
      startBlock,
      keeper.address,
      router.address,
      tokenAddresses.address,
      pathFinder.address
  );
  await minter.deployed();
  await pathFinder.transferOwnership(minter.address);

  const CakeMasterChefMock = await ethers.getContractFactory("CakeMasterChefMock");
  cakeMasterChefMock = await CakeMasterChefMock.deploy(cakeToken.address);
  await cakeMasterChefMock.deployed();

  const RouterMock = await ethers.getContractFactory("RouterMock");
  routerMock = await RouterMock.deploy();
  await routerMock.deployed();

  const VaultCake = await ethers.getContractFactory("VaultCake");
  vaultCake = await VaultCake.deploy(
      cakeToken.address,
      nativeToken.address,
      cakeMasterChefMock.address,
      treasury.address,
      tokenAddresses.address,
      routerMock.address,
      pathFinder.address,
      keeper.address
  );
  await vaultCake.deployed();

  // Set up scenarios
  await nativeToken.transferOwnership(minter.address);
});

describe("VaultCake: After deployment", function () {
  it("Check Cake pool id (pid)", async function () {
    expect(await vaultCake.pid()).to.equal(0);
  });

  it("Vault is configured as minter", async function () {
    expect(await vaultCake.isVaultMintable()).to.false;

    await minter.setMinter(vaultCake.address, true);
    await vaultCake.setMinter(minter.address);

    expect(await vaultCake.isVaultMintable()).to.true;
  });

  it("Vault total supply is zero", async function () {
    expect(await vaultCake.totalSupply()).to.equal(0);
  });

  it("Vault balance against CAKE pool", async function () {
    expect(await vaultCake.balance()).to.equal(0);
  });

  it("Balance of account where not shares in vault is always zero", async function () {
    expect(await vaultCake.balanceOf(addr3.address)).to.equal(0);
  });
});