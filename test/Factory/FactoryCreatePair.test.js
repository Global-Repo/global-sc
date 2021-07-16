const ethers = require("hardhat").ethers;
const { expect } = require("chai");
const { BigNumber } = require("@ethersproject/bignumber");

const TOKEN_DECIMALS = 18;
const BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER = BigNumber.from(10).pow(TOKEN_DECIMALS);

let factory;
let tokenA;
let tokenB;

beforeEach(async function () {
  [owner, addr1, addr2, ...addrs] = await ethers.getSigners();

  const Factory = await ethers.getContractFactory("Factory");
  factory = await Factory.deploy(owner.address);
  await factory.deployed();

  const TokenA = await ethers.getContractFactory("BEP20");
  tokenA = await TokenA.deploy('tokenA', 'AA');
  await tokenA.deployed();

  const TokenB = await ethers.getContractFactory("BEP20");
  tokenB = await TokenB.deploy('tokenB', 'BB');
  await tokenB.deployed();

  // Set up scenarios
  const INITIAL_SUPPLY = BigNumber.from(100).mul(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER);

  expect(await tokenA.totalSupply()).to.equal(0);
  expect(await tokenB.totalSupply()).to.equal(0);

  await tokenA.mint(INITIAL_SUPPLY);
  expect(await tokenA.totalSupply()).to.equal(INITIAL_SUPPLY);

  await tokenB.mint(INITIAL_SUPPLY);
  expect(await tokenB.totalSupply()).to.equal(INITIAL_SUPPLY);
});

describe("Factory: Create pair", function () {
  it("Cannot create pair with same tokens", async function () {
    await expect(
        factory.createPair(tokenA.address, tokenA.address)
    ).to.be.revertedWith("IDENTICAL_ADDRESSES");
  });

  it("Cannot create same pair twice", async function () {
    await factory.createPair(tokenA.address, tokenB.address);

    await expect(
        factory.createPair(tokenA.address, tokenB.address)
    ).to.be.revertedWith("PAIR_EXISTS");
  });

  it("Creates pair successfully and triggers an event", async function () {
    await expect(
        factory.createPair(tokenA.address, tokenB.address)
    ).to.emit(factory, 'PairCreated');
    // TODO: //.withArgs(tokenA.address, tokenB.address, await factory.getPair(tokenA.address, tokenB.address), 1);

    expect(await factory.allPairsLength()).to.equal(1);
  });

  it("Pairs order does not matter", async function () {
    const pair = await factory.createPair(tokenA.address, tokenB.address);

    await expect(
        factory.createPair(tokenB.address, tokenA.address)
    ).to.be.revertedWith("PAIR_EXISTS");

    const addressAB = await factory.getPair(tokenA.address, tokenB.address);
    const addressBA = await factory.getPair(tokenB.address, tokenA.address);

    expect(addressAB).to.equal(addressBA);
  });
});