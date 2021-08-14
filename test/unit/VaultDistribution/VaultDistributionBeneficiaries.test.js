const ethers = require("hardhat").ethers;
const { expect } = require("chai");

let wbnb;
let global;
let vaultDistribution;

beforeEach(async function () {
  [owner, devPower, beneficiary1, beneficiary2, ...addrs] = await ethers.getSigners();

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

describe("VaultDistribution: Beneficiaries", function () {
  it("Only devPower is able to add beneficiaries", async function () {
    await expect(vaultDistribution.addBeneficiary(beneficiary1.address))
        .to.be.revertedWith("DevPower: caller is not the dev with powers");

    await vaultDistribution.connect(devPower).addBeneficiary(beneficiary1.address);
    await vaultDistribution.connect(devPower).addBeneficiary(beneficiary2.address);

    expect(await vaultDistribution.isBeneficiary(beneficiary1.address)).to.true;
    expect(await vaultDistribution.isBeneficiary(beneficiary2.address)).to.true;
  });

  it("Only devPower is able to remove beneficiaries", async function () {
    await expect(vaultDistribution.removeBeneficiary(beneficiary1.address))
        .to.be.revertedWith("DevPower: caller is not the dev with powers");

    await vaultDistribution.connect(devPower).removeBeneficiary(beneficiary1.address);
    await vaultDistribution.connect(devPower).removeBeneficiary(beneficiary2.address);

    expect(await vaultDistribution.isBeneficiary(beneficiary1.address)).to.false;
    expect(await vaultDistribution.isBeneficiary(beneficiary2.address)).to.false;
  });

  it("Add and remove beneficiaries", async function () {
    await vaultDistribution.connect(devPower).addBeneficiary(beneficiary1.address);
    await vaultDistribution.connect(devPower).addBeneficiary(beneficiary2.address);

    expect(await vaultDistribution.isBeneficiary(beneficiary1.address)).to.true;
    expect(await vaultDistribution.isBeneficiary(beneficiary2.address)).to.true;

    await vaultDistribution.connect(devPower).removeBeneficiary(beneficiary1.address);

    expect(await vaultDistribution.isBeneficiary(beneficiary1.address)).to.false;
    expect(await vaultDistribution.isBeneficiary(beneficiary2.address)).to.true;
  });
});