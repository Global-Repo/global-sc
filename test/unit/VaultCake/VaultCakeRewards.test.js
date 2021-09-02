const { expect } = require("chai");
const { bep20Amount } = require("../../helpers/utils.js");
const {
  deploy,
  getCakeToken,
  getNativeToken,
  getBnb,
  getGlobalMasterChef,
  getCakeMasterChefMock,
  getRouterMock,
  getVaultDistribution,
  getVaultCake,
  getBusd,
  getVaultVested,
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
  await getNativeToken().transferOwnership(getGlobalMasterChef().address);

  await getGlobalMasterChef().setMinter(getVaultCake().address, true);
  await getVaultCake().setMinter(getGlobalMasterChef().address);
  await getVaultDistribution().setDepositary(getVaultCake().address, true);
  await getVaultVested().setDepositary(getVaultCake().address, true);

  // Mint 100 cake tokens to owner
  await getCakeToken().mint(OWNER_INITIAL_CAKES);

  // Add vault vested to the MC whitelisting
  await getGlobalMasterChef().addAddressToWhitelist(getVaultVested().address);

  // Cake's owner now is cake MC
  await getCakeToken().transferOwnership(getCakeMasterChefMock().address);
});

describe("VaultCake: Rewards", function () {
  it("100 % of the reward to the user", async function () {
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

  it("Default rewards distribution", async function () {
    const depositedAmount = bep20Amount(5);

    await getVaultCake().setWithdrawalFees(0, 0, 0);
    await getVaultCake().setRewards(7500, 400, 600, 1500, 25000);
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
    expect(await getVaultCake().earned(user2.address)).to.eq("1500000000000000000");

    // Gets the deposited 5 cakes + 1.5 cakes of rewards.
    await getVaultCake().connect(user1).withdrawAll();

    // User must have 5 deposited cakes + 75% of rewards (1.5 cakes) = 1.125 cakes
    expect(await getCakeToken().balanceOf(user1.address)).to.equal("6125000000000000000");

    // Operations must have 4% of rewards (1.5 cakes) in BUSD (price relation in test 1 to 1)
    expect(await getBusd().balanceOf(treasury.address)).to.equal("60000000000000000");

    // Vested vault must have 6% of rewards (1.5 cakes) in Global (price relation in test 1 to 1) from the user (90000000000000000)
    // Vested vault must have 250% of previous 6% in Global from the CakeVault (225000000000000000)
    expect(await getVaultVested().balance()).to.equal("315000000000000000");

    // Distribution vault must have 15% of rewards (1.5 cakes) in BNB (price relation in test 1 to 1)
    expect(await getBnb().balanceOf(getVaultDistribution().address)).to.equal("225000000000000000");
  });
});