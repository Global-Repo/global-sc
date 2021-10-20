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
} = require("../../helpers/vaultCakeWBNBLPDeploy.js");

const OWNER_INITIAL_LPS = bep20Amount(100);

beforeEach(async function () {
  await deploy();
  await getNativeToken().transferOwnership(getGlobalMasterChef().address);
  await getGlobalMasterChef().setMinter(getVaultCakeWBNBLP().address, true);
  await getVaultCakeWBNBLP().setMinter(getGlobalMasterChef().address);

  // Mint 100 LP tokens to owner
  await getLPToken().mint(OWNER_INITIAL_LPS);

  // Cake's owner now is cake MC
  await getCakeToken().transferOwnership(getCakeMasterChefLPMock().address);
});

describe("VaultCakeWBNBLP: Deposit", function () {
  xit("Deposit zero", async function () {
    const depositAmount = bep20Amount(0);
    await expect(getVaultCakeWBNBLP().deposit(depositAmount)).to.be.revertedWith("Amount must be greater than zero");
  });

  it("Deposit an amount", async function () {
    const depositAmount = bep20Amount(5);

    await getLPToken().approve(getVaultCakeWBNBLP().address, OWNER_INITIAL_LPS);
    await expect(getVaultCakeWBNBLP().deposit(depositAmount))
        .to.emit(getVaultCakeWBNBLP(), 'Deposited')
        .withArgs(owner.address, depositAmount);

    expect(await getVaultCakeWBNBLP().balance()).to.equal(depositAmount);
    expect(await getLPToken().balanceOf(getCakeMasterChefLPMock().address)).to.equal(depositAmount);
    expect(await getVaultCakeWBNBLP().totalSupply()).to.equal(depositAmount);

    expect(await getVaultCakeWBNBLP().principalOf(owner.address)).to.equal(depositAmount);
    expect(await getVaultCakeWBNBLP().sharesOf(owner.address)).to.equal(depositAmount);
    expect(await getVaultCakeWBNBLP().balanceOf(owner.address)).to.equal(depositAmount);
  });

  xit("Many deposits from same user", async function () {
    const firstDeposit = bep20Amount(5);
    const secondDeposit = bep20Amount(10);
    const thirdDeposit = bep20Amount(2);
    const totalDepositedAmount = firstDeposit.add(secondDeposit).add(thirdDeposit);

    await getLPToken().approve(getVaultCakeWBNBLP().address, OWNER_INITIAL_LPS);
    await getVaultCakeWBNBLP().deposit(firstDeposit);
    await getVaultCakeWBNBLP().deposit(secondDeposit);
    await getVaultCakeWBNBLP().deposit(thirdDeposit);

    expect(await getVaultCakeWBNBLP().balance()).to.equal(totalDepositedAmount);
    expect(await getLPToken().balanceOf(getCakeMasterChefLPMock().address)).to.equal(totalDepositedAmount);
    expect(await getVaultCakeWBNBLP().totalSupply()).to.equal(totalDepositedAmount);

    expect(await getVaultCakeWBNBLP().principalOf(owner.address)).to.equal(totalDepositedAmount);
    expect(await getVaultCakeWBNBLP().sharesOf(owner.address)).to.equal(totalDepositedAmount);
    expect(await getVaultCakeWBNBLP().balanceOf(owner.address)).to.equal(totalDepositedAmount);
  });

  xit("Many deposits from different users", async function () {
    const firstDeposit = bep20Amount(5);
    const secondDeposit = bep20Amount(10);
    const thirdDeposit = bep20Amount(2);
    const ownerDepositedAmount = firstDeposit;
    const addr3DepositedAmount = secondDeposit.add(thirdDeposit);
    const totalDepositedAmount = ownerDepositedAmount.add(addr3DepositedAmount);

    await getLPToken().transfer(user3.address, bep20Amount(50));
    await getLPToken().approve(getVaultCakeWBNBLP().address, OWNER_INITIAL_LPS);
    await getLPToken().connect(user3).approve(getVaultCakeWBNBLP().address, OWNER_INITIAL_LPS);
    await getVaultCakeWBNBLP().deposit(firstDeposit);
    await getVaultCakeWBNBLP().connect(user3).deposit(secondDeposit);
    await getVaultCakeWBNBLP().connect(user3).deposit(thirdDeposit);

    expect(await getVaultCakeWBNBLP().balance()).to.equal(totalDepositedAmount);
    expect(await getLPToken().balanceOf(getCakeMasterChefLPMock().address)).to.equal(totalDepositedAmount);
    expect(await getVaultCakeWBNBLP().totalSupply()).to.equal(totalDepositedAmount);

    expect(await getVaultCakeWBNBLP().principalOf(owner.address)).to.equal(ownerDepositedAmount);
    expect(await getVaultCakeWBNBLP().principalOf(user3.address)).to.equal(addr3DepositedAmount);
    expect(await getVaultCakeWBNBLP().sharesOf(owner.address)).to.equal(ownerDepositedAmount);
    expect(await getVaultCakeWBNBLP().sharesOf(user3.address)).to.equal(addr3DepositedAmount);
    expect(await getVaultCakeWBNBLP().balanceOf(owner.address)).to.equal(ownerDepositedAmount);
    expect(await getVaultCakeWBNBLP().balanceOf(user3.address)).to.equal(addr3DepositedAmount);

    // Cake's master chef should to contain staked lp tokens from vault user.
    const {0: stakedAmount, 1: rewardDebt} = await getCakeMasterChefLPMock().userInfo(0, getVaultCakeWBNBLP().address);
    expect(stakedAmount).to.equal(totalDepositedAmount);
  });
});