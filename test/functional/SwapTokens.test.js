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

describe("Swap tokens", function () {
  it("Cannot swap tokens if there are not liquidity enough", async function () {
    let date = new Date();
    const timestamp = date.setTime(date.getTime() + 2 * 86400000); // +2 days

    await expect(
        router.swapExactTokensForTokens(
          BigNumber.from(1).mul(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER),
          BigNumber.from(2).mul(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER),
          [tokenA.address, tokenB.address],
          owner.address,
          timestamp
        )
    ).to.be.reverted;
  });

  it("Swap tokens", async function () {
    let date = new Date();
    const timestamp = date.setTime(date.getTime() + 2 * 86400000); // +2 days

    await factory.setSwapFee(0);

    await router.addLiquidity(
        tokenA.address,
        tokenB.address,
        BigNumber.from(10).mul(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER),
        BigNumber.from(10).mul(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER),
        BigNumber.from(0).mul(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER),
        BigNumber.from(0).mul(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER),
        owner.address,
        timestamp
    );

    const f = await tokenA.balanceOf(owner.address);
    const g = await tokenB.balanceOf(owner.address);
    console.log(f.toString());
    console.log(g.toString());

    // Remaining 100 - 10 added as liquidity = 90 tokenA
    expect(await tokenA.balanceOf(owner.address)).to.equal(BigNumber.from(90).mul(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER));

    // Remaining 100 - 10 added as liquidity = 90 tokenB
    expect(await tokenB.balanceOf(owner.address)).to.equal(BigNumber.from(90).mul(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER));

    await router.swapExactTokensForTokens(
        BigNumber.from(5).mul(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER),
        BigNumber.from(1).mul(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER),
        [tokenA.address, tokenB.address],
        owner.address,
        timestamp
    );

    const a = await tokenA.balanceOf(owner.address);
    const b = await tokenB.balanceOf(owner.address);
    console.log(a.toString());
    console.log(b.toString());

    expect(await tokenA.balanceOf(owner.address)).to.equal(BigNumber.from(85).mul(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER));
    // TODO: expect token B amount

    await router.swapExactTokensForTokens(
        BigNumber.from(5).mul(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER),
        BigNumber.from(1).mul(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER),
        [tokenA.address, tokenB.address],
        owner.address,
        timestamp
    );

    expect(await tokenA.balanceOf(owner.address)).to.equal(BigNumber.from(80).mul(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER));
    // TODO: expect token B amount

    const c = await tokenA.balanceOf(owner.address);
    const d = await tokenB.balanceOf(owner.address);
    console.log(c.toString());
    console.log(d.toString());
  });
});