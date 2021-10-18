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
  it("Only owner is able to add beneficiaries", async function () {
    await expect(getVaultDistribution().connect(user1).addBeneficiary(beneficiaryMock1.address))
        .to.be.revertedWith("Ownable: caller is not the owner");

    await getVaultDistribution().addBeneficiary(beneficiaryMock1.address);
    await getVaultDistribution().addBeneficiary(beneficiaryMock2.address);

    expect(await getVaultDistribution().isBeneficiary(beneficiaryMock1.address)).to.true;
    expect(await getVaultDistribution().isBeneficiary(beneficiaryMock2.address)).to.true;
  });

  it("Only owner is able to remove beneficiaries", async function () {
    await expect(getVaultDistribution().connect(user1).removeBeneficiary(beneficiaryMock1.address))
        .to.be.revertedWith("Ownable: caller is not the owner");

    await getVaultDistribution().removeBeneficiary(beneficiaryMock1.address);
    await getVaultDistribution().removeBeneficiary(beneficiaryMock2.address);

    expect(await getVaultDistribution().isBeneficiary(beneficiaryMock1.address)).to.false;
    expect(await getVaultDistribution().isBeneficiary(beneficiaryMock2.address)).to.false;
  });

  it("VDV-02 Add and remove beneficiaries", async function () {
    expect(await getVaultDistribution().getBeneficiariesLength()).to.equal(0);

    await getVaultDistribution().addBeneficiary(beneficiaryMock1.address);
    await getVaultDistribution().addBeneficiary(beneficiaryMock2.address);

    expect(await getVaultDistribution().getBeneficiariesLength()).to.equal(2);

    expect(await getVaultDistribution().isBeneficiary(beneficiaryMock1.address)).to.true;
    expect(await getVaultDistribution().isBeneficiary(beneficiaryMock2.address)).to.true;

    await getVaultDistribution().removeBeneficiary(beneficiaryMock1.address);

    expect(await getVaultDistribution().getBeneficiariesLength()).to.equal(1);

    expect(await getVaultDistribution().isBeneficiary(beneficiaryMock1.address)).to.false;
    expect(await getVaultDistribution().isBeneficiary(beneficiaryMock2.address)).to.true;
  });
});