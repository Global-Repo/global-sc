const ethers = require("hardhat").ethers;
const { expect } = require("chai");
const { BigNumber } = require("@ethersproject/bignumber");
const {
  deployToken,
  deployGlobal,
  deploySmartChefFactory,
} = require("../../helpers/singleDeploys.js");

const TOKEN_DECIMALS = 18;
const BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER = BigNumber.from(10).pow(TOKEN_DECIMALS);

let startBlock = null;

let nativeToken;
let tokenA;
let tokenB;
let smartChefFactory;

beforeEach(async function () {
  [owner, addr1, lockedVault, ...addrs] = await ethers.getSigners();

  const CURRENT_BLOCK = await ethers.provider.getBlockNumber();
  startBlock = CURRENT_BLOCK + 1;

  nativeToken = await deployGlobal();
  tokenA = await deployToken("Token A", "A");
  tokenB = await deployToken("Token B", "B");
  const INITIAL_SUPPLY = BigNumber.from(1000000).mul(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER);

  await tokenA.mint(INITIAL_SUPPLY);
  await nativeToken.mint(INITIAL_SUPPLY);

  smartChefFactory = await deploySmartChefFactory();
});

describe("SmartChefFactory: After deployment", function () {
  it("Should deploy 1 pool", async function () {
    const startBlock = await ethers.provider.getBlockNumber();
    const endBlock = await ethers.provider.getBlockNumber() + 100;

    expect(smartChefFactory.deployPool(
        nativeToken.address,
        tokenA.address,
        BigNumber.from(10).mul(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER),
        startBlock,
        endBlock,
        BigNumber.from(1000).mul(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER),
        owner.address
    )).to.emit("NewSmartChefContract");
  });

  it("SCC-01 - Bonus end block must be bigger than start block", async function () {
    const startBlock = await ethers.provider.getBlockNumber()+100;
    const endBlock = await ethers.provider.getBlockNumber();

    expect(smartChefFactory.deployPool(
        nativeToken.address,
        tokenB.address,
        BigNumber.from(10).mul(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER),
        startBlock,
        endBlock,
        BigNumber.from(1000).mul(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER),
        owner.address
    )).to.be.revertedWith("Start block must be before than bonus end block");
  });

  it("SCC-03 Stop reward input validation", async function () {
    const startBlock = await ethers.provider.getBlockNumber();
    const endBlock = await ethers.provider.getBlockNumber() + 100;

    const tx = await smartChefFactory.deployPool(
        nativeToken.address,
        tokenA.address,
        BigNumber.from(10).mul(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER),
        startBlock,
        endBlock,
        BigNumber.from(1000).mul(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER),
        owner.address
    );

    const result = await tx.wait();
    const smartChefAddress = result.events[2].args[0];

    const smartChefContract = await ethers.getContractFactory("SmartChef");
    const smartChef = await smartChefContract.attach(smartChefAddress);
    expect(smartChef.stopReward()).to.be.revertedWith("Can't be stopped");
  });

  xit("SCC-04 - GetMultiplier rewards test", async function () {
    //Note to test this function should we interact directly with the _getMultiplier funciton by changing its
    //visibility to public and checking it from there?
  });



});