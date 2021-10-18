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

describe("VaultBunny: Rewards", function () {
  it("100 % of the reward to the user", async function () {
    const depositedAmount = bep20Amount(5);

    await getVaultBunny().setWithdrawalFees(0, 0, 0);
    await getVaultBunny().setRewards(10000, 0, 0, 0, 0);
    await getBunny().connect(owner).transfer(user1.address, depositedAmount);
    await getBunny().connect(owner).transfer(user2.address, depositedAmount);
    await getBunny().connect(owner).approve(getVaultBunny().address, OWNER_INITIAL_BUNNIES);
    await getBunny().connect(user1).approve(getVaultBunny().address, OWNER_INITIAL_BUNNIES);
    await getBunny().connect(user2).approve(getVaultBunny().address, OWNER_INITIAL_BUNNIES);

    await getVaultBunny().connect(owner).deposit(depositedAmount);
    await getVaultBunny().connect(user1).deposit(depositedAmount);
    await getVaultBunny().connect(user2).deposit(depositedAmount);
    await getVaultBunny().connect(owner).withdrawAll();

    // So now, there are 15 - 5 = 10 tokens + 3 of auto-compound.
    // There are 2 users staking now so 3 tokens / 2 users = 1.5 bnb per user as a reward at this point.
    expect(await getVaultBunny().earned(user1.address)).to.eq("1500000000000000000");

    // Gets the deposited 5 bunny + 1.5 bnb of rewards.
    await getVaultBunny().connect(user1).withdrawAll();
    expect(await getBunny().balanceOf(user1.address)).to.equal("5000000000000000000");
    expect(await getBnb().balanceOf(user1.address)).to.equal("1500000000000000000");
  });
});

