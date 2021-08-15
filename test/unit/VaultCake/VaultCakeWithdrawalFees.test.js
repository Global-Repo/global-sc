const { expect } = require("chai");
const { timestampNDays, bep20Amount } = require("../../helpers/utils.js");
const {
  deploy,
  getCakeToken,
  getNativeToken,
  getBnb,
  getMinter,
  getCakeMasterChefMock,
  getRouterMock,
  getVaultCake,
  getBusd,
} = require("../../helpers/vaultCakeDeploy.js");

const OWNER_INITIAL_CAKES = bep20Amount(100);
const ROUTER_INITIAL_TOKENS = bep20Amount(100);

beforeEach(async function () {
  await deploy();
  await getNativeToken().mint(ROUTER_INITIAL_TOKENS);
  await getBusd().mint(ROUTER_INITIAL_TOKENS);
  await getBnb().mint(ROUTER_INITIAL_TOKENS);
  await getNativeToken().transfer(getRouterMock().address, ROUTER_INITIAL_TOKENS);
  await getBusd().transfer(getRouterMock().address, ROUTER_INITIAL_TOKENS);
  await getBnb().transfer(getRouterMock().address, ROUTER_INITIAL_TOKENS);
  await getNativeToken().transferOwnership(getMinter().address);

  await getMinter().setMinter(getVaultCake().address, true);
  await getVaultCake().setMinter(getMinter().address);

  // Mint 100 cake tokens to owner
  await getCakeToken().mint(OWNER_INITIAL_CAKES);

  // Cake's owner now is cake MC
  await getCakeToken().transferOwnership(getCakeMasterChefMock().address);
});

describe("VaultCake: Withdrawal fees", function () {
  it("No withdrawal fees on withdrawal all", async function () {
    const depositedAmount = bep20Amount(5);

    await getVaultCake().setWithdrawalFees(0, 0, 0);
    await getVaultCake().setRewards(10000, 0, 0, 0, 0);
    await getCakeToken().connect(owner).transfer(user1.address, depositedAmount);
    await getCakeToken().connect(owner).transfer(user2.address, depositedAmount);
    await getCakeToken().connect(owner).approve(getVaultCake().address, OWNER_INITIAL_CAKES);
    await getCakeToken().connect(user1).approve(getVaultCake().address, OWNER_INITIAL_CAKES);
    await getCakeToken().connect(user2).approve(getVaultCake().address, OWNER_INITIAL_CAKES);

    await getVaultCake().connect(owner).deposit(depositedAmount);
    await getVaultCake().connect(user1).deposit(depositedAmount);
    await getVaultCake().connect(user2).deposit(depositedAmount);
    await getVaultCake().connect(owner).withdrawAll();

    // So now, there are 15 - 5 = 10 tokens + 3 of auto-compound.
    // There are 2 users staking now so 3 tokens / 2 users = 1.5 cakes per user as a reward at this point.
    expect(await getVaultCake().earned(user1.address)).to.eq("1500000000000000000");

    // Gets the deposited 5 cakes + 1.5 cakes of rewards.
    await getVaultCake().connect(user1).withdrawAll();
    expect(await getCakeToken().balanceOf(user1.address)).to.equal("6500000000000000000");
  });

  it("Withdrawal fees applied over principal deposit when user withdraws before defined interval days", async function () {
    const depositedAmount = bep20Amount(5);

    await getVaultCake().setWithdrawalFees(60, 10, timestampNDays(4));
    await getVaultCake().setRewards(10000, 0, 0, 0, 0);
    await getCakeToken().connect(owner).transfer(user1.address, depositedAmount);
    await getCakeToken().connect(owner).transfer(user2.address, depositedAmount);
    await getCakeToken().connect(owner).approve(getVaultCake().address, OWNER_INITIAL_CAKES);
    await getCakeToken().connect(user1).approve(getVaultCake().address, OWNER_INITIAL_CAKES);
    await getCakeToken().connect(user2).approve(getVaultCake().address, OWNER_INITIAL_CAKES);

    await getVaultCake().connect(owner).deposit(depositedAmount);
    await getVaultCake().connect(user1).deposit(depositedAmount);
    await getVaultCake().connect(user2).deposit(depositedAmount);
    await getVaultCake().connect(user1).withdrawAll();

    // 0.6% of deposited cakes buy global and burned (relation 1 to 1 in test)
    expect(await getNativeToken().balanceOf("0x000000000000000000000000000000000000dEaD")).to.equal("30000000000000000");

    // 0.1% of deposited cakes buy BUSD and sent to devs (relation 1 to 1 in test)
    expect(await getBusd().balanceOf(treasury.address)).to.equal("5000000000000000");

    // User receives 100 - 0.6 - 0.1 = 99.3% of 5 cakes = 4.965 cakes back
    expect(await getCakeToken().balanceOf(user1.address)).to.equal("4965000000000000000");
  });

  it("Withdrawal fees applied when withdrawUnderlying and rewards not paid", async function () {
    const depositedAmount = bep20Amount(5);
    const withdrawalAmount = bep20Amount(2);

    await getVaultCake().setWithdrawalFees(60, 10, timestampNDays(4));
    await getVaultCake().setRewards(10000, 0, 0, 0, 0);
    await getCakeToken().connect(owner).transfer(user1.address, depositedAmount);
    await getCakeToken().connect(owner).transfer(user2.address, depositedAmount);
    await getCakeToken().connect(owner).approve(getVaultCake().address, OWNER_INITIAL_CAKES);
    await getCakeToken().connect(user1).approve(getVaultCake().address, OWNER_INITIAL_CAKES);
    await getCakeToken().connect(user2).approve(getVaultCake().address, OWNER_INITIAL_CAKES);

    await getVaultCake().connect(owner).deposit(depositedAmount);
    await getVaultCake().connect(user1).deposit(depositedAmount);
    await getVaultCake().connect(user2).deposit(depositedAmount);
    await getVaultCake().connect(user1).withdrawUnderlying(withdrawalAmount);

    // 0.6% of deposited cakes buy global and burned (relation 1 to 1 in test)
    expect(await getNativeToken().balanceOf("0x000000000000000000000000000000000000dEaD")).to.equal("12000000000000000");

    // 0.1% of deposited cakes buy BUSD and sent to devs (relation 1 to 1 in test)
    expect(await getBusd().balanceOf(treasury.address)).to.equal("2000000000000000");

    // User receives 100 - 0.6 - 0.1 = 99.3% of 5 cakes = 4.965 cakes back
    expect(await getCakeToken().balanceOf(user1.address)).to.equal("1986000000000000000");
  });
});