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
const CAKE_MASTER_CHEF_REWARD_PER_DEPOSIT = bep20Amount(1);

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

describe("VaultCake: Harvest", function () {
  it("Harvest without previous deposit works and do not return rewards", async function () {
    await getVaultCake().harvest();
    expect(await getVaultCake().balance()).to.equal(0);
  });

  it("Harvest stakes to the cake's master chef the owner's rewards", async function () {
    const depositAmount = bep20Amount(5);
    const expectedOwnerBalance = depositAmount.add(CAKE_MASTER_CHEF_REWARD_PER_DEPOSIT);

    await getCakeToken().approve(getVaultCake().address, OWNER_INITIAL_CAKES);
    await getVaultCake().deposit(depositAmount);

    expect(await getCakeToken().balanceOf(getCakeMasterChefMock().address)).to.equal(depositAmount);
    expect(await getVaultCake().harvest()).to.emit(getVaultCake(), 'Harvested');
    expect(await getVaultCake().balance()).to.equal(expectedOwnerBalance);
    expect(await getCakeToken().balanceOf(getCakeMasterChefMock().address)).to.equal(expectedOwnerBalance);
    expect(await getVaultCake().earned(owner.address)).to.equal(CAKE_MASTER_CHEF_REWARD_PER_DEPOSIT);
  });

  it("Earned tokens checks", async function () {
    const depositAmount = bep20Amount(5);

    await getCakeToken().approve(getVaultCake().address, OWNER_INITIAL_CAKES);
    await getVaultCake().deposit(depositAmount);

    expect(await getVaultCake().earned(owner.address)).to.equal(0);
    expect(await getVaultCake().harvest()).to.emit(getVaultCake(), 'Harvested');
    expect(await getVaultCake().earned(owner.address)).to.equal(CAKE_MASTER_CHEF_REWARD_PER_DEPOSIT);
  });
});