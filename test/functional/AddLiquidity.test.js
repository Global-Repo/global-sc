const ethers = require("hardhat").ethers;
const { expect } = require("chai");
const { BigNumber } = require("@ethersproject/bignumber");

const TOKEN_DECIMALS = 18;
const BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER = BigNumber.from(10).pow(TOKEN_DECIMALS);

let factory;
let weth;
let router;
let tokenA;
let tokenB;

beforeEach(async function () {
  [owner, addr1, addr2, ...addrs] = await ethers.getSigners();

  const Factory = await ethers.getContractFactory("Factory");
  factory = await Factory.deploy(owner.address);
  await factory.deployed();

  const Weth = await ethers.getContractFactory("BEP20");
  weth = await Weth.deploy('Wrapped BNB', 'WBNB');
  await weth.deployed();

  const Router = await ethers.getContractFactory("Router");
  router = await Router.deploy(factory.address, weth.address);
  await router.deployed();

  const TokenA = await ethers.getContractFactory("BEP20");
  tokenA = await TokenA.deploy('tokenA', 'AA');
  await tokenA.deployed();

  const TokenB = await ethers.getContractFactory("BEP20");
  tokenB = await TokenB.deploy('tokenB', 'BB');
  await tokenB.deployed();

  // Set up scenarios
  const INITIAL_SUPPLY = BigNumber.from(100).mul(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER);

  await weth.mint(INITIAL_SUPPLY);
  await tokenA.mint(INITIAL_SUPPLY);
  await tokenB.mint(INITIAL_SUPPLY);

  // Approve
  await tokenA.approve(router.address, INITIAL_SUPPLY.toHexString());
  await tokenB.approve(router.address, INITIAL_SUPPLY.toHexString());
  await weth.approve(router.address, INITIAL_SUPPLY.toHexString());
});

describe("Add liquidity", function () {
  it("Add first time liquidity for token A and token B", async function () {
    let date = new Date();
    const deadline = date.setTime(date.getTime() + 2 * 86400000); // +2 days

    // Add liquidity to the pair
    await router.connect(owner).addLiquidity(
        tokenA.address,
        tokenB.address,
        BigNumber.from(1).mul(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER),
        BigNumber.from(2).mul(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER),
        BigNumber.from(1).mul(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER),
        BigNumber.from(2).mul(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER),
        owner.address,
        deadline
    );

    // Check liquidity added:
    const pairAddress = await factory.getPair(tokenA.address, tokenB.address);

    // Pair contract have both tokens
    expect(await tokenA.balanceOf(pairAddress)).to.equal(BigNumber.from(1).mul(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER));
    expect(await tokenB.balanceOf(pairAddress)).to.equal(BigNumber.from(2).mul(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER));

    // Owner has LP pair tokens back
    const pairContract = await ethers.getContractFactory("Pair");
    const pair = await pairContract.attach(pairAddress);
    const balance = await pair.balanceOf(owner.address);

    expect(balance.toString()).to.not.equal(0);
  });

  it("Add liquidity twice", async function () {
    let date = new Date();
    const timestamp = date.setTime(date.getTime() + 2 * 86400000); // +2 days

    await router.connect(owner).addLiquidity(
        tokenA.address,
        tokenB.address,
        BigNumber.from(1).mul(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER),
        BigNumber.from(2).mul(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER),
        BigNumber.from(1).mul(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER),
        BigNumber.from(2).mul(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER),
        owner.address,
        timestamp
    );

    const pairAddress = await factory.getPair(tokenA.address, tokenB.address);
    const pairContract = await ethers.getContractFactory("Pair");
    const pair = await pairContract.attach(pairAddress);
    const firstTimeBalance = await pair.balanceOf(owner.address);

    await router.connect(owner).addLiquidity(
        tokenA.address,
        tokenB.address,
        BigNumber.from(1).mul(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER),
        BigNumber.from(2).mul(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER),
        BigNumber.from(1).mul(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER),
        BigNumber.from(2).mul(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER),
        owner.address,
        timestamp
    );

    // Pair contract have both tokens
    expect(await tokenA.balanceOf(pairAddress)).to.equal(BigNumber.from(2).mul(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER));
    expect(await tokenB.balanceOf(pairAddress)).to.equal(BigNumber.from(4).mul(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER));

    // Owner has LP pair tokens back
    const secondTimeBalance = await pair.balanceOf(owner.address);
    expect(secondTimeBalance.gt(firstTimeBalance)).to.true;
  });
});