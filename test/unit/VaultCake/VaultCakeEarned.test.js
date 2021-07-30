const ethers = require("hardhat").ethers;
const { expect } = require("chai");
const { BigNumber } = require("@ethersproject/bignumber");

const TOKEN_DECIMALS = 18;
const BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER = BigNumber.from(10).pow(TOKEN_DECIMALS);
const NATIVE_TOKEN_PER_BLOCK = BigNumber.from(40).mul(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER);
const OWNER_INITIAL_CAKES = BigNumber.from(100).mul(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER);

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
  [owner, treasury, keeper, addr3, addr4, ...addrs] = await ethers.getSigners();

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

  // Set up scenarios
  await nativeToken.transferOwnership(minter.address);
  await minter.setMinter(vaultCake.address, true);
  await vaultCake.setMinter(minter.address);

  // Mint 100 cake tokens to owner
  await cakeToken.mint(OWNER_INITIAL_CAKES);

  // Cake's owner now is cake MC
  await cakeToken.transferOwnership(cakeMasterChefMock.address);
});

describe("VaultCake: Earned", function () {
  it("Earned after staking in vault and auto-compounding profits in the pool", async function () {
    const depositedAmount = BigNumber.from(5).mul(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER);

    await vaultCake.setWithdrawalFees(0, 0, 0);
    await cakeToken.connect(owner).transfer(addr3.address, depositedAmount);
    await cakeToken.connect(owner).transfer(addr4.address, depositedAmount);
    await cakeToken.connect(owner).approve(vaultCake.address, OWNER_INITIAL_CAKES);
    await cakeToken.connect(addr3).approve(vaultCake.address, OWNER_INITIAL_CAKES);
    await cakeToken.connect(addr4).approve(vaultCake.address, OWNER_INITIAL_CAKES);

    await vaultCake.connect(owner).deposit(depositedAmount);
    await vaultCake.connect(addr3).deposit(depositedAmount);
    await vaultCake.connect(addr4).deposit(depositedAmount);

    // Total deposited is 15 cakes.
    // Cake's mock MC adds 1 cake per deposit so now there are 18 cakes.
    // Withdraw triggers the auto-compound for this vault.
    await vaultCake.connect(owner).withdrawAll();

    // So now, there are 15 - 5 = 10 tokens + 3 of auto-compound.
    // There are 2 users staking now so 3 tokens / 2 users = 1.5 cakes per user as a reward at this point.
    expect(await vaultCake.earned(addr3.address)).to.eq("1500000000000000000");
    expect(await vaultCake.earned(addr4.address)).to.eq("1500000000000000000");

    // Owner is not getting rewards because of his withdrawal removed his shares in the pool.
    expect(await vaultCake.earned(owner.address)).to.eq(0);
  });
});