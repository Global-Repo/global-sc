const { expect } = require("chai");
const { bep20Amount } = require("../../helpers/utils.js");
const {
  deploy,
  getNativeToken,
  getCakeToken,
  getGlobalMasterChef,
  getCakeMasterChefLPMock,
  getVaultCakeWBNBLP,
  getLPToken,
  getBnb,
  getRouterMock,
} = require("../../helpers/vaultCakeWBNBLPDeploy.js");

const OWNER_INITIAL_LPS = bep20Amount(100);
const OWNER_INITIAL_TOKENS_FOR_ROUTER = bep20Amount(100);

beforeEach(async function () {
  await deploy();
  await getNativeToken().transferOwnership(getGlobalMasterChef().address);
  await getGlobalMasterChef().setMinter(getVaultCakeWBNBLP().address, true);
  await getVaultCakeWBNBLP().setMinter(getGlobalMasterChef().address);

  // Mint 100 LP tokens to owner
  await getLPToken().mint(OWNER_INITIAL_LPS);
  await getCakeToken().mint(OWNER_INITIAL_LPS);

  // Sends tokens to router mock
  await getBnb().mint(OWNER_INITIAL_TOKENS_FOR_ROUTER);
  await getCakeToken().mint(OWNER_INITIAL_TOKENS_FOR_ROUTER);
  await getBnb().transfer(getRouterMock().address, OWNER_INITIAL_TOKENS_FOR_ROUTER);
  await getCakeToken().transfer(getRouterMock().address, OWNER_INITIAL_TOKENS_FOR_ROUTER);

  // Cake's owner now is cake MC
  await getCakeToken().transferOwnership(getCakeMasterChefLPMock().address);
  //await getLPToken().transferOwnership(getCakeMasterChefLPMock().address);
  //await getBnb().transferOwnership(getCakeMasterChefLPMock().address);
});

describe("VaultCakeWBNBLP: Earned", function () {
  it("Earned after staking in vault and auto-compounding profits in the pool", async function () {
    const depositedAmount = bep20Amount(5);

    await getVaultCakeWBNBLP().setWithdrawalFees(0, 0, 0);
    await getLPToken().connect(owner).transfer(user3.address, depositedAmount);
    await getLPToken().connect(owner).transfer(user4.address, depositedAmount);
    await getLPToken().connect(owner).approve(getVaultCakeWBNBLP().address, OWNER_INITIAL_LPS);
    await getLPToken().connect(user3).approve(getVaultCakeWBNBLP().address, OWNER_INITIAL_LPS);
    await getLPToken().connect(user4).approve(getVaultCakeWBNBLP().address, OWNER_INITIAL_LPS);

    await getVaultCakeWBNBLP().connect(owner).deposit(depositedAmount);
    await getVaultCakeWBNBLP().connect(user3).deposit(depositedAmount);
    await getVaultCakeWBNBLP().connect(user4).deposit(depositedAmount);

    // Total deposited is 15 cakes.
    // Cake's mock MC adds 1 cake per deposit so now there are 18 cakes.
    // Withdraw triggers the auto-compound for this vault.
    await getVaultCakeWBNBLP().connect(owner).withdrawAll();

    // So now, there are 15 - 5 = 10 tokens + 3 of auto-compound.
    // There are 2 users staking now so 3 tokens / 2 users = 1.5 cakes per user as a reward at this point.
    expect(await getVaultCakeWBNBLP().earned(user3.address)).to.eq("2500000000000000000");
    //expect(await getVaultCakeWBNBLP().earned(user4.address)).to.eq("1500000000000000000");

    // Owner is not getting rewards because of his withdrawal removed his shares in the pool.
    //expect(await getVaultCakeWBNBLP().earned(owner.address)).to.eq(0);
  });
});