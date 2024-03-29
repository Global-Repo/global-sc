const { expect } = require("chai");
const { bep20Amount } = require("../../helpers/utils.js");
const {
  deploy,
  getCakeToken,
  getNativeToken,
  getGlobalMasterChef,
  getCakeMasterChefMock,
  getVaultCake,
} = require("../../helpers/vaultCakeDeploy.js");

const OWNER_INITIAL_CAKES = bep20Amount(100);

beforeEach(async function () {
  await deploy();
  await getNativeToken().transferOwnership(getGlobalMasterChef().address);
  await getGlobalMasterChef().setMinter(getVaultCake().address, true);
  await getVaultCake().setMinter(getGlobalMasterChef().address);

  // Mint 100 cake tokens to owner
  await getCakeToken().mint(OWNER_INITIAL_CAKES);

  // Cake's owner now is cake MC
  await getCakeToken().transferOwnership(getCakeMasterChefMock().address);
});

describe("VaultCake: Earned", function () {
  it("Earned after staking in vault and auto-compounding profits in the pool", async function () {
    const depositedAmount = bep20Amount(5);

    await getVaultCake().setWithdrawalFees(0, 0, 0);
    await getCakeToken().connect(owner).transfer(user3.address, depositedAmount);
    await getCakeToken().connect(owner).transfer(user4.address, depositedAmount);
    await getCakeToken().connect(owner).approve(getVaultCake().address, OWNER_INITIAL_CAKES);
    await getCakeToken().connect(user3).approve(getVaultCake().address, OWNER_INITIAL_CAKES);
    await getCakeToken().connect(user4).approve(getVaultCake().address, OWNER_INITIAL_CAKES);

    await getVaultCake().connect(owner).deposit(depositedAmount);
    await getVaultCake().connect(user3).deposit(depositedAmount);
    await getVaultCake().connect(user4).deposit(depositedAmount);

    // Total deposited is 15 cakes.
    // Cake's mock MC adds 1 cake per deposit so now there are 18 cakes.
    // Withdraw triggers the auto-compound for this vault.
    await getVaultCake().connect(owner).withdrawAll();

    // So now, there are 15 - 5 = 10 tokens + 3 of auto-compound.
    // There are 2 users staking now so 3 tokens / 2 users = 1.5 cakes per user as a reward at this point.
    expect(await getVaultCake().earned(user3.address)).to.eq("1500000000000000000");
    expect(await getVaultCake().earned(user4.address)).to.eq("1500000000000000000");

    // Owner is not getting rewards because of his withdrawal removed his shares in the pool.
    expect(await getVaultCake().earned(owner.address)).to.eq(0);
  });
});