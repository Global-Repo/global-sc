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
  xit("No withdrawal fees on withdrawal all", async function () {
    const depositedAmount = BigNumber.from(5).mul(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER);

    await vaultCake.setWithdrawalFees(0, 0, 0);
    await vaultCake.setRewards(10000, 0, 0, 0, 0);
    await cakeToken.connect(owner).transfer(user1.address, depositedAmount);
    await cakeToken.connect(owner).transfer(user2.address, depositedAmount);
    await cakeToken.connect(owner).approve(vaultCake.address, OWNER_INITIAL_CAKES);
    await cakeToken.connect(user1).approve(vaultCake.address, OWNER_INITIAL_CAKES);
    await cakeToken.connect(user2).approve(vaultCake.address, OWNER_INITIAL_CAKES);

    await vaultCake.connect(owner).deposit(depositedAmount);
    await vaultCake.connect(user1).deposit(depositedAmount);
    await vaultCake.connect(user2).deposit(depositedAmount);
    await vaultCake.connect(owner).withdrawAll();

    // So now, there are 15 - 5 = 10 tokens + 3 of auto-compound.
    // There are 2 users staking now so 3 tokens / 2 users = 1.5 cakes per user as a reward at this point.
    expect(await vaultCake.earned(user1.address)).to.eq("1500000000000000000");

    // Gets the deposited 5 cakes + 1.5 cakes of rewards.
    await vaultCake.connect(user1).withdrawAll();
    expect(await cakeToken.balanceOf(user1.address)).to.equal("6500000000000000000");
  });

  xit("Withdrawal fees applied over principal deposit when user withdraws before defined interval days", async function () {
    const timestamp4days = new Date().setTime(4 * 86400); // +3 days
    const depositedAmount = BigNumber.from(5).mul(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER);

    await vaultCake.setWithdrawalFees(60, 10, timestamp4days);
    await vaultCake.setRewards(10000, 0, 0, 0, 0);
    await cakeToken.connect(owner).transfer(user1.address, depositedAmount);
    await cakeToken.connect(owner).transfer(user2.address, depositedAmount);
    await cakeToken.connect(owner).approve(vaultCake.address, OWNER_INITIAL_CAKES);
    await cakeToken.connect(user1).approve(vaultCake.address, OWNER_INITIAL_CAKES);
    await cakeToken.connect(user2).approve(vaultCake.address, OWNER_INITIAL_CAKES);

    await vaultCake.connect(owner).deposit(depositedAmount);
    await vaultCake.connect(user1).deposit(depositedAmount);
    await vaultCake.connect(user2).deposit(depositedAmount);
    await vaultCake.connect(user1).withdrawAll();

    // 0.6% of deposited cakes buy global and burned (relation 1 to 1 in test)
    expect(await nativeToken.balanceOf("0x000000000000000000000000000000000000dEaD")).to.equal("30000000000000000");

    // 0.1% of deposited cakes buy BUSD and sent to devs (relation 1 to 1 in test)
    expect(await busd.balanceOf(treasury.address)).to.equal("5000000000000000");

    // User receives 100 - 0.6 - 0.1 = 99.3% of 5 cakes = 4.965 cakes back
    expect(await cakeToken.balanceOf(user1.address)).to.equal("4965000000000000000");
  });

  it("Withdrawal fees applied when withdrawUnderlying and rewards not paid", async function () {
    const timestamp4days = new Date().setTime(4 * 86400); // +3 days
    const depositedAmount = BigNumber.from(5).mul(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER);
    const withdrawalAmount = BigNumber.from(2).mul(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER);

    await vaultCake.setWithdrawalFees(60, 10, timestamp4days);
    await vaultCake.setRewards(10000, 0, 0, 0, 0);
    await cakeToken.connect(owner).transfer(user1.address, depositedAmount);
    await cakeToken.connect(owner).transfer(user2.address, depositedAmount);
    await cakeToken.connect(owner).approve(vaultCake.address, OWNER_INITIAL_CAKES);
    await cakeToken.connect(user1).approve(vaultCake.address, OWNER_INITIAL_CAKES);
    await cakeToken.connect(user2).approve(vaultCake.address, OWNER_INITIAL_CAKES);

    await vaultCake.connect(owner).deposit(depositedAmount);
    await vaultCake.connect(user1).deposit(depositedAmount);
    await vaultCake.connect(user2).deposit(depositedAmount);
    await vaultCake.connect(user1).withdrawUnderlying(withdrawalAmount);

    // 0.6% of deposited cakes buy global and burned (relation 1 to 1 in test)
    expect(await nativeToken.balanceOf("0x000000000000000000000000000000000000dEaD")).to.equal("12000000000000000");

    // 0.1% of deposited cakes buy BUSD and sent to devs (relation 1 to 1 in test)
    expect(await busd.balanceOf(treasury.address)).to.equal("2000000000000000");

    // User receives 100 - 0.6 - 0.1 = 99.3% of 5 cakes = 4.965 cakes back
    expect(await cakeToken.balanceOf(user1.address)).to.equal("1986000000000000000");
  });
});