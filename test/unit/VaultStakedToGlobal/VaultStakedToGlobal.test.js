const { expect } = require("chai");
const {
  deploy,
  getNativeToken,
  getBnb,
  getRouterMock,
  getVaultStakedToGlobal,
} = require("../../helpers/vaultStakedToGlobalDeploy.js");
const { bep20Amount } = require("../../helpers/utils");
const INITIAL_SUPPLY = bep20Amount(100);
const USER_INITIAL_GLOBAL_AMOUNT = bep20Amount(20);

beforeEach(async function () {
  await deploy();

  // Set up scenarios
  await getNativeToken().mint(INITIAL_SUPPLY);
  await getBnb().mint(INITIAL_SUPPLY);

  await getNativeToken().connect(owner).transfer(user1.address, USER_INITIAL_GLOBAL_AMOUNT);
  await getNativeToken().connect(owner).transfer(user2.address, USER_INITIAL_GLOBAL_AMOUNT);

  // Used for rewards swap bnb to global
  await getNativeToken().connect(owner).transfer(getRouterMock().address, bep20Amount(50));
});

describe("VaultStaked: After deployment", function () {
  it("Check Global pool id (pid)", async function () {
    expect(await getVaultStakedToGlobal().pid()).to.equal(0);
  });

  it("Functional test", async function () {
    // Users have 20 globals each and 0 bnb in their accounts.
    expect(await getNativeToken().balanceOf(user1.address)).to.equal(USER_INITIAL_GLOBAL_AMOUNT);
    expect(await getNativeToken().balanceOf(user2.address)).to.equal(USER_INITIAL_GLOBAL_AMOUNT);
    expect(await getBnb().balanceOf(user1.address)).to.equal(0);
    expect(await getBnb().balanceOf(user2.address)).to.equal(0);

    // User1 deposits 5 globals.
    await getNativeToken().connect(user1).approve(getVaultStakedToGlobal().address, bep20Amount(5));
    expect(await getVaultStakedToGlobal().connect(user1).deposit(bep20Amount(5))).to.emit(getVaultStakedToGlobal(), "Deposited")
        .withArgs(user1.address, bep20Amount(5));
    expect(await getVaultStakedToGlobal().balanceOf(user1.address)).to.equal(bep20Amount(5));
    expect(await getVaultStakedToGlobal().balanceOf(user2.address)).to.equal(bep20Amount(0));

    // User1 deposits second time 8 globals.
    await getNativeToken().connect(user1).approve(getVaultStakedToGlobal().address, bep20Amount(8));
    expect(await getVaultStakedToGlobal().connect(user1).deposit(bep20Amount(8))).to.emit(getVaultStakedToGlobal(), "Deposited")
        .withArgs(user1.address,bep20Amount(8));
    expect(await getVaultStakedToGlobal().balanceOf(user1.address)).to.equal(bep20Amount(13));
    expect(await getVaultStakedToGlobal().balanceOf(user2.address)).to.equal(bep20Amount(0));

    // User2 deposits second time 7 globals.
    await getNativeToken().connect(user2).approve(getVaultStakedToGlobal().address, bep20Amount(7));
    expect(await getVaultStakedToGlobal().connect(user2).deposit(bep20Amount(7))).to.emit(getVaultStakedToGlobal(), "Deposited")
        .withArgs(user2.address,bep20Amount(7));
    expect(await getVaultStakedToGlobal().balanceOf(user1.address)).to.equal(bep20Amount(13));
    expect(await getVaultStakedToGlobal().balanceOf(user2.address)).to.equal(bep20Amount(7));
    expect(await getVaultStakedToGlobal().totalSupply()).to.equal(bep20Amount(20));

    // At this point both users have 0 bnb earned.
    expect(await getVaultStakedToGlobal().connect(user1).earned(user1.address)).to.equal(bep20Amount(0));
    expect(await getVaultStakedToGlobal().connect(user2).earned(user2.address)).to.equal(bep20Amount(0));

    // Distribute 10 bnb to send as a reward.
    const distributionAmount = bep20Amount(10);
    await getBnb().connect(owner).transfer(getVaultStakedToGlobal().address, distributionAmount);
    await getVaultStakedToGlobal().connect(owner).setRewarder(owner.address, true);
    expect(await getVaultStakedToGlobal().connect(owner).triggerDistribute(distributionAmount))
        .to.emit(getVaultStakedToGlobal(), "Distributed")
        .withArgs(distributionAmount);

    // User1: 13 globals and user2: 7 globals so user1 earns 65% and user2 earns 35% over 20 globals in total.
    expect(await getVaultStakedToGlobal().connect(user1).earned(user1.address)).to.equal("6500000000000000000");
    expect(await getVaultStakedToGlobal().connect(user2).earned(user2.address)).to.equal("3500000000000000000");

    // Withdraw and paid rewards.
    expect(await getVaultStakedToGlobal().connect(user1).withdraw())
        .to.emit(getVaultStakedToGlobal(), "Withdrawn")
        .withArgs(user1.address, bep20Amount(13))
        .to.emit(getVaultStakedToGlobal(), "RewardPaid")
        .withArgs(user1.address, "6500000000000000000");

    expect(await getVaultStakedToGlobal().connect(user2).withdraw())
        .to.emit(getVaultStakedToGlobal(), "Withdrawn")
        .withArgs(user2.address, bep20Amount(7))
        .to.emit(getVaultStakedToGlobal(), "RewardPaid")
        .withArgs(user2.address, "3500000000000000000");

    // Users have 20 globals each and bnb earned converted to global in their accounts.
    // In test global/bnb is 1/1 relationship in price.
    expect(await getNativeToken().balanceOf(user1.address)).to.equal("26500000000000000000");
    expect(await getNativeToken().balanceOf(user2.address)).to.equal("23500000000000000000");
    expect(await getBnb().balanceOf(user1.address)).to.equal(0);
    expect(await getBnb().balanceOf(user2.address)).to.equal(0);
  });

  it("Check user removal VST-03", async function () {
    let vaultStacked = getVaultStakedToGlobal();
    expect( await( vaultStacked.getUsersLength() )).to.equal(0);
    await getNativeToken().connect(user1).approve(getVaultStakedToGlobal().address, bep20Amount(5));
    expect(await getVaultStakedToGlobal().connect(user1).deposit(bep20Amount(5))).to.emit(getVaultStakedToGlobal(), "Deposited")
        .withArgs(user1.address, bep20Amount(5));
    await getNativeToken().connect(user2).approve(getVaultStakedToGlobal().address, bep20Amount(5));
    expect(await getVaultStakedToGlobal().connect(user2).deposit(bep20Amount(5))).to.emit(getVaultStakedToGlobal(), "Deposited")
        .withArgs(user2.address, bep20Amount(5));
    expect( await( vaultStacked.getUsersLength() )).to.equal(2);
    await getVaultStakedToGlobal().connect(user1).withdraw()
    expect( await( vaultStacked.getUsersLength() )).to.equal(1);
    await getVaultStakedToGlobal().connect(user2).withdraw()
    expect( await( vaultStacked.getUsersLength() )).to.equal(0);
  });
});