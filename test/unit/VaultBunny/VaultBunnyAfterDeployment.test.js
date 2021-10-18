const ethers = require("hardhat").ethers;
const { expect } = require("chai");
const {
  deploy,
  getVaultBunny,
  getNativeToken,
  getBnb,
  getBunny,
  getVaultDistribution,
  getVaultVested,
  getGlobalMasterChef,
} = require("../../helpers/vaultBunnyDeploy.js");


beforeEach(async function () {
  await deploy();
  await getNativeToken().transferOwnership(getGlobalMasterChef().address);
});

describe("VaultBunny: After deployment", function () {
  it("VBV-09 Staking token is cake", async function () {
    expect(await getVaultBunny().stakingToken()).to.equal(getBunny().address);
  });

  it("VBV-10 Rewards token should be Wnbn", async function () {
    expect(await getVaultBunny().rewardsToken()).to.equal(getBnb().address);
  });

  it("VBV-02 Missing access restriction. ", async function () {
    await getGlobalMasterChef().setMinter(getVaultBunny().address, true);
    await getVaultBunny().setMinter(getGlobalMasterChef().address);
    await expect(getVaultBunny().connect(user1).setMinter(getGlobalMasterChef().address))
        .to.be.revertedWith("Ownable: caller is not the owner");
  });
});

