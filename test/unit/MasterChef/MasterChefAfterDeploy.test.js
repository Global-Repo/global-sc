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
let weth;
let masterChef;

beforeEach(async function () {
  [owner, addr1, addr2, ...addrs] = await ethers.getSigners();

  const CURRENT_BLOCK = await ethers.provider.getBlockNumber();
  startBlock = CURRENT_BLOCK + 1;

  const NativeToken = await ethers.getContractFactory("NativeToken");
  nativeToken = await NativeToken.deploy();
  await nativeToken.deployed();

  const TokenA = await ethers.getContractFactory("BEP20");
  tokenA = await TokenA.deploy('tokenA', 'AA');
  await tokenA.deployed();

  const TokenB = await ethers.getContractFactory("BEP20");
  tokenB = await TokenB.deploy('tokenB', 'BB');
  await tokenB.deployed();

  const Factory = await ethers.getContractFactory("Factory");
  factory = await Factory.deploy(owner.address);
  await factory.deployed();

  // TODO: should be same contract as mainet or BEP20 is okay?
  // TODO: https://bscscan.com/address/0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c#code
  const Weth = await ethers.getContractFactory("BEP20");
  weth = await Weth.deploy('Wrapped BNB', 'WBNB');
  await weth.deployed();

  const Router = await ethers.getContractFactory("Router");
  router = await Router.deploy(factory.address, weth.address);
  await router.deployed();

  const MasterChef = await ethers.getContractFactory("MasterChef");
  masterChef = await MasterChef.deploy(
      nativeToken.address,
      NATIVE_TOKEN_PER_BLOCK,
      startBlock,
      router.address
  );
  await masterChef.deployed();

  // Set up scenarios
  const INITIAL_SUPPLY = BigNumber.from(100).mul(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER);

  await tokenA.mint(INITIAL_SUPPLY);
  await tokenB.mint(INITIAL_SUPPLY);
  await tokenA.approve(router.address, INITIAL_SUPPLY.toHexString());
  await tokenB.approve(router.address, INITIAL_SUPPLY.toHexString());
});

describe("MasterChef: After deployment", function () {
  it("Should to have zero pools", async function () {
    expect(await masterChef.poolLength()).to.equal(0);
  });
});

describe("MasterChef: Pools", function () {
  it("Should to add a new liquidity provider (LP) pool", async function () {
    let date = new Date();
    const deadline = date.setTime(date.getTime() + 2 * 86400000); // +2 days

    await router.addLiquidity(
        tokenA.address,
        tokenB.address,
        BigNumber.from(10).mul(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER),
        BigNumber.from(10).mul(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER),
        BigNumber.from(1).mul(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER),
        BigNumber.from(1).mul(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER),
        owner.address,
        deadline
    );

    const pairAddress = await factory.getPair(tokenA.address, tokenB.address);

    await masterChef.addPool(
        BigNumber.from(40).mul(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER),
        pairAddress,
        DAY_IN_SECONDS * 3,
        false,
        50,
        50,
        DAY_IN_SECONDS * 3,
        5000,
        5000,
        5000,
        5000
    );

    const poolInfo = await masterChef.poolInfo(0);

    expect(await masterChef.poolLength()).to.equal(1);
    expect(poolInfo.lpToken).to.equal(pairAddress);
    expect(poolInfo.allocPoint).to.equal(BigNumber.from(40).mul(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER));
    //expect(poolInfo.lastRewardBlock).to.equal(startBlock); TODO: blocks issue, review for test it properly
    expect(poolInfo.accNativeTokenPerShare).to.equal(0);
    expect(poolInfo.withDrawalFeeOfLps).to.equal(50);
    expect(poolInfo.performanceFeesOfNativeTokens).to.equal(50);
    expect(poolInfo.harvestInterval).to.equal(259200);
    expect(poolInfo.maxWithdrawalInterval).to.equal(259200);
    expect(poolInfo.withDrawalFeeOfLpsBurn).to.equal(5000);
    expect(poolInfo.withDrawalFeeOfLpsTeam).to.equal(5000);
    expect(poolInfo.performanceFeesOfNativeTokensBurn).to.equal(5000);
    expect(poolInfo.performanceFeesOfNativeTokensToLockedVault).to.equal(5000);
  });

  xit("Should to update pool info properly", async function () {
    // Test set method
  });
});

describe("MasterChef: Multiplier", function () {
  xit("Should to return an expected multiplier for given blocks range", async function () {
    // Test getMultiplier
  });
});

describe("MasterChef: Deposit", function () {
  xit("As a user I should to deposit LP in a pool", async function () {
    // Test deposit
  });
});