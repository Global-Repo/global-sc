const { expect } = require("chai");
const {
  deploy,
  getNativeToken,
  getVaultLocked,
} = require("../../helpers/vaultLockedDeploy.js");
const {ethers} = require("hardhat");
const {timestampNDays, timestampNow, bep20Amount} = require("../../helpers/utils");
const INITIAL_SUPPLY = bep20Amount(100);

beforeEach(async function () {
  await deploy();

  await getNativeToken().mint(INITIAL_SUPPLY);
  const depositAmount = bep20Amount(20);

  await getNativeToken().connect(owner).transfer(user1.address, depositAmount);
  await getNativeToken().connect(owner).transfer(user2.address, depositAmount);
});

describe("VaultLocked: After deployment", function () {
  it("Check Global pool id (pid)", async function () {
    expect(await getVaultLocked().pid()).to.equal(0);

  });

  it("Check deposit mapping", async function () {
    let vaultLocked =await getVaultLocked();

    await getNativeToken().connect(user1).approve(getVaultLocked().address, bep20Amount(5));
    expect(await vaultLocked.connect(user1).deposit(bep20Amount(5))).to.emit(vaultLocked,"Deposited")
        .withArgs(user1.address,bep20Amount(5));
    expect(await vaultLocked.amountOfUser(user1.address)).to.equal(bep20Amount(5));
    expect(await vaultLocked.amountOfUser(user2.address)).to.equal(bep20Amount(0));

    await getNativeToken().connect(user1).approve(getVaultLocked().address, bep20Amount(8));
    expect(await vaultLocked.connect(user1).deposit(bep20Amount(8))).to.emit(vaultLocked,"Deposited")
        .withArgs(user1.address,bep20Amount(8));
    expect(await vaultLocked.amountOfUser(user1.address)).to.equal(bep20Amount(13));
    expect(await vaultLocked.amountOfUser(user2.address)).to.equal(bep20Amount(0));

    await getNativeToken().connect(user2).approve(getVaultLocked().address, bep20Amount(7));
    expect(await vaultLocked.connect(user2).deposit(bep20Amount(7))).to.emit(vaultLocked,"Deposited")
        .withArgs(user2.address,bep20Amount(7));
    expect(await vaultLocked.amountOfUser(user1.address)).to.equal(bep20Amount(13));
    expect(await vaultLocked.amountOfUser(user2.address)).to.equal(bep20Amount(7));
    expect(await vaultLocked.totalSupply()).to.equal(bep20Amount(20));

    expect(await vaultLocked.availableForWithdraw(await timestampNow(),user1.address)).to.equal(bep20Amount(0));
    expect(await vaultLocked.availableForWithdraw(await timestampNow(),user2.address)).to.equal(bep20Amount(0));
    expect(await vaultLocked.availableForWithdraw(await timestampNow()+timestampNDays(31),user1.address)).to.equal(bep20Amount(13));
    expect(await vaultLocked.availableForWithdraw(await timestampNow()+timestampNDays(31),user2.address)).to.equal(bep20Amount(7));

    await ethers.provider.send('evm_increaseTime', [timestampNDays(10)]);

    await getNativeToken().connect(user2).approve(getVaultLocked().address, bep20Amount(8));
    expect(await vaultLocked.connect(user2).deposit(bep20Amount(8))).to.emit(vaultLocked,"Deposited")
        .withArgs(user2.address,bep20Amount(8));
    expect(await vaultLocked.availableForWithdraw(await timestampNow(),user2.address)).to.equal(bep20Amount(0));
    expect(await vaultLocked.availableForWithdraw(await timestampNow()+timestampNDays(21),user2.address)).to.equal(bep20Amount(7));
    expect(await vaultLocked.availableForWithdraw(await timestampNow()+timestampNDays(31),user2.address)).to.equal(bep20Amount(15));

    await expect(vaultLocked.connect(user1).withdraw()).to.be.revertedWith("VaultLocked: you have no tokens to withdraw!");
    await expect(vaultLocked.connect(user2).withdraw()).to.be.revertedWith("VaultLocked: you have no tokens to withdraw!");

    await ethers.provider.send('evm_increaseTime', [timestampNDays(21)]);

    expect(await vaultLocked.connect(user1).withdraw()).to.emit(vaultLocked,"Withdrawn").withArgs(user1.address,bep20Amount(13));
    expect(await vaultLocked.connect(user2).withdraw()).to.emit(vaultLocked,"Withdrawn").withArgs(user2.address,bep20Amount(7));

    await ethers.provider.send('evm_increaseTime', [timestampNDays(10)]);

    await expect(vaultLocked.connect(user1).withdraw()).to.be.revertedWith("VaultLocked: you have no tokens to withdraw!");
    expect(await vaultLocked.connect(user2).withdraw()).to.emit(vaultLocked,"Withdrawn").withArgs(user2.address,bep20Amount(8));

    /*console.log((await getNativeToken().balanceOf(user1.address)).toString());
    console.log((await getNativeToken().balanceOf(user2.address)).toString());*/
    //Estem al dia 41
    expect(await vaultLocked.availableForWithdraw(await timestampNow(),user1.address)).to.equal(bep20Amount(0));
    expect(await vaultLocked.availableForWithdraw(await timestampNow(),user2.address)).to.equal(bep20Amount(0));
    await getNativeToken().connect(user1).approve(getVaultLocked().address, bep20Amount(11));
    expect(await vaultLocked.connect(user1).deposit(bep20Amount(11))).to.emit(vaultLocked,"Deposited")
        .withArgs(user1.address,bep20Amount(11));
    await getNativeToken().connect(user2).approve(getVaultLocked().address, bep20Amount(12));
    expect(await vaultLocked.connect(user2).deposit(bep20Amount(12))).to.emit(vaultLocked,"Deposited")
        .withArgs(user2.address,bep20Amount(12));
    expect(await vaultLocked.availableForWithdraw(await timestampNow(),user1.address)).to.equal(bep20Amount(0));
    expect(await vaultLocked.availableForWithdraw(await timestampNow(),user2.address)).to.equal(bep20Amount(0));
    await expect(vaultLocked.connect(user1).withdraw()).to.be.revertedWith("VaultLocked: you have no tokens to withdraw!");
    await expect(vaultLocked.connect(user2).withdraw()).to.be.revertedWith("VaultLocked: you have no tokens to withdraw!");

  });
});