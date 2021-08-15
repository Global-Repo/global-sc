const { expect } = require("chai");
const {
  deploy,
  getNativeToken,
  getBnb,
  getVaultDistribution,
} = require("../../helpers/vaultDistributionDeploy");

beforeEach(async function () {
  await deploy();
});

describe("VaultDistribution: After deployment", function () {
  it("Check BNB is the distribution token", async function () {
    expect(await getVaultDistribution().distributionToken()).to.equal(getBnb().address);
  });

  it("Check Global is the beneficiary token keeper", async function () {
    expect(await getVaultDistribution().beneficiaryToken()).to.equal(getNativeToken().address);
  });
});