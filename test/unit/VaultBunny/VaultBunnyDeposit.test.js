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

  it("Many deposits from same user", async function () {
    const firstDeposit = bep20Amount(5);
    const secondDeposit = bep20Amount(10);
    const thirdDeposit = bep20Amount(2);
    const totalDepositedAmount = firstDeposit.add(secondDeposit).add(thirdDeposit);

    await getBunny().approve(getVaultBunny().address, OWNER_INITIAL_CAKES);
    await getVaultBunny().deposit(firstDeposit);
    await getVaultBunny().deposit(secondDeposit);
    await getVaultBunny().deposit(thirdDeposit);

    expect(await getVaultBunny().balance()).to.equal(totalDepositedAmount);
    expect(await getBunny().balanceOf(getBunnyPoolMock().address)).to.equal(totalDepositedAmount);
    expect(await getVaultBunny().totalSupply()).to.equal(totalDepositedAmount);

    expect(await getVaultBunny().principalOf(owner.address)).to.equal(totalDepositedAmount);
    expect(await getVaultBunny().sharesOf(owner.address)).to.equal(totalDepositedAmount);
    expect(await getVaultBunny().balanceOf(owner.address)).to.equal(totalDepositedAmount);
  });

  it("Many deposits from different users", async function () {
    const firstDeposit = bep20Amount(5);
    const secondDeposit = bep20Amount(10);
    const thirdDeposit = bep20Amount(2);
    const ownerDepositedAmount = firstDeposit;
    const addr3DepositedAmount = secondDeposit.add(thirdDeposit);
    const totalDepositedAmount = ownerDepositedAmount.add(addr3DepositedAmount);

    await getBunny().transfer(user1.address, bep20Amount(50));
    await getBunny().approve(getVaultBunny().address, OWNER_INITIAL_CAKES);
    await getBunny().connect(user1).approve(getVaultBunny().address, OWNER_INITIAL_CAKES);
    await getVaultBunny().deposit(firstDeposit);
    await getVaultBunny().connect(user1).deposit(secondDeposit);
    await getVaultBunny().connect(user1).deposit(thirdDeposit);

    expect(await getVaultBunny().balance()).to.equal(totalDepositedAmount);
    expect(await getBunny().balanceOf(getBunnyPoolMock().address)).to.equal(totalDepositedAmount);
    expect(await getVaultBunny().totalSupply()).to.equal(totalDepositedAmount);

    expect(await getVaultBunny().principalOf(owner.address)).to.equal(ownerDepositedAmount);
    expect(await getVaultBunny().principalOf(user1.address)).to.equal(addr3DepositedAmount);
    expect(await getVaultBunny().sharesOf(owner.address)).to.equal(ownerDepositedAmount);
    expect(await getVaultBunny().sharesOf(user1.address)).to.equal(addr3DepositedAmount);
    expect(await getVaultBunny().balanceOf(owner.address)).to.equal(ownerDepositedAmount);
    expect(await getVaultBunny().balanceOf(user1.address)).to.equal(addr3DepositedAmount);
  });
});

