const { expect } = require("chai");
const {
  deploy,
  getNativeToken,
  getBnb,
  getVaultVested,
  getGlobalMasterChef,
} = require("../../helpers/vaultVestedDeploy.js");

beforeEach(async function () {
  await deploy();

  // Set up scenarios
  await getNativeToken().transferOwnership(getGlobalMasterChef().address);
});

describe("VaultVested: After deployment", function () {
  it("Check Global pool id (pid)", async function () {
    expect(await getVaultVested().pid()).to.equal(0);
  });

  it("Check BNB as reward token", async function () {
    expect(await getVaultVested().rewardsToken()).to.equal(getBnb().address);
  });
});