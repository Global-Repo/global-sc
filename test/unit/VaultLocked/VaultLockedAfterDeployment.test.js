const { expect } = require("chai");
const {
  deploy,
  getNativeToken,
  getBnb,
  getGlobalMasterChefMock,
  getVaultLocked,
} = require("../../helpers/vaultLockedDeploy.js");

beforeEach(async function () {
  await deploy();
});

describe("VaultLocked: After deployment", function () {
  it("Check Global pool id (pid)", async function () {
    expect(await getVaultLocked().pid()).to.equal(3);
  });
});