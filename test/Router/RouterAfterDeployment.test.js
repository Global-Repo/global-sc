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

describe("Router: Add liquidity", function () {
  it("Add liquidity for token A and token B", async function () {
    let date = new Date();
    const timestamp = date.setTime(date.getTime() + 2 * 86400000); // +2 days

    // Create pair -> not needed
    await factory.createPair(tokenA.address, tokenB.address);

    // Add liquidity to the pair
    await router.connect(owner).addLiquidity(
        tokenA.address,
        tokenB.address,
        BigNumber.from(1).mul(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER),
        BigNumber.from(2).mul(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER),
        BigNumber.from(1).mul(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER),
        BigNumber.from(2).mul(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER),
        addr1.address,
        timestamp
    );

    // Check liquidity added
    const pairAddress = await factory.getPair(tokenA.address, tokenB.address);

    expect(await tokenA.balanceOf(pairAddress)).to.equal(BigNumber.from(1).mul(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER));
    expect(await tokenB.balanceOf(pairAddress)).to.equal(BigNumber.from(2).mul(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER));

    // TODO: check LP tokens back to the owner
    //const balanceLP = await pairAddress.balanceOf(owner.address);
  });
});