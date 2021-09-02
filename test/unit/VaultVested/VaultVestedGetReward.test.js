const { expect } = require("chai");
const { bep20Amount } = require("../../helpers/utils.js");
const {
  deploy,
  getNativeToken,
  getBnb,
  getVaultVested,
  getGlobalMasterChefMock,
} = require("../../helpers/vaultVestedDeploy.js");
const INITIAL_SUPPLY = bep20Amount(100);

beforeEach(async function () {
  await deploy();

  // Set up scenarios
  await getBnb().mint(INITIAL_SUPPLY);

  await getNativeToken().mint(INITIAL_SUPPLY);
  await getNativeToken().transferOwnership(getGlobalMasterChefMock().address);
});

describe("VaultVested: GetReward", function () {
  it("User claims rewards when is not staking", async function () {
    expect(await getVaultVested().earned(user1.address)).to.equal(0);
    expect(await getBnb().balanceOf(user1.address)).to.equal(0);

    getVaultVested().connect(user1).getReward();

    expect(await getVaultVested().earned(user1.address)).to.equal(0);
    expect(await getBnb().balanceOf(user1.address)).to.equal(0);
  });

  it("User claims rewards successfully", async function () {
    const depositAmount = bep20Amount(2);
    const distributionAmount = bep20Amount(4);

    // Set up distribution BNBs
    await getBnb().connect(owner).transfer(getVaultVested().address, distributionAmount);

    // Set up tokens and depository
    await getNativeToken().connect(owner).transfer(depositary1.address, depositAmount);
    await getNativeToken().connect(depositary1).approve(getVaultVested().address, depositAmount);
    await getVaultVested().connect(owner).setDepositary(depositary1.address, true);
    await getVaultVested().connect(owner).setRewarder(depositary1.address, true);

    // Deposit for user
    await getVaultVested().connect(depositary1).deposit(depositAmount, user1.address);

    expect(await getVaultVested().earned(user1.address)).to.equal(0);
    expect(await getBnb().balanceOf(user1.address)).to.equal(0);

    getVaultVested().connect(user1).getReward();

    expect(await getVaultVested().earned(user1.address)).to.equal(0);
    expect(await getBnb().balanceOf(user1.address)).to.equal(0);

    // Distribute all BNB for the only user into the vault.
    await getVaultVested().connect(depositary1).triggerDistribute(distributionAmount);

    // BNB rewards move from vault to user after claiming rewards.
    expect(await getVaultVested().earned(user1.address)).to.equal(distributionAmount);
    expect(await getBnb().balanceOf(user1.address)).to.equal(0);

    expect(await getVaultVested().connect(user1).getReward())
        .to.emit(getVaultVested(), 'RewardPaid')
        .withArgs(user1.address, distributionAmount);

    expect(await getVaultVested().earned(user1.address)).to.equal(0);
    expect(await getBnb().balanceOf(user1.address)).to.equal(distributionAmount);
  });
});