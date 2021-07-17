const ethers = require("hardhat").ethers;
const { expect } = require("chai");
const { BigNumber } = require("@ethersproject/bignumber");

const TOKEN_DECIMALS = 18;
const BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER = BigNumber.from(10).pow(TOKEN_DECIMALS);
const DUST = BigNumber.from(10000);

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

  // TODO: should be same contract as mainet or BEP20 is okay?
  // TODO: https://bscscan.com/address/0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c#code
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

describe("Remove liquidity", function () {
  it("Adds and removes same liquidity amount", async function () {
    let date = new Date();
    const timestamp = date.setTime(date.getTime() + 2 * 86400000); // +2 days

    // Add liquidity to the pair
    await router.connect(owner).addLiquidity(
        tokenA.address,
        tokenB.address,
        BigNumber.from(1).mul(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER),
        BigNumber.from(2).mul(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER),
        BigNumber.from(0).mul(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER),
        BigNumber.from(0).mul(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER),
        owner.address,
        timestamp
    );

    const pairAddress = await factory.getPair(tokenA.address, tokenB.address);
    const pairContract = await ethers.getContractFactory("Pair");
    const pair = await pairContract.attach(pairAddress);
    const liquidity = await pair.balanceOf(owner.address);

    await pair.approve(router.address, liquidity.toHexString());

    await router.connect(owner).removeLiquidity(
        tokenA.address,
        tokenB.address,
        liquidity.toString(),
        1,
        1,
        owner.address,
        timestamp
    );

    // Owner do not remains LP tokens
    expect(await pair.balanceOf(owner.address)).to.equal(0);

    const tokenABalanceInPair = await tokenA.balanceOf(pairAddress);
    const tokenBBalanceInPair = await tokenB.balanceOf(pairAddress);

    // Pair contract only remains residual tokenA and tokenB
    expect(tokenABalanceInPair.lt(DUST)).to.true;
    expect(tokenBBalanceInPair.lt(DUST)).to.true;
  });
});