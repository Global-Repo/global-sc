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
let busd;
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

  const Busd = await ethers.getContractFactory("BEP20");
  busd = await Busd.deploy('Binance USD', 'BUSD');
  await busd.deployed();

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

  tokenAddresses.addToken(tokenAddresses.GLOBAL(), nativeToken.address);
  tokenAddresses.addToken(tokenAddresses.CAKE(), cakeToken.address);
  tokenAddresses.addToken(tokenAddresses.BUSD(), busd.address);
});

describe("VaultCake: Withdraw", function () {
  it("Cannot withdraw without previous deposit", async function () {
    expect(await vaultCake.withdrawableBalanceOf(owner.address)).to.equal(0);
    await expect(
      vaultCake.connect(addr3).withdraw(BigNumber.from(0).mul(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER))
    ).to.be.revertedWith("Whitelist: caller is not on the whitelist");
  });

  it("Withdraw without fees", async function () {
    const depositAmount = BigNumber.from(5).mul(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER);
    const withdrawAmount = BigNumber.from(1).mul(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER);
    const expectedWithdraw = OWNER_INITIAL_CAKES.sub(depositAmount).add(withdrawAmount);

    // Needed to execute withdraw method.
    await vaultCake.setWhitelist(owner.address, true);

    await vaultCake.setWithdrawalFees(0, 0, 0);
    await cakeToken.approve(vaultCake.address, OWNER_INITIAL_CAKES);
    await vaultCake.deposit(depositAmount);

    expect(await vaultCake.withdrawableBalanceOf(owner.address)).to.equal(depositAmount);
    expect(await vaultCake.withdraw(withdrawAmount))
        .to.emit(vaultCake, 'Withdrawn')
        .withArgs(owner.address, withdrawAmount, 0);

    expect(await cakeToken.balanceOf(owner.address)).to.equal(expectedWithdraw);
  });

  it("Withdraw with fees but in whitelist do not pay withdraw fees", async function () {
    const depositAmount = BigNumber.from(5).mul(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER);
    const withdrawAmount = BigNumber.from(1).mul(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER);
    const expectedWithdraw = OWNER_INITIAL_CAKES.sub(depositAmount).add(withdrawAmount);
    const timestampIn3days = new Date().setTime(3 * 86400);

    // Needed to execute withdraw method.
    await vaultCake.setWhitelist(owner.address, true);

    await vaultCake.setWithdrawalFees(60, 40, timestampIn3days); // 0.6% and 0.4% = 1% in total
    await cakeToken.approve(vaultCake.address, OWNER_INITIAL_CAKES);
    await vaultCake.deposit(depositAmount);

    expect(await vaultCake.withdrawableBalanceOf(owner.address)).to.equal(depositAmount);
    expect(await vaultCake.withdraw(withdrawAmount))
        .to.emit(vaultCake, 'Withdrawn')
        .withArgs(owner.address, withdrawAmount, 0);

    expect(await cakeToken.balanceOf(owner.address)).to.equal(expectedWithdraw);
  });
});