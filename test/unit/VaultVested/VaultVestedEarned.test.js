const { expect } = require("chai");
const { bep20Amount, timestampNDays } = require("../../helpers/utils.js");
const {
  deploy,
  getNativeToken,
  getBnb,
  getVaultVested,
  getGlobalMasterChef,
} = require("../../helpers/vaultVestedDeploy.js");
const INITIAL_SUPPLY = bep20Amount(100);

beforeEach(async function () {
  await deploy();

  // Set up scenarios
  await getBnb().mint(INITIAL_SUPPLY);

  await getNativeToken().mint(INITIAL_SUPPLY);
  await getGlobalMasterChef().addAddressToWhitelist(getVaultVested().address);
  await getNativeToken().transferOwnership(getGlobalMasterChef().address);
});

describe("VaultVested: Earned", function () {
  it("Earned must be zero if not deposit", async function () {
    expect(await getVaultVested().earned(user1.address)).to.equal(0);
  });

  it("Initial earned must be zero after deposit", async function () {
    const depositAmount = bep20Amount(2);

    await getNativeToken().connect(owner).transfer(depositary1.address, depositAmount);
    await getNativeToken().connect(depositary1).approve(getVaultVested().address, depositAmount);
    await getVaultVested().connect(owner).setDepositary(depositary1.address, true);
    await getVaultVested().connect(depositary1).deposit(depositAmount, user1.address);

    expect(await getVaultVested().earned(user1.address)).to.equal(0);
  });

  it("Depository should to have BNB earned after distribution", async function () {
    const depositAmount = bep20Amount(2);
    const distributionAmount = bep20Amount(10);

    await getNativeToken().connect(owner).transfer(depositary1.address, depositAmount);
    await getNativeToken().connect(depositary1).approve(getVaultVested().address, depositAmount);
    await getVaultVested().connect(owner).setDepositary(depositary1.address, true);
    await getVaultVested().connect(depositary1).deposit(depositAmount, user1.address);

    // Set up distribution to be ready
    await getBnb().connect(owner).transfer(getVaultVested().address, distributionAmount);
    await getVaultVested().connect(owner).setDistributionInterval(timestampNDays(0));

    await getVaultVested().connect(owner).triggerDistribute();

    // 1 depositary earns all the BNBs on distribution.
    expect(await getVaultVested().earned(user1.address)).to.equal(distributionAmount);
  });
});