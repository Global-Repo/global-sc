const { expect } = require("chai");
const { bep20Amount, timestampNDays } = require("../../helpers/utils.js");
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

describe("VaultVested: Distribute", function () {
  it("Distribute without BNBs do not distribute", async function () {
    const timestamp0day = timestampNDays(0);

    // Set up distribution time.
    await getVaultVested().connect(owner).setDistributionInterval(timestamp0day);

    expect(await getVaultVested().connect(owner).triggerDistribute()).to.not.emit(getVaultVested(), 'Distributed');
  });

  it("Distribute BNBs out of time do not distribute BNBs", async function () {
    const distributionAmount = bep20Amount(10);
    const timestamp1day = timestampNDays(1);

    // Set up distribution BNBs
    await getBnb().connect(owner).transfer(getVaultVested().address, distributionAmount);

    // Set up distribution time.
    await getVaultVested().connect(owner).setDistributionInterval(timestamp1day);

    expect(await getVaultVested().connect(owner).triggerDistribute()).to.not.emit(getVaultVested(), 'Distributed');
  });

  it("Distribute BNBs without users do not distribute BNBs", async function () {
    const distributionAmount = bep20Amount(10);
    const timestamp0day = timestampNDays(0);

    // Set up distribution BNBs
    await getBnb().connect(owner).transfer(getVaultVested().address, distributionAmount);

    // Set up distribution time.
    await getVaultVested().connect(owner).setDistributionInterval(timestamp0day);

    expect(await getVaultVested().connect(owner).triggerDistribute()).to.not.emit(getVaultVested(), 'Distributed');
  });

  it("Distribute BNBs for 1 user successfully", async function () {
    const distributionAmount = bep20Amount(10);
    const timestamp0day = timestampNDays(0);
    const depositAmount = bep20Amount(2);

    // Set up distribution BNBs
    await getBnb().connect(owner).transfer(getVaultVested().address, distributionAmount);

    // Set up distribution time.
    await getVaultVested().connect(owner).setDistributionInterval(timestamp0day);

    // Set up users with their globals into the vault.
    await getNativeToken().connect(owner).transfer(depositary1.address, depositAmount);
    await getNativeToken().connect(depositary1).approve(getVaultVested().address, depositAmount);
    await getVaultVested().connect(owner).setDepositary(depositary1.address, true);
    await getVaultVested().connect(depositary1).deposit(depositAmount, user1.address);

    expect(await getVaultVested().connect(depositary1).triggerDistribute()).to.emit(getVaultVested(), 'Distributed');
    expect(await getVaultVested().earned(user1.address)).to.equal(distributionAmount);
  });

  it("Distribute BNBs for many users successfully", async function () {
    const distributionAmount = bep20Amount(10);
    const timestamp0day = timestampNDays(0);
    const depositAmountUser1 = bep20Amount(2);
    const depositAmountUser2 = bep20Amount(2);
    const depositAmountUser3 = bep20Amount(6);
    const expectedBNBEarnedUser1 = bep20Amount(2);
    const expectedBNBEarnedUser2 = bep20Amount(2);
    const expectedBNBEarnedUser3 = bep20Amount(6);

    // Set up distribution BNBs
    await getBnb().connect(owner).transfer(getVaultVested().address, distributionAmount);
    await getVaultVested().connect(owner).setDistributionInterval(timestamp0day);

    // Set up users with their globals into the vault.
    await getNativeToken().connect(owner).transfer(depositary1.address, INITIAL_SUPPLY);
    await getNativeToken().connect(depositary1).approve(getVaultVested().address, INITIAL_SUPPLY);
    await getVaultVested().connect(owner).setDepositary(depositary1.address, true);
    await getVaultVested().connect(depositary1).deposit(depositAmountUser1, user1.address);
    await getVaultVested().connect(depositary1).deposit(depositAmountUser2, user2.address);
    await getVaultVested().connect(depositary1).deposit(depositAmountUser3, user3.address);

    expect(await getVaultVested().connect(depositary1).triggerDistribute()).to.emit(getVaultVested(), 'Distributed');
    expect(await getVaultVested().earned(user1.address)).to.equal(expectedBNBEarnedUser1);
    expect(await getVaultVested().earned(user2.address)).to.equal(expectedBNBEarnedUser2);
    expect(await getVaultVested().earned(user3.address)).to.equal(expectedBNBEarnedUser3);
  });

  it("Distribute BNBs for many users decimals check", async function () {
    const distributionAmount = bep20Amount(4);
    const timestamp0day = timestampNDays(0);
    const depositAmountUser1 = bep20Amount(2);
    const depositAmountUser2 = bep20Amount(2);
    const depositAmountUser3 = bep20Amount(6);

    // Set up distribution BNBs
    await getBnb().connect(owner).transfer(getVaultVested().address, distributionAmount);
    await getVaultVested().connect(owner).setDistributionInterval(timestamp0day);

    // Set up users with their globals into the vault.
    await getNativeToken().connect(owner).transfer(depositary1.address, INITIAL_SUPPLY);
    await getNativeToken().connect(depositary1).approve(getVaultVested().address, INITIAL_SUPPLY);
    await getVaultVested().connect(owner).setDepositary(depositary1.address, true);
    await getVaultVested().connect(depositary1).deposit(depositAmountUser1, user1.address);
    await getVaultVested().connect(depositary1).deposit(depositAmountUser2, user2.address);
    await getVaultVested().connect(depositary1).deposit(depositAmountUser3, user3.address);

    expect(await getVaultVested().connect(depositary1).triggerDistribute()).to.emit(getVaultVested(), 'Distributed');
    expect(await getVaultVested().earned(user1.address)).to.equal("800000000000000000");
    expect(await getVaultVested().earned(user2.address)).to.equal("800000000000000000");
    expect(await getVaultVested().earned(user3.address)).to.equal("2400000000000000000");
  });
});