const { expect } = require("chai");
const {
  deploy,
  getVaultDistribution,
} = require("../../helpers/vaultDistributionDeploy");

beforeEach(async function () {
  await deploy();
});

describe("VaultDistribution: Beneficiaries", function () {
  it("Only devPower is able to add beneficiaries", async function () {
    await expect(getVaultDistribution().addBeneficiary(beneficiary1.address))
        .to.be.revertedWith("DevPower: caller is not the dev with powers");

    await getVaultDistribution().connect(devPower).addBeneficiary(beneficiary1.address);
    await getVaultDistribution().connect(devPower).addBeneficiary(beneficiary2.address);

    expect(await getVaultDistribution().isBeneficiary(beneficiary1.address)).to.true;
    expect(await getVaultDistribution().isBeneficiary(beneficiary2.address)).to.true;
  });

  it("Only devPower is able to remove beneficiaries", async function () {
    await expect(getVaultDistribution().removeBeneficiary(beneficiary1.address))
        .to.be.revertedWith("DevPower: caller is not the dev with powers");

    await getVaultDistribution().connect(devPower).removeBeneficiary(beneficiary1.address);
    await getVaultDistribution().connect(devPower).removeBeneficiary(beneficiary2.address);

    expect(await getVaultDistribution().isBeneficiary(beneficiary1.address)).to.false;
    expect(await getVaultDistribution().isBeneficiary(beneficiary2.address)).to.false;
  });

  it("Add and remove beneficiaries", async function () {
    await getVaultDistribution().connect(devPower).addBeneficiary(beneficiary1.address);
    await getVaultDistribution().connect(devPower).addBeneficiary(beneficiary2.address);

    expect(await getVaultDistribution().isBeneficiary(beneficiary1.address)).to.true;
    expect(await getVaultDistribution().isBeneficiary(beneficiary2.address)).to.true;

    await getVaultDistribution().connect(devPower).removeBeneficiary(beneficiary1.address);

    expect(await getVaultDistribution().isBeneficiary(beneficiary1.address)).to.false;
    expect(await getVaultDistribution().isBeneficiary(beneficiary2.address)).to.true;
  });
});