const { expect } = require("chai");
const {
  deploy,
  getNativeToken,
  getBnb,
  getMinter,
  getRouterMock,
  getVaultDistribution,
  getVaultVested,
} = require("../../helpers/vaultVestedDeploy.js");

beforeEach(async function () {
  await deploy();

  // Set up scenarios
  await getNativeToken().transferOwnership(getMinter().address);
});

describe("VaultVested: After deployment", function () {
  it("Check Global pool id (pid)", async function () {
    expect(await getVaultVested().pid()).to.equal(0);
  });
});