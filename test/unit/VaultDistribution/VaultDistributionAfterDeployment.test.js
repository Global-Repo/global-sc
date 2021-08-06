const ethers = require("hardhat").ethers;
const { expect } = require("chai");
const { BigNumber } = require("@ethersproject/bignumber");

let weth;
let vaultDistribution;

beforeEach(async function () {
  [owner, devPower, beneficiary1, beneficiary2, ...addrs] = await ethers.getSigners();

  const Weth = await ethers.getContractFactory("BEP20");
  weth = await Weth.deploy('Wrapped BNB', 'WBNB');
  await weth.deployed();

  const VaultDistribution = await ethers.getContractFactory("VaultDistribution");
  vaultDistribution = await VaultDistribution.deploy(weth.address, devPower.address);
  await vaultDistribution.deployed();
});

describe("VaultDistribution: After deployment", function () {
  it("Check BNB is the distributed token", async function () {
    expect(await vaultDistribution.distributionToken()).to.equal(weth.address);
  });

  it("Only devPower is able to change beneficiaries", async function () {
    await expect(vaultDistribution.setBeneficiary(beneficiary1.address, 1000))
        .to.be.revertedWith("DevPower: caller is not the dev with powers");
  });

  it("---", async function () {
    vaultDistribution.connect(devPower).setBeneficiary(beneficiary1.address, 1000);
    vaultDistribution.connect(devPower).setBeneficiary(beneficiary2.address, 1000);
  });
});