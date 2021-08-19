const ethers = require("hardhat").ethers;
const { expect } = require("chai");
const {
  deploy,
  getVaultDistribution,
} = require("../../helpers/vaultDistributionDeploy");

let beneficiaryMock1;
let beneficiaryMock2;

beforeEach(async function () {
  await deploy();
  const BeneficiaryMock1 = await ethers.getContractFactory("BeneficiaryMock");
  beneficiaryMock1 = await BeneficiaryMock1.deploy();
  await beneficiaryMock1.deployed();
  const BeneficiaryMock2 = await ethers.getContractFactory("BeneficiaryMock");
  beneficiaryMock2 = await BeneficiaryMock2.deploy();
  await beneficiaryMock2.deployed();
});

describe("VaultDistribution: Beneficiaries", function () {
  it("Only devPower is able to add beneficiaries", async function () {
    await expect(getVaultDistribution().addBeneficiary(beneficiaryMock1.address))
        .to.be.revertedWith("DevPower: caller is not the dev with powers");

    await getVaultDistribution().connect(devPower).addBeneficiary(beneficiaryMock1.address);
    await getVaultDistribution().connect(devPower).addBeneficiary(beneficiaryMock2.address);

    expect(await getVaultDistribution().isBeneficiary(beneficiaryMock1.address)).to.true;
    expect(await getVaultDistribution().isBeneficiary(beneficiaryMock2.address)).to.true;
  });

  it("Only devPower is able to remove beneficiaries", async function () {
    await expect(getVaultDistribution().removeBeneficiary(beneficiaryMock1.address))
        .to.be.revertedWith("DevPower: caller is not the dev with powers");

    await getVaultDistribution().connect(devPower).removeBeneficiary(beneficiaryMock1.address);
    await getVaultDistribution().connect(devPower).removeBeneficiary(beneficiaryMock2.address);

    expect(await getVaultDistribution().isBeneficiary(beneficiaryMock1.address)).to.false;
    expect(await getVaultDistribution().isBeneficiary(beneficiaryMock2.address)).to.false;
  });

  it("Add and remove beneficiaries", async function () {
    await getVaultDistribution().connect(devPower).addBeneficiary(beneficiaryMock1.address);
    await getVaultDistribution().connect(devPower).addBeneficiary(beneficiaryMock2.address);

    expect(await getVaultDistribution().isBeneficiary(beneficiaryMock1.address)).to.true;
    expect(await getVaultDistribution().isBeneficiary(beneficiaryMock2.address)).to.true;

    await getVaultDistribution().connect(devPower).removeBeneficiary(beneficiaryMock1.address);

    expect(await getVaultDistribution().isBeneficiary(beneficiaryMock1.address)).to.false;
    expect(await getVaultDistribution().isBeneficiary(beneficiaryMock2.address)).to.true;
  });
});