const ethers = require("hardhat").ethers;
const { expect } = require("chai");
const { BigNumber } = require("@ethersproject/bignumber");

const TOKEN_DECIMALS = 18;
const BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER = BigNumber.from(10).pow(TOKEN_DECIMALS);
const NATIVE_TOKEN_PER_BLOCK = BigNumber.from(40).mul(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER);


let tokenAddresses;

beforeEach(async function () {
  [owner, busd, other, ...addrs] = await ethers.getSigners();

  const TokenAddresses = await ethers.getContractFactory("TokenAddresses");
  tokenAddresses = await TokenAddresses.deploy();
  await tokenAddresses.deployed();
});

describe("TokenAddresses: ", function () {
  it("Adds new tokens", async function () {
    await tokenAddresses.addToken("BUSD", busd.address);
    await tokenAddresses.addToken("OTHER", other.address);

    expect(await tokenAddresses.findByName("BUSD")).to.equal(busd.address);
    expect(await tokenAddresses.findByName("OTHER")).to.equal(other.address);
  });

  it("Cannot add duplicated tokens", async function () {
    await tokenAddresses.addToken("BUSD", busd.address);
    await expect(tokenAddresses.addToken("BUSD", busd.address)).to.be.revertedWith("Token already exists.");
  });

  it("Token not found", async function () {
    await expect(tokenAddresses.findByName("BUSD")).to.be.revertedWith("Token does not exists.");
  });

  it("TAH-01 Cannot add tokens without being owner", async function () {
    await expect(tokenAddresses.connect(other).addToken("BUSD", busd.address)).to.be.revertedWith("Ownable: caller is not the owner");
  });
});