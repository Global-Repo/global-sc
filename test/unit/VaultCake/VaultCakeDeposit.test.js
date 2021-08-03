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
  await minter.setMinter(vaultCake.address, true);
  await vaultCake.setMinter(minter.address);

  // Mint 100 cake tokens to owner
  await cakeToken.mint(OWNER_INITIAL_CAKES);

  // Cake's owner now is cake MC
  await cakeToken.transferOwnership(cakeMasterChefMock.address);
});

describe("VaultCake: Deposit", function () {
  it("Deposit zero", async function () {
    const depositAmount = BigNumber.from(0).mul(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER);

    await expect(vaultCake.deposit(depositAmount))
        .to.emit(vaultCake, 'Deposited')
        .withArgs(owner.address, depositAmount);

    expect(await cakeToken.balanceOf(vaultCake.address)).to.equal(depositAmount);
  });

  it("Deposit an amount", async function () {
    const depositAmount = BigNumber.from(5).mul(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER);

    await cakeToken.approve(vaultCake.address, OWNER_INITIAL_CAKES);
    await expect(vaultCake.deposit(depositAmount))
        .to.emit(vaultCake, 'Deposited')
        .withArgs(owner.address, depositAmount);

    expect(await vaultCake.balance()).to.equal(depositAmount);
    expect(await cakeToken.balanceOf(cakeMasterChefMock.address)).to.equal(depositAmount);
    expect(await vaultCake.totalSupply()).to.equal(depositAmount);

    expect(await vaultCake.principalOf(owner.address)).to.equal(depositAmount);
    expect(await vaultCake.sharesOf(owner.address)).to.equal(depositAmount);
    expect(await vaultCake.balanceOf(owner.address)).to.equal(depositAmount);
  });

  it("Many deposits from same user", async function () {
    const firstDeposit = BigNumber.from(5).mul(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER);
    const secondDeposit = BigNumber.from(10).mul(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER);
    const thirdDeposit = BigNumber.from(2).mul(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER);
    const totalDepositedAmount = firstDeposit.add(secondDeposit).add(thirdDeposit);

    await cakeToken.approve(vaultCake.address, OWNER_INITIAL_CAKES);
    await vaultCake.deposit(firstDeposit);
    await vaultCake.deposit(secondDeposit);
    await vaultCake.deposit(thirdDeposit);

    expect(await vaultCake.balance()).to.equal(totalDepositedAmount);
    expect(await cakeToken.balanceOf(cakeMasterChefMock.address)).to.equal(totalDepositedAmount);
    expect(await vaultCake.totalSupply()).to.equal(totalDepositedAmount);

    expect(await vaultCake.principalOf(owner.address)).to.equal(totalDepositedAmount);
    expect(await vaultCake.sharesOf(owner.address)).to.equal(totalDepositedAmount);
    expect(await vaultCake.balanceOf(owner.address)).to.equal(totalDepositedAmount);
  });

  it("Many deposits from different users", async function () {
    const firstDeposit = BigNumber.from(5).mul(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER);
    const secondDeposit = BigNumber.from(10).mul(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER);
    const thirdDeposit = BigNumber.from(2).mul(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER);
    const ownerDepositedAmount = firstDeposit;
    const addr3DepositedAmount = secondDeposit.add(thirdDeposit);
    const totalDepositedAmount = ownerDepositedAmount.add(addr3DepositedAmount);

    await cakeToken.transfer(addr3.address, BigNumber.from(50).mul(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER));
    await cakeToken.approve(vaultCake.address, OWNER_INITIAL_CAKES);
    await cakeToken.connect(addr3).approve(vaultCake.address, OWNER_INITIAL_CAKES);
    await vaultCake.deposit(firstDeposit);
    await vaultCake.connect(addr3).deposit(secondDeposit);
    await vaultCake.connect(addr3).deposit(thirdDeposit);

    expect(await vaultCake.balance()).to.equal(totalDepositedAmount);
    expect(await cakeToken.balanceOf(cakeMasterChefMock.address)).to.equal(totalDepositedAmount);
    expect(await vaultCake.totalSupply()).to.equal(totalDepositedAmount);

    expect(await vaultCake.principalOf(owner.address)).to.equal(ownerDepositedAmount);
    expect(await vaultCake.principalOf(addr3.address)).to.equal(addr3DepositedAmount);
    expect(await vaultCake.sharesOf(owner.address)).to.equal(ownerDepositedAmount);
    expect(await vaultCake.sharesOf(addr3.address)).to.equal(addr3DepositedAmount);
    expect(await vaultCake.balanceOf(owner.address)).to.equal(ownerDepositedAmount);
    expect(await vaultCake.balanceOf(addr3.address)).to.equal(addr3DepositedAmount);

    // Cake's master chef should to contain staked cakes from vault user.
    const {0: stakedAmount, 1: rewardDebt} = await cakeMasterChefMock.userInfo(0, vaultCake.address);
    expect(stakedAmount).to.equal(totalDepositedAmount);
  });
});