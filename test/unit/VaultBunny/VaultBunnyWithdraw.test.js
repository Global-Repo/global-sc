const { expect } = require("chai");
const { timestampNDays, bep20Amount } = require("../../helpers/utils.js");
const {
  deploy,
  getVaultBunny,
  getNativeToken,
  getBnb,
  getBusd,
  getBunny,
  getGlobalMasterChef,
  getBunnyPoolMock,
  getRouterMock,
} = require("../../helpers/vaultBunnyDeploy.js");

const OWNER_INITIAL_BUNNIES = bep20Amount(100);
const ROUTER_INITIAL_TOKENS = bep20Amount(100);

beforeEach(async function () {
  await deploy();

  await getBunny().mint(OWNER_INITIAL_BUNNIES);
  await getBunny().mint(ROUTER_INITIAL_TOKENS);
  await getNativeToken().mint(ROUTER_INITIAL_TOKENS);
  await getBusd().mint(ROUTER_INITIAL_TOKENS);
  await getBnb().mint(ROUTER_INITIAL_TOKENS);
  await getNativeToken().transfer(getRouterMock().address, ROUTER_INITIAL_TOKENS);
  await getBusd().transfer(getRouterMock().address, ROUTER_INITIAL_TOKENS);
  await getBnb().transfer(getRouterMock().address, ROUTER_INITIAL_TOKENS);
  await getBunny().transfer(getRouterMock().address, ROUTER_INITIAL_TOKENS);

  await getNativeToken().transferOwnership(getGlobalMasterChef().address);
  await getGlobalMasterChef().setMinter(getVaultBunny().address, true);
  await getVaultBunny().setMinter(getGlobalMasterChef().address);

  // Bunny's owner now is bunny pool for this test
  await getBunny().transferOwnership(getBunnyPoolMock().address);

  await getVaultBunny().disableWhitelist(true);
});

describe("VaultBunny: Withdraw", function () {
  it("Cannot withdraw without previous deposit", async function () {
    expect(await getVaultBunny().withdrawableBalanceOf(owner.address)).to.equal(0);
    await expect(
        getVaultBunny().connect(user1).withdraw(bep20Amount(0))
    ).to.be.revertedWith("Nothing to withdraw");
  });

  it("Withdraw without fees", async function () {
    const depositAmount = bep20Amount(5);
    const withdrawAmount = bep20Amount(1);
    const expectedWithdraw = OWNER_INITIAL_BUNNIES.sub(depositAmount).add(withdrawAmount);

    await getVaultBunny().setWithdrawalFees(0, 0, 0);
    await getBunny().approve(getVaultBunny().address, OWNER_INITIAL_BUNNIES);
    await getVaultBunny().deposit(depositAmount);

    expect(await getVaultBunny().withdrawableBalanceOf(owner.address)).to.equal(depositAmount);
    expect(await getVaultBunny().withdraw(withdrawAmount))
        .to.emit(getVaultBunny(), 'Withdrawn')
        .withArgs(owner.address, withdrawAmount, 0);

    expect(await getBunny().balanceOf(owner.address)).to.equal(expectedWithdraw);
  });

  it("Withdraw with fees", async function () {
    const depositAmount = bep20Amount(5);
    const withdrawAmount = bep20Amount(1);

    await getVaultBunny().setWithdrawalFees(60, 40, timestampNDays(3)); // 0.6% and 0.4% = 1% in total
    await getBunny().approve(getVaultBunny().address, OWNER_INITIAL_BUNNIES);
    await getVaultBunny().deposit(depositAmount);

    expect(await getVaultBunny().withdrawableBalanceOf(owner.address)).to.equal(depositAmount);

    // withdraw amount - 1% in fees
    expect(await getVaultBunny().withdraw(withdrawAmount))
        .to.emit(getVaultBunny(), 'Withdrawn')
        .withArgs(owner.address, "990000000000000000", 0);

    // 100 bunny - 5 deposited + withdraw (discounting fees)
    expect(await getBunny().balanceOf(owner.address)).to.equal("95990000000000000000");
  });

  it("Withdraw all with fees", async function () {
    const depositedAmount = bep20Amount(5);

    await getVaultBunny().setWithdrawalFees(60, 10, timestampNDays(4));
    await getVaultBunny().setRewards(10000, 0, 0, 0, 0);
    await getBunny().connect(owner).transfer(user1.address, depositedAmount);
    await getBunny().connect(owner).transfer(user2.address, depositedAmount);
    await getBunny().connect(owner).approve(getVaultBunny().address, OWNER_INITIAL_BUNNIES);
    await getBunny().connect(user1).approve(getVaultBunny().address, OWNER_INITIAL_BUNNIES);
    await getBunny().connect(user2).approve(getVaultBunny().address, OWNER_INITIAL_BUNNIES);

    await getVaultBunny().connect(owner).deposit(depositedAmount);
    await getVaultBunny().connect(user1).deposit(depositedAmount);
    await getVaultBunny().connect(user2).deposit(depositedAmount);
    await getVaultBunny().connect(user1).withdrawAll();

    // 0.6% of deposited bunny buy global and burned (relation 1 to 1 in test)
    expect(await getNativeToken().balanceOf("0x000000000000000000000000000000000000dEaD")).to.equal("30000000000000000");

    // 0.1% of deposited bunny buy BUSD and sent to devs (relation 1 to 1 in test)
    expect(await getBusd().balanceOf(treasury.address)).to.equal("5000000000000000");

    // User receives 100 - 0.6 - 0.1 = 99.3% of 5 bunny = 4.965 bunny back
    expect(await getBunny().balanceOf(user1.address)).to.equal("4965000000000000000");
  });
});

