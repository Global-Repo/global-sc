const { expect } = require("chai");
const {
  deploy,
  getNativeToken,
  getCakeToken,
  getGlobalMasterChef,
  getVaultCakeWBNBLP,
  getVaultCake,
  getLPToken,
} = require("../../helpers/vaultCakeWBNBLPDeploy.js");

beforeEach(async function () {
  await deploy();
  await getNativeToken().transferOwnership(getGlobalMasterChef().address);
});

describe("VaultCakeWBNBLP: After deployment", function () {
  it("Check Cake pool id (pid)", async function () {
    expect(await getVaultCakeWBNBLP().pid()).to.equal(0);
  });

  it("VCW-06 -- Wrong staking token information. should be CakeWBNBLP", async function () {
    expect(await getVaultCakeWBNBLP().stakingToken()).to.equal(getLPToken().address);
  });

  it("VCW-07 -- Wrong rewards token information. Should be cakeToken", async function () {
    expect(await getVaultCakeWBNBLP().rewardsToken()).to.equal(getVaultCake().address);
  });

  it("VCW-04 Missing access restriction Test. Only owner can set minter.", async function () {
    await getGlobalMasterChef().setMinter(getVaultCakeWBNBLP().address, true);
    await getVaultCakeWBNBLP().setMinter(getGlobalMasterChef().address);
    await expect (getVaultCakeWBNBLP().connect(user1).setMinter(getGlobalMasterChef().address))
        .to.be.revertedWith("Ownable: caller is not the owner");
  });
});