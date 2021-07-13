const ethers = require("hardhat").ethers;
const { expect } = require("chai");
const { BigNumber } = require("@ethersproject/bignumber");

const TOKEN_DECIMALS = 18;
const BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER = BigNumber.from(10).pow(TOKEN_DECIMALS);
const TOKEN_SUPPLY = BigNumber.from(1000).mul(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER);
const MAX_ANTIWHALE = 15 * 100;

let deployedToken;

beforeEach(async function () {
  [owner, addr1, addr2, ...addrs] = await ethers.getSigners();
  nativeToken = await ethers.getContractFactory("NativeToken", owner);
  deployedToken = await nativeToken.deploy();
});

describe("NativeToken: After deployment", function () {
  it("Should to set the right owner", async function () {
    expect(await deployedToken.owner()).to.equal(owner.address);
  });

  it("Should to assign the total supply of tokens to the owner", async function () {
    const ownerBalance = await deployedToken.balanceOf(owner.address);
    expect(await deployedToken.totalSupply()).to.equal(ownerBalance);
  });

  it("Should to have 0 tokens of supply", async function () {
    expect(await deployedToken.totalSupply()).to.equal(0);
  });

  it("Should to exclude from antiwhale the owner, token, burn address and zero address", async function () {
    expect(await deployedToken.GetIfExcludedFromAntiWhale(owner.address)).to.true;
    expect(await deployedToken.GetIfExcludedFromAntiWhale(deployedToken.address)).to.true;
    expect(await deployedToken.GetIfExcludedFromAntiWhale("0x000000000000000000000000000000000000dEaD")).to.true;
    expect(await deployedToken.GetIfExcludedFromAntiWhale("0x0000000000000000000000000000000000000000")).to.true;
  });
});