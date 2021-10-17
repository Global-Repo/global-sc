const { expect } = require("chai");
const { bep20Amount } = require("../../helpers/utils.js");
const {
  deploy,
  getVaultBunny,
  getNativeToken,
  getBnb,
  getBunny,
  getVaultDistribution,
  getVaultVested,
  getGlobalMasterChef,
  getBunnyPoolMock,
} = require("../../helpers/vaultBunnyDeploy.js");

const OWNER_INITIAL_CAKES = bep20Amount(100);

beforeEach(async function () {
  await deploy();
  await getNativeToken().transferOwnership(getGlobalMasterChef().address);
  await getGlobalMasterChef().setMinter(getVaultBunny().address, true);
  await getVaultBunny().setMinter(getGlobalMasterChef().address);
  await getBunny().mint(OWNER_INITIAL_CAKES);
});

describe("VaultBunny: Deposit", function () {
  it("Simple deposit to test de allowance against bunny pool", async function () {
    const depositAmount = bep20Amount(5);

    await getBunny().approve(getVaultBunny().address, OWNER_INITIAL_CAKES);
    await expect(getVaultBunny().deposit(depositAmount))
        .to.emit(getVaultBunny(), 'Deposited')
        .withArgs(owner.address, depositAmount);

    expect(await getVaultBunny().balance()).to.equal(depositAmount);
    expect(await getBunny().balanceOf(getBunnyPoolMock().address)).to.equal(depositAmount);
    expect(await getVaultBunny().totalSupply()).to.equal(depositAmount);

    expect(await getVaultBunny().principalOf(owner.address)).to.equal(depositAmount);
    expect(await getVaultBunny().sharesOf(owner.address)).to.equal(depositAmount);
    expect(await getVaultBunny().balanceOf(owner.address)).to.equal(depositAmount);
  });
});

