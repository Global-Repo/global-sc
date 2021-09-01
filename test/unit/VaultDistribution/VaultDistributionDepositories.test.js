const { expect } = require("chai");
const { bep20Amount } = require("../../helpers/utils.js");
const {
  deploy,
  getBnb,
  getVaultDistribution,
} = require("../../helpers/vaultDistributionDeploy");

beforeEach(async function () {
  await deploy();
  const INITIAL_SUPPLY = bep20Amount(100);
  await getBnb().mint(INITIAL_SUPPLY);
});

describe("VaultDistribution: Depositories", function () {
  it("Only owner is able to change depositories", async function () {
    await expect(getVaultDistribution().connect(user1).setDepositary(depositary1.address, true))
        .to.be.revertedWith("Ownable: caller is not the owner");

    await getVaultDistribution().setDepositary(depositary1.address, true);
    await getVaultDistribution().setDepositary(depositary2.address, false);
  });

  it("Only depositories are able to deposit", async function () {
    const depositAmount = bep20Amount(5);

    await expect(getVaultDistribution().deposit(depositAmount))
        .to.be.revertedWith("Only depositories can perform this action");

    await getBnb().connect(owner).transfer(depositary1.address, depositAmount);
    await getBnb().connect(depositary1).approve(getVaultDistribution().address, depositAmount);
    await getVaultDistribution().setDepositary(depositary1.address, true);
    await getVaultDistribution().connect(depositary1).deposit(depositAmount);
  });
});