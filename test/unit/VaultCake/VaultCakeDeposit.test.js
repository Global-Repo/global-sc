const { expect } = require("chai");
const { bep20Amount } = require("../../helpers/utils.js");
const {
  deploy,
  getCakeToken,
  getNativeToken,
  getMinter,
  getCakeMasterChefMock,
  getVaultCake,
} = require("../../helpers/vaultCakeDeploy.js");

const OWNER_INITIAL_CAKES = bep20Amount(100);

beforeEach(async function () {
  await deploy();
  await getNativeToken().transferOwnership(getMinter().address);
  await getMinter().setMinter(getVaultCake().address, true);
  await getVaultCake().setMinter(getMinter().address);

  // Mint 100 cake tokens to owner
  await getCakeToken().mint(OWNER_INITIAL_CAKES);

  // Cake's owner now is cake MC
  await getCakeToken().transferOwnership(getCakeMasterChefMock().address);
});

describe("VaultCake: Deposit", function () {
  it("Deposit zero", async function () {
    const depositAmount = bep20Amount(0);

    await expect(getVaultCake().deposit(depositAmount))
        .to.emit(getVaultCake(), 'Deposited')
        .withArgs(owner.address, depositAmount);

    expect(await getCakeToken().balanceOf(getVaultCake().address)).to.equal(depositAmount);
  });

  it("Deposit an amount", async function () {
    const depositAmount = bep20Amount(5);

    await getCakeToken().approve(getVaultCake().address, OWNER_INITIAL_CAKES);
    await expect(getVaultCake().deposit(depositAmount))
        .to.emit(getVaultCake(), 'Deposited')
        .withArgs(owner.address, depositAmount);

    expect(await getVaultCake().balance()).to.equal(depositAmount);
    expect(await getCakeToken().balanceOf(getCakeMasterChefMock().address)).to.equal(depositAmount);
    expect(await getVaultCake().totalSupply()).to.equal(depositAmount);

    expect(await getVaultCake().principalOf(owner.address)).to.equal(depositAmount);
    expect(await getVaultCake().sharesOf(owner.address)).to.equal(depositAmount);
    expect(await getVaultCake().balanceOf(owner.address)).to.equal(depositAmount);
  });

  it("Many deposits from same user", async function () {
    const firstDeposit = bep20Amount(5);
    const secondDeposit = bep20Amount(10);
    const thirdDeposit = bep20Amount(2);
    const totalDepositedAmount = firstDeposit.add(secondDeposit).add(thirdDeposit);

    await getCakeToken().approve(getVaultCake().address, OWNER_INITIAL_CAKES);
    await getVaultCake().deposit(firstDeposit);
    await getVaultCake().deposit(secondDeposit);
    await getVaultCake().deposit(thirdDeposit);

    expect(await getVaultCake().balance()).to.equal(totalDepositedAmount);
    expect(await getCakeToken().balanceOf(getCakeMasterChefMock().address)).to.equal(totalDepositedAmount);
    expect(await getVaultCake().totalSupply()).to.equal(totalDepositedAmount);

    expect(await getVaultCake().principalOf(owner.address)).to.equal(totalDepositedAmount);
    expect(await getVaultCake().sharesOf(owner.address)).to.equal(totalDepositedAmount);
    expect(await getVaultCake().balanceOf(owner.address)).to.equal(totalDepositedAmount);
  });

  it("Many deposits from different users", async function () {
    const firstDeposit = bep20Amount(5);
    const secondDeposit = bep20Amount(10);
    const thirdDeposit = bep20Amount(2);
    const ownerDepositedAmount = firstDeposit;
    const addr3DepositedAmount = secondDeposit.add(thirdDeposit);
    const totalDepositedAmount = ownerDepositedAmount.add(addr3DepositedAmount);

    await getCakeToken().transfer(user3.address, bep20Amount(50));
    await getCakeToken().approve(getVaultCake().address, OWNER_INITIAL_CAKES);
    await getCakeToken().connect(user3).approve(getVaultCake().address, OWNER_INITIAL_CAKES);
    await getVaultCake().deposit(firstDeposit);
    await getVaultCake().connect(user3).deposit(secondDeposit);
    await getVaultCake().connect(user3).deposit(thirdDeposit);

    expect(await getVaultCake().balance()).to.equal(totalDepositedAmount);
    expect(await getCakeToken().balanceOf(getCakeMasterChefMock().address)).to.equal(totalDepositedAmount);
    expect(await getVaultCake().totalSupply()).to.equal(totalDepositedAmount);

    expect(await getVaultCake().principalOf(owner.address)).to.equal(ownerDepositedAmount);
    expect(await getVaultCake().principalOf(user3.address)).to.equal(addr3DepositedAmount);
    expect(await getVaultCake().sharesOf(owner.address)).to.equal(ownerDepositedAmount);
    expect(await getVaultCake().sharesOf(user3.address)).to.equal(addr3DepositedAmount);
    expect(await getVaultCake().balanceOf(owner.address)).to.equal(ownerDepositedAmount);
    expect(await getVaultCake().balanceOf(user3.address)).to.equal(addr3DepositedAmount);

    // Cake's master chef should to contain staked cakes from vault user.
    const {0: stakedAmount, 1: rewardDebt} = await getCakeMasterChefMock().userInfo(0, getVaultCake().address);
    expect(stakedAmount).to.equal(totalDepositedAmount);
  });
});