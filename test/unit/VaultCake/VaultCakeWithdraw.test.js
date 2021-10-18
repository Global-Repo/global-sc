const { expect } = require("chai");
const { timestampNDays, bep20Amount } = require("../../helpers/utils.js");
const {
  deploy,
  getCakeToken,
  getNativeToken,
  getGlobalMasterChef,
  getCakeMasterChefMock,
  getVaultCake,
  getBusd,
  getBnb,
  getRouterMock,
} = require("../../helpers/vaultCakeDeploy.js");

const OWNER_INITIAL_CAKES = bep20Amount(100);
const ROUTER_INITIAL_TOKENS = bep20Amount(100);

beforeEach(async function () {
  await deploy();

  await getCakeToken().mint(OWNER_INITIAL_CAKES);
  await getCakeToken().mint(ROUTER_INITIAL_TOKENS);
  await getNativeToken().mint(ROUTER_INITIAL_TOKENS);
  await getBusd().mint(ROUTER_INITIAL_TOKENS);
  await getBnb().mint(ROUTER_INITIAL_TOKENS);
  await getCakeToken().transfer(getRouterMock().address, ROUTER_INITIAL_TOKENS);
  await getNativeToken().transfer(getRouterMock().address, ROUTER_INITIAL_TOKENS);
  await getBusd().transfer(getRouterMock().address, ROUTER_INITIAL_TOKENS);
  await getBnb().transfer(getRouterMock().address, ROUTER_INITIAL_TOKENS);

  await getNativeToken().transferOwnership(getGlobalMasterChef().address);
  await getGlobalMasterChef().setMinter(getVaultCake().address, true);
  await getVaultCake().setMinter(getGlobalMasterChef().address);

  // Cake's owner now is cake MC
  await getCakeToken().transferOwnership(getCakeMasterChefMock().address);

  await getVaultCake().disableWhitelist(true);
});

describe("VaultCake: Withdraw", function () {
  it("Cannot withdraw without previous deposit", async function () {
    expect(await getVaultCake().withdrawableBalanceOf(owner.address)).to.equal(0);
    await expect(
        getVaultCake().connect(user1).withdraw(bep20Amount(0))
    ).to.be.revertedWith("Nothing to withdraw");
  });

  it("Withdraw without fees", async function () {
    const depositAmount = bep20Amount(5);
    const withdrawAmount = bep20Amount(1);
    const expectedWithdraw = OWNER_INITIAL_CAKES.sub(depositAmount).add(withdrawAmount);

    await getVaultCake().setWithdrawalFees(0, 0, 0);
    await getCakeToken().approve(getVaultCake().address, OWNER_INITIAL_CAKES);
    await getVaultCake().deposit(depositAmount);

    expect(await getVaultCake().withdrawableBalanceOf(owner.address)).to.equal(depositAmount);
    expect(await getVaultCake().withdraw(withdrawAmount))
        .to.emit(getVaultCake(), 'Withdrawn')
        .withArgs(owner.address, withdrawAmount, 0);

    expect(await getCakeToken().balanceOf(owner.address)).to.equal(expectedWithdraw);
  });

  it("Withdraw with fees but in whitelist do not pay withdraw fees", async function () {
    const depositAmount = bep20Amount(5);
    const withdrawAmount = bep20Amount(1);

    await getVaultCake().setWithdrawalFees(60, 40, timestampNDays(3)); // 0.6% and 0.4% = 1% in total
    await getCakeToken().approve(getVaultCake().address, OWNER_INITIAL_CAKES);
    await getVaultCake().deposit(depositAmount);

    expect(await getVaultCake().withdrawableBalanceOf(owner.address)).to.equal(depositAmount);

    // withdraw amount - 1% in fees
    expect(await getVaultCake().withdraw(withdrawAmount))
        .to.emit(getVaultCake(), 'Withdrawn')
        .withArgs(owner.address, "990000000000000000", 0);

    // 100 cake - 5 deposited + withdraw (discounting fees)
    expect(await getCakeToken().balanceOf(owner.address)).to.equal("95990000000000000000");
  });
});