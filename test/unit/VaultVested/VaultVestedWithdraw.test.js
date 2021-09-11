const { expect } = require("chai");
const { bep20Amount, timestampNDays } = require("../../helpers/utils.js");
const {
  deploy,
  getNativeToken,
  getBnb,
  getVaultVested,
  getGlobalMasterChef,
  getVaultLocked,
} = require("../../helpers/vaultVestedDeploy.js");
const {ethers} = require("hardhat");
const INITIAL_SUPPLY = bep20Amount(100);

beforeEach(async function () {
  await deploy();

  // Set up scenarios
  await getBnb().mint(INITIAL_SUPPLY);

  await getNativeToken().mint(INITIAL_SUPPLY);
  await getGlobalMasterChef().addAddressToWhitelist(getVaultVested().address);
  await getNativeToken().transferOwnership(getGlobalMasterChef().address);
  await getVaultLocked().setDepositary(getVaultVested().address, true)
});

describe("VaultVested: Withdraw", function () {
  it("Cannot withdraw without previous deposit", async function () {
    expect(await getVaultVested().balanceOf(user1.address)).to.equal(0);

    await expect(getVaultVested().connect(user1).withdraw())
        .to.emit(getVaultVested(), 'Withdrawn')
        .withArgs(user1.address, 0, 0);

    await expect(getVaultVested().connect(user1).withdraw())
        .to.not.emit(getVaultVested(), 'RewardPaid');

    expect(await getVaultVested().balanceOf(user1.address)).to.equal(0);
  });

  it("Withdraw all without penalty fees", async function () {
    const depositAmount = bep20Amount(2);

    // 1 % penalty fee without time to withdraw with fees.
    await getVaultVested().setPenaltyFees(100, timestampNDays(0));

    await getNativeToken().connect(owner).transfer(depositary1.address, depositAmount);
    await getNativeToken().connect(depositary1).approve(getVaultVested().address, depositAmount);
    await getVaultVested().connect(owner).setDepositary(depositary1.address, true);
    await getVaultVested().connect(depositary1).deposit(depositAmount, user1.address);

    expect(await getVaultVested().balanceOf(user1.address)).to.equal(depositAmount);

    await expect(getVaultVested().connect(user1).withdraw())
        .to.emit(getVaultVested(), 'Withdrawn')
        .withArgs(user1.address, depositAmount, 0);

    // User1 no global balance in vault
    expect(await getVaultVested().balanceOf(user1.address)).to.equal(0);

    // User1 global balance received into their address account.
    expect(await getNativeToken().balanceOf(user1.address)).to.equal(depositAmount);
  });

  it("Withdraw all with penalty fee", async function () {
    const depositAmount = bep20Amount(2);

    // 1 % penalty fee within 30 days.
    await getVaultVested().setPenaltyFees(100, timestampNDays(30));

    await getNativeToken().connect(owner).transfer(depositary1.address, depositAmount);
    await getNativeToken().connect(depositary1).approve(getVaultVested().address, depositAmount);
    await getVaultVested().connect(owner).setDepositary(depositary1.address, true);
    await getVaultVested().connect(depositary1).deposit(depositAmount, user1.address);

    expect(await getVaultVested().balanceOf(user1.address)).to.equal(depositAmount);

    await expect(getVaultVested().connect(user1).withdraw())
        .to.emit(getVaultVested(), 'Withdrawn')
        .withArgs(user1.address, "1980000000000000000", "20000000000000000");

    // User1 no global balance in vault
    expect(await getVaultVested().balanceOf(user1.address)).to.equal(0);

    // User1 global balance received into their address account must be 99% of amount.
    expect(await getNativeToken().balanceOf(user1.address)).to.equal("1980000000000000000");

    // Locked vault receives 1% of deposit as penalty fee.
    expect(await getNativeToken().balanceOf(getVaultLocked().address)).to.equal("20000000000000000");
  });

  it("Withdraw all with penalty fee and without penalty fees", async function () {
    const depositAmount = bep20Amount(2);

    // 1 % penalty fee within 30 days.
    await getVaultVested().setPenaltyFees(100, timestampNDays(30));

    await getNativeToken().connect(owner).transfer(depositary1.address, depositAmount);
    await getNativeToken().connect(depositary1).approve(getVaultVested().address, depositAmount);
    await getVaultVested().connect(owner).setDepositary(depositary1.address, true);
    await getVaultVested().connect(depositary1).deposit(depositAmount.div(2), user1.address);

    expect(await getVaultVested().balanceOf(user1.address)).to.equal(depositAmount.div(2));

    await ethers.provider.send('evm_increaseTime', [timestampNDays(10)]);

    await getVaultVested().connect(depositary1).deposit(depositAmount.div(2), user1.address);

    expect(await getVaultVested().balanceOf(user1.address)).to.equal(depositAmount);

    await ethers.provider.send('evm_increaseTime', [timestampNDays(21)]);

    await expect(getVaultVested().connect(user1).withdraw())
        .to.emit(getVaultVested(), 'Withdrawn')
        .withArgs(user1.address, "1990000000000000000", "10000000000000000");

    // User1 no global balance in vault
    expect(await getVaultVested().balanceOf(user1.address)).to.equal(0);

    // User1 global balance received into their address account must be 99% of amount.
    expect(await getNativeToken().balanceOf(user1.address)).to.equal("1990000000000000000");

    // Locked vault receives 1% of deposit as penalty fee.
    expect(await getNativeToken().balanceOf(getVaultLocked().address)).to.equal("10000000000000000");
  });

  it("Withdraw without penalty fees 1", async function () {
    const depositAmount = bep20Amount(2);

    // 1 % penalty fee within 30 days.
    await getVaultVested().setPenaltyFees(100, timestampNDays(30));

    await getNativeToken().connect(owner).transfer(depositary1.address, depositAmount);
    await getNativeToken().connect(depositary1).approve(getVaultVested().address, depositAmount);
    await getVaultVested().connect(owner).setDepositary(depositary1.address, true);
    await getVaultVested().connect(depositary1).deposit(depositAmount.div(2), user1.address);

    expect(await getVaultVested().balanceOf(user1.address)).to.equal(depositAmount.div(2));

    await ethers.provider.send('evm_increaseTime', [timestampNDays(10)]);

    await getVaultVested().connect(depositary1).deposit(depositAmount.div(2), user1.address);

    expect(await getVaultVested().balanceOf(user1.address)).to.equal(depositAmount);

    await ethers.provider.send('evm_increaseTime', [timestampNDays(21)]);

    await expect(getVaultVested().connect(user1).withdrawWithoutFees())
        .to.emit(getVaultVested(), 'Withdrawn')
        .withArgs(user1.address, "1000000000000000000", "0");

    // User1 no global balance in vault
    expect(await getVaultVested().balanceOf(user1.address)).to.equal(depositAmount.div(2));

    // User1 global balance received into their address account must be 99% of amount.
    expect(await getNativeToken().balanceOf(user1.address)).to.equal(depositAmount.div(2));

    // Locked vault receives 1% of deposit as penalty fee.
    expect(await getNativeToken().balanceOf(getVaultLocked().address)).to.equal(0);
  });

  it("Withdraw without penalty fees 2", async function () {
    const depositAmount = bep20Amount(2);

    // 1 % penalty fee within 30 days.
    await getVaultVested().setPenaltyFees(100, timestampNDays(30));

    await getNativeToken().connect(owner).transfer(depositary1.address, depositAmount);
    await getNativeToken().connect(depositary1).approve(getVaultVested().address, depositAmount);
    await getVaultVested().connect(owner).setDepositary(depositary1.address, true);
    await getVaultVested().connect(depositary1).deposit(depositAmount.div(2), user1.address);

    expect(await getVaultVested().balanceOf(user1.address)).to.equal(depositAmount.div(2));

    await ethers.provider.send('evm_increaseTime', [timestampNDays(10)]);

    await getVaultVested().connect(depositary1).deposit(depositAmount.div(2), user1.address);

    expect(await getVaultVested().balanceOf(user1.address)).to.equal(depositAmount);

    await ethers.provider.send('evm_increaseTime', [timestampNDays(21)]);

    await expect(getVaultVested().connect(user1).withdrawWithoutFees())
        .to.emit(getVaultVested(), 'Withdrawn')
        .withArgs(user1.address, "1000000000000000000", "0");

    // User1 no global balance in vault
    expect(await getVaultVested().balanceOf(user1.address)).to.equal(depositAmount.div(2));

    // User1 global balance received into their address account must be 99% of amount.
    expect(await getNativeToken().balanceOf(user1.address)).to.equal(depositAmount.div(2));

    // Locked vault receives 1% of deposit as penalty fee.
    expect(await getNativeToken().balanceOf(getVaultLocked().address)).to.equal(0);
  });

  it("Withdraw without penalty fees 3", async function () {
    const depositAmount = bep20Amount(2);

    // 1 % penalty fee within 30 days.
    await getVaultVested().setPenaltyFees(100, timestampNDays(30));

    await getNativeToken().connect(owner).transfer(depositary1.address, depositAmount);
    await getNativeToken().connect(depositary1).approve(getVaultVested().address, depositAmount);
    await getVaultVested().connect(owner).setDepositary(depositary1.address, true);
    await getVaultVested().connect(depositary1).deposit(depositAmount.div(2), user1.address);

    expect(await getVaultVested().balanceOf(user1.address)).to.equal(depositAmount.div(2));

    await ethers.provider.send('evm_increaseTime', [timestampNDays(10)]);

    await getVaultVested().connect(depositary1).deposit(depositAmount.div(2), user1.address);

    expect(await getVaultVested().balanceOf(user1.address)).to.equal(depositAmount);

    await ethers.provider.send('evm_increaseTime', [timestampNDays(21)]);

    await expect(getVaultVested().connect(user1).withdrawWithoutFees())
        .to.emit(getVaultVested(), 'Withdrawn')
        .withArgs(user1.address, "1000000000000000000", "0");

    // User1 no global balance in vault
    expect(await getVaultVested().balanceOf(user1.address)).to.equal(depositAmount.div(2));

    // User1 global balance received into their address account must be 99% of amount.
    expect(await getNativeToken().balanceOf(user1.address)).to.equal(depositAmount.div(2));

    // Locked vault receives 1% of deposit as penalty fee.
    expect(await getNativeToken().balanceOf(getVaultLocked().address)).to.equal(0);
  });
});