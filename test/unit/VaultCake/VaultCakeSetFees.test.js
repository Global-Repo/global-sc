const ethers = require("hardhat").ethers;
const { expect } = require("chai");
const { BigNumber } = require("@ethersproject/bignumber");

const TOKEN_DECIMALS = 18;
const BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER = BigNumber.from(10).pow(TOKEN_DECIMALS);
const NATIVE_TOKEN_PER_BLOCK = BigNumber.from(40).mul(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER);
const DEFAULT_WITHDRAWAL_FEES_BURN = 60;
const DEFAULT_WITHDRAWAL_FEES_TEAM = 10;
const DEFAULT_REWARDS_FEES_TO_USER = 7500;
const DEFAULT_REWARDS_FEES_TO_OPERATIONS = 400;
const DEFAULT_REWARDS_FEES_TO_BUY_GLOBAL = 600;
const DEFAULT_REWARDS_FEES_TO_BUY_BNB = 1500;
const DEFAULT_REWARDS_FEES_TO_MINT_GLOBAL = 25000;

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

  const PathHelper = await ethers.getContractFactory("PathHelper");
  pathHelper = await PathHelper.deploy(tokenAddresses.address);
  await pathHelper.deployed();

  const Minter = await ethers.getContractFactory("MasterChef");
  minter = await Minter.deploy(
      nativeToken.address,
      NATIVE_TOKEN_PER_BLOCK,
      startBlock,
      keeper.address,
      router.address,
      tokenAddresses.address,
      pathHelper.address
  );
  await minter.deployed();
  await pathHelper.transferOwnership(minter.address);

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
      pathHelper.address,
      keeper.address
  );
  await vaultCake.deployed();

  // Set up scenarios
  await nativeToken.transferOwnership(minter.address);
});

describe("VaultCake: Fees", function () {
  it("Default withdrawal fees are properly configured", async function () {
    const timestamp4days = new Date().setTime(4 * 86400); // +4 days

    const {0: burn, 1: team, 2: interval} = await vaultCake.withdrawalFees();

    expect(burn).to.equal(DEFAULT_WITHDRAWAL_FEES_BURN);
    expect(team).to.equal(DEFAULT_WITHDRAWAL_FEES_TEAM);
    expect(interval.toHexString()).to.equal(BigNumber.from(timestamp4days));
  });

  it("Change withdrawal fees", async function () {
    const timestamp3days = new Date().setTime(3 * 86400); // +3 days
    const withdrawalFeesBurn = 70;
    const withdrawalFeesTeam = 20;

    await vaultCake.setWithdrawalFees(withdrawalFeesBurn, withdrawalFeesTeam, timestamp3days);

    const {0: burn, 1: team, 2: interval} = await vaultCake.withdrawalFees();

    expect(burn).to.equal(withdrawalFeesBurn);
    expect(team).to.equal(withdrawalFeesTeam);
    expect(interval.toHexString()).to.equal(BigNumber.from(timestamp3days));
  });

  it("Withdrawal fees cannot to be higher than maximum withdrawal fees", async function () {
    const timestamp3days = new Date().setTime(3 * 86400); // +3 days
    const withdrawalFeesBurn = 70;
    const withdrawalFeesTeam = 40;

    await expect(
      vaultCake.setWithdrawalFees(withdrawalFeesBurn, withdrawalFeesTeam, timestamp3days)
    ).to.be.revertedWith("Withdrawal fees too high");
  });

  it("Only owner can change withdrawal fees", async function () {
    const timestamp3days = new Date().setTime(3 * 86400); // +3 days
    const withdrawalFeesBurn = 70;
    const withdrawalFeesTeam = 20;

    await expect(
        vaultCake.connect(addr3).setWithdrawalFees(withdrawalFeesBurn, withdrawalFeesTeam, timestamp3days)
    ).to.be.revertedWith("Ownable: caller is not the owner");
  });

  it("Default rewards fees are properly configured", async function () {
    const {0: toUser, 1: toOperations, 2: toBuyGlobal, 3: toBuyBNB, 4: toMintGlobal} = await vaultCake.rewards();

    expect(toUser).to.equal(DEFAULT_REWARDS_FEES_TO_USER);
    expect(toOperations).to.equal(DEFAULT_REWARDS_FEES_TO_OPERATIONS);
    expect(toBuyGlobal).to.equal(DEFAULT_REWARDS_FEES_TO_BUY_GLOBAL);
    expect(toBuyBNB).to.equal(DEFAULT_REWARDS_FEES_TO_BUY_BNB);
    expect(toMintGlobal).to.equal(DEFAULT_REWARDS_FEES_TO_MINT_GLOBAL);
  });

  it("Change rewards fees", async function () {
    const rewardsToUser = 8000;
    const rewardsToOperations = 500;
    const rewardsToBuyGlobal = 500;
    const rewardsToBuyBNB = 1000;
    const rewardsToMintGlobal = 20000;

    await vaultCake.setRewards(rewardsToUser, rewardsToOperations, rewardsToBuyGlobal, rewardsToBuyBNB, rewardsToMintGlobal);

    const {0: toUser, 1: toOperations, 2: toBuyGlobal, 3: toBuyBNB, 4: toMintGlobal} = await vaultCake.rewards();

    expect(toUser).to.equal(rewardsToUser);
    expect(toOperations).to.equal(rewardsToOperations);
    expect(toBuyGlobal).to.equal(rewardsToBuyGlobal);
    expect(toBuyBNB).to.equal(rewardsToBuyBNB);
    expect(toMintGlobal).to.equal(rewardsToMintGlobal);
  });

  it("Rewards fees must add up to 100%", async function () {
    const rewardsToUser = 8001;
    const rewardsToOperations = 500;
    const rewardsToBuyGlobal = 500;
    const rewardsToBuyBNB = 1000;
    const rewardsToMintGlobal = 20000;

    await expect(
        vaultCake.setRewards(rewardsToUser, rewardsToOperations, rewardsToBuyGlobal, rewardsToBuyBNB, rewardsToMintGlobal)
    ).to.be.revertedWith("Rewards must add up to 100%");
  });

  it("Only owner can change rewards fees", async function () {
    const rewardsToUser = 8001;
    const rewardsToOperations = 500;
    const rewardsToBuyGlobal = 500;
    const rewardsToBuyBNB = 1000;
    const rewardsToMintGlobal = 20000;

    await expect(
        vaultCake.connect(addr3).setRewards(rewardsToUser, rewardsToOperations, rewardsToBuyGlobal, rewardsToBuyBNB, rewardsToMintGlobal)
    ).to.be.revertedWith("Ownable: caller is not the owner");
  });
});