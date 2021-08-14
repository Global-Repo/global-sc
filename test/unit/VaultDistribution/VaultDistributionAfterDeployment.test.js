const ethers = require("hardhat").ethers;
const { expect } = require("chai");

let wbnb;
let global;
let vaultDistribution;

beforeEach(async function () {
  [owner, devPower, ...addrs] = await ethers.getSigners();

  const Wbnb = await ethers.getContractFactory("BEP20");
  wbnb = await Wbnb.deploy('Wrapped BNB', 'WBNB');
  await wbnb.deployed();

  const Global = await ethers.getContractFactory("BEP20");
  global = await Global.deploy('Wrapped BNB', 'WBNB');
  await global.deployed();

  const VaultDistribution = await ethers.getContractFactory("VaultDistribution");
  vaultDistribution = await VaultDistribution.deploy(wbnb.address, global.address, devPower.address);
  await vaultDistribution.deployed();
});

describe("VaultDistribution: After deployment", function () {
  it("Check BNB is the distribution token", async function () {
    expect(await vaultDistribution.distributionToken()).to.equal(wbnb.address);
  });

  it("Check Global is the beneficiary token keeper", async function () {
    expect(await vaultDistribution.beneficiaryToken()).to.equal(global.address);
  });
});