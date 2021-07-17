const ethers = require("hardhat").ethers;
const { expect } = require("chai");
const { BigNumber } = require("@ethersproject/bignumber");

const TOKEN_DECIMALS = 18;
const BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER = BigNumber.from(10).pow(TOKEN_DECIMALS);
const NATIVE_TOKEN_PER_BLOCK = BigNumber.from(40).mul(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER);
const DAY_IN_SECONDS = 86400;

let startBlock = null;

let nativeToken;
let masterChef;

beforeEach(async function () {
  [owner, addr1, addr2, ...addrs] = await ethers.getSigners();

  const CURRENT_BLOCK = await ethers.provider.getBlockNumber();
  startBlock = CURRENT_BLOCK + 1;

  const NativeToken = await ethers.getContractFactory("NativeToken");
  nativeToken = await NativeToken.deploy();
  await nativeToken.deployed();

  const MasterChef = await ethers.getContractFactory("MasterChef");
  masterChef = await MasterChef.deploy(
      nativeToken.address,
      NATIVE_TOKEN_PER_BLOCK,
      startBlock,
      "0xae1671Faa94A7Cc296D3cb0c3619e35600de384C" // TODO: Router Global
  );
  await masterChef.deployed();
});

describe("MasterChef: After deployment", function () {
  it("Should to have zero pools", async function () {
    expect(await masterChef.poolLength()).to.equal(0);
  });
});

describe("MasterChef: Pools", function () {
  it("Should to add a new liquidity provider (LP) pool", async function () {
    await masterChef.add(
      BigNumber.from(40).mul(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER),
      "0xae1671Faa94A7Cc296D3cb0c3619e35600de384C", // TODO: LP Token
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

    expect(await masterChef.poolLength()).to.equal(1);

    const poolInfo = await masterChef.poolInfo(0);

    expect(poolInfo.lpToken).to.equal("0xae1671Faa94A7Cc296D3cb0c3619e35600de384C");
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