const ethers = require("hardhat").ethers;
const { expect } = require("chai");
const { BigNumber } = require("@ethersproject/bignumber");
const {
  deployToken,
  deployGlobal,
  deploySmartChefFactoryGlobal, deploySmartChefFactory,
} = require("../../helpers/singleDeploys.js");

async function WaitBlocks(blockNum)
{
  for (var i = 0; i < blockNum; i++)
  {
    await ethers.provider.send("evm_mine");
  }
}

const TOKEN_DECIMALS = 18;
const BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER = BigNumber.from(10).pow(TOKEN_DECIMALS);

let startBlock = null;

let nativeToken;
let tokenA;
let tokenB;
let smartChefFactoryGlobal;
let smartChefGlobal;

beforeEach(async function () {
  [owner, addr1, addr2, addr3, ...addrs] = await ethers.getSigners();

  const CURRENT_BLOCK = await ethers.provider.getBlockNumber();

  nativeToken = await deployGlobal();
  tokenA = await deployToken("Token A", "A");
  tokenB = await deployToken("Token B", "B");
  const INITIAL_SUPPLY = BigNumber.from(1000000).mul(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER);

  await tokenA.mint(INITIAL_SUPPLY);
  await nativeToken.mint(INITIAL_SUPPLY);

  startBlock = CURRENT_BLOCK + 1;
  const endBlock = await ethers.provider.getBlockNumber() + 100;

  smartChefFactoryGlobal = await deploySmartChefFactoryGlobal();

  const tx1 = await smartChefFactoryGlobal.deployPool(
      nativeToken.address,
      nativeToken.address,
      BigNumber.from(10).mul(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER),
      startBlock,
      endBlock,
      0,//BigNumber.from(1000).mul(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER),
      owner.address
  );
  const result1 = await tx1.wait();
  const smartChefAddress1 = result1.events[2].args[0];
  await nativeToken.transfer(smartChefAddress1, BigNumber.from(1000).mul(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER));

  const SmartChefGlobal = await ethers.getContractFactory("SmartChefGlobal");
  smartChefGlobal = await SmartChefGlobal.attach(smartChefAddress1);

  /*expect(await smartChefFactoryGlobal.deployPool(
      nativeToken.address,
      nativeToken.address,
      BigNumber.from(10).mul(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER),
      startBlock,
      endBlock,
      0,//BigNumber.from(1000).mul(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER),
      owner.address
  )).to.emit("NewSmartChefContract");*/

  await nativeToken.transfer(addr1.address, BigNumber.from(1).mul(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER));
  await nativeToken.connect(addr1).approve(smartChefAddress1, BigNumber.from(1).mul(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER));

  await nativeToken.transfer(addr2.address, BigNumber.from(3).mul(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER));
  await nativeToken.connect(addr2).approve(smartChefAddress1, BigNumber.from(3).mul(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER));

  await nativeToken.transfer(addr3.address, BigNumber.from(6).mul(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER));
  await nativeToken.connect(addr3).approve(smartChefAddress1, BigNumber.from(6).mul(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER));

});

describe("SmartChefFactoryGlobal: After deployment", function () {
  xit("Should work with 1 user", async function () {
    expect(await smartChefGlobal.connect(addr2).deposit(BigNumber.from(1).mul(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER))).to.emit(smartChefGlobal, 'Deposit')
        .withArgs(addr2.address, BigNumber.from(1).mul(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER));
    await WaitBlocks(5);
    expect((await smartChefGlobal.pendingReward(addr2.address)).div(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER)).to.equal(50);
    await WaitBlocks(3);
    expect((await smartChefGlobal.pendingReward(addr2.address)).div(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER)).to.equal(80);
    expect(await smartChefGlobal.connect(addr2).deposit(BigNumber.from(1).mul(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER))).to.emit(smartChefGlobal, 'Deposit')
        .withArgs(addr2.address, BigNumber.from(1).mul(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER));
    expect((await smartChefGlobal.pendingReward(addr2.address)).div(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER)).to.equal(0);
    expect((await nativeToken.balanceOf(addr2.address)).div(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER)).to.equal(91);
    await WaitBlocks(4);
    expect((await smartChefGlobal.pendingReward(addr2.address)).div(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER)).to.equal(40);
    expect(await smartChefGlobal.connect(addr2).withdraw(BigNumber.from(2).mul(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER))).to.emit(smartChefGlobal, 'Withdraw')
        .withArgs(addr2.address, BigNumber.from(2).mul(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER));
    expect((await nativeToken.balanceOf(addr2.address)).div(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER)).to.equal(143);
    //console.log((await smartChefGlobal.pendingReward(addr1.address)).div(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER).toString());
  });
  xit("Should work with 2 users", async function () {
    expect(await smartChefGlobal.connect(addr1).deposit(BigNumber.from(1).mul(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER))).to.emit(smartChefGlobal, 'Deposit')
        .withArgs(addr1.address, BigNumber.from(1).mul(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER));
    expect(await smartChefGlobal.connect(addr2).deposit(BigNumber.from(1).mul(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER))).to.emit(smartChefGlobal, 'Deposit')
        .withArgs(addr2.address, BigNumber.from(1).mul(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER));
    await WaitBlocks(7);
    expect((await smartChefGlobal.pendingReward(addr1.address)).div(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER)).to.equal(45);
    expect((await smartChefGlobal.pendingReward(addr2.address)).div(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER)).to.equal(35);
    await WaitBlocks(5);
    expect((await smartChefGlobal.pendingReward(addr1.address)).div(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER)).to.equal(70);
    expect((await smartChefGlobal.pendingReward(addr2.address)).div(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER)).to.equal(60);
    expect(await smartChefGlobal.connect(addr2).deposit(BigNumber.from(2).mul(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER))).to.emit(smartChefGlobal, 'Deposit')
        .withArgs(addr2.address, BigNumber.from(2).mul(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER));
    expect((await smartChefGlobal.pendingReward(addr1.address)).div(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER)).to.equal(75);
    expect((await nativeToken.balanceOf(addr2.address)).div(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER)).to.equal(65);
    expect((await smartChefGlobal.pendingReward(addr2.address)).div(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER)).to.equal(0);
    await WaitBlocks(40);
    expect((await smartChefGlobal.pendingReward(addr1.address)).div(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER)).to.equal(175);
    expect((await smartChefGlobal.pendingReward(addr2.address)).div(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER)).to.equal(300);

    await WaitBlocks(3);
    expect(await smartChefGlobal.connect(addr1).withdraw(BigNumber.from(1).mul(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER))).to.emit(smartChefGlobal, 'Withdraw')
        .withArgs(addr1.address, BigNumber.from(1).mul(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER));
    expect((await nativeToken.balanceOf(addr2.address)).div(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER)).to.equal(65);
    expect((await smartChefGlobal.pendingReward(addr2.address)).div(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER)).to.equal(330);

    expect(await smartChefGlobal.connect(addr2).withdraw(BigNumber.from(3).mul(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER))).to.emit(smartChefGlobal, 'Withdraw')
        .withArgs(addr2.address, BigNumber.from(3).mul(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER));
    expect((await smartChefGlobal.pendingReward(addr1.address)).div(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER)).to.equal(0);
    expect((await smartChefGlobal.pendingReward(addr2.address)).div(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER)).to.equal(0);
    expect((await nativeToken.balanceOf(addr1.address)).div(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER)).to.equal(186);
    expect((await nativeToken.balanceOf(addr2.address)).div(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER)).to.equal(407);//arrodoniment de 407.9999999

  });
  xit("Should work with 3 users", async function () {
    expect(await smartChefGlobal.connect(addr1).deposit(BigNumber.from(1).mul(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER))).to.emit(smartChefGlobal, 'Deposit')
        .withArgs(addr1.address, BigNumber.from(1).mul(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER));
    expect(await smartChefGlobal.connect(addr2).deposit(BigNumber.from(3).mul(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER))).to.emit(smartChefGlobal, 'Deposit')
        .withArgs(addr2.address, BigNumber.from(3).mul(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER));
    await WaitBlocks(3);
    expect(await smartChefGlobal.connect(addr3).deposit(BigNumber.from(6).mul(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER))).to.emit(smartChefGlobal, 'Deposit')
        .withArgs(addr3.address, BigNumber.from(6).mul(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER));
    expect((await smartChefGlobal.pendingReward(addr1.address)).div(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER)).to.equal(20);
    expect((await smartChefGlobal.pendingReward(addr2.address)).div(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER)).to.equal(30);
    expect((await smartChefGlobal.pendingReward(addr3.address)).div(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER)).to.equal(0);
    expect((await nativeToken.balanceOf(addr1.address)).div(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER)).to.equal(0);
    expect((await nativeToken.balanceOf(addr2.address)).div(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER)).to.equal(0);
    expect((await nativeToken.balanceOf(addr3.address)).div(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER)).to.equal(0);

    await WaitBlocks(5);
    expect((await smartChefGlobal.pendingReward(addr1.address)).div(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER)).to.equal(25);
    expect((await smartChefGlobal.pendingReward(addr2.address)).div(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER)).to.equal(45);
    expect((await smartChefGlobal.pendingReward(addr3.address)).div(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER)).to.equal(30);

    await WaitBlocks(10);
    expect((await smartChefGlobal.pendingReward(addr1.address)).div(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER)).to.equal(35);
    expect((await smartChefGlobal.pendingReward(addr2.address)).div(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER)).to.equal(75);
    expect((await smartChefGlobal.pendingReward(addr3.address)).div(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER)).to.equal(90);

    expect((await nativeToken.balanceOf(addr1.address)).div(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER)).to.equal(0);
    expect(await smartChefGlobal.connect(addr1).withdraw(BigNumber.from(1).mul(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER))).to.emit(smartChefGlobal, 'Withdraw')
        .withArgs(addr1.address, BigNumber.from(1).mul(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER));
    expect((await nativeToken.balanceOf(addr1.address)).div(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER)).to.equal(37);

    expect((await nativeToken.balanceOf(addr2.address)).div(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER)).to.equal(0);
    expect(await smartChefGlobal.connect(addr2).withdraw(BigNumber.from(3).mul(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER))).to.emit(smartChefGlobal, 'Withdraw')
        .withArgs(addr2.address, BigNumber.from(3).mul(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER));
    expect((await nativeToken.balanceOf(addr2.address)).div(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER)).to.equal(84);//arrodoniment de 84.3333333

    expect((await nativeToken.balanceOf(addr3.address)).div(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER)).to.equal(0);
    expect(await smartChefGlobal.connect(addr3).withdraw(BigNumber.from(3).mul(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER))).to.emit(smartChefGlobal, 'Withdraw')
        .withArgs(addr3.address, BigNumber.from(3).mul(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER));
    expect((await nativeToken.balanceOf(addr3.address)).div(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER)).to.equal(115);//arrodoniment de 115.66666


    expect((await smartChefGlobal.pendingReward(addr1.address)).div(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER)).to.equal(0);
    expect((await smartChefGlobal.pendingReward(addr2.address)).div(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER)).to.equal(0);
    expect((await smartChefGlobal.pendingReward(addr3.address)).div(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER)).to.equal(0);

  });

  it("EmergencyWithdraw", async function () {
    expect(await smartChefGlobal.connect(addr1).deposit(BigNumber.from(1).mul(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER))).to.emit(smartChefGlobal, 'Deposit')
        .withArgs(addr1.address, BigNumber.from(1).mul(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER));
    await WaitBlocks(10);

    expect(await nativeToken.balanceOf(addr1.address)).to.equal(0);
    expect((await smartChefGlobal.userInfo(addr1.address)).amount).to.equal(BigNumber.from(1).mul(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER));
    expect(await smartChefGlobal.pendingReward(addr1.address)).to.equal(BigNumber.from(100).mul(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER));

    expect(await smartChefGlobal.connect(addr1).emergencyWithdraw()).to.emit(smartChefGlobal, 'EmergencyWithdraw')
        .withArgs(addr1.address, BigNumber.from(1).mul(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER));

    expect((await nativeToken.balanceOf(addr1.address)).div(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER)).to.equal(1);
    expect(await smartChefGlobal.pendingReward(addr1.address)).to.equal(0);
    expect((await smartChefGlobal.userInfo(addr1.address)).amount).to.equal(0);
  });

  it("EmergencyWithdraw with 2 users", async function () {
    expect(await smartChefGlobal.connect(addr1).deposit(BigNumber.from(1).mul(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER))).to.emit(smartChefGlobal, 'Deposit')
        .withArgs(addr1.address, BigNumber.from(1).mul(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER));
    expect(await smartChefGlobal.connect(addr2).deposit(BigNumber.from(3).mul(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER))).to.emit(smartChefGlobal, 'Deposit')
        .withArgs(addr2.address, BigNumber.from(3).mul(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER));
    await WaitBlocks(10);

    expect(await nativeToken.balanceOf(addr1.address)).to.equal(0);
    expect(await nativeToken.balanceOf(addr2.address)).to.equal(0);

    expect((await smartChefGlobal.userInfo(addr1.address)).amount).to.equal(BigNumber.from(1).mul(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER));
    expect((await smartChefGlobal.userInfo(addr2.address)).amount).to.equal(BigNumber.from(3).mul(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER));

    expect(await smartChefGlobal.pendingReward(addr1.address)).to.equal(BigNumber.from(35).mul(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER));
    expect(await smartChefGlobal.pendingReward(addr2.address)).to.equal(BigNumber.from(75).mul(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER));

    expect(await smartChefGlobal.connect(addr1).emergencyWithdraw()).to.emit(smartChefGlobal, 'EmergencyWithdraw')
        .withArgs(addr1.address, BigNumber.from(1).mul(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER));

    expect((await nativeToken.balanceOf(addr1.address)).div(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER)).to.equal(1);
    expect((await nativeToken.balanceOf(addr2.address)).div(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER)).to.equal(0);

    expect((await smartChefGlobal.userInfo(addr1.address)).amount).to.equal(0);
    expect((await smartChefGlobal.userInfo(addr2.address)).amount).to.equal(BigNumber.from(3).mul(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER));

    expect(await smartChefGlobal.pendingReward(addr1.address)).to.equal(0);
    expect((await smartChefGlobal.pendingReward(addr2.address)).div(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER)).to.equal(109);

    expect(await smartChefGlobal.connect(addr2).emergencyWithdraw()).to.emit(smartChefGlobal, 'EmergencyWithdraw')
        .withArgs(addr2.address, BigNumber.from(3).mul(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER));

    expect((await nativeToken.balanceOf(addr1.address)).div(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER)).to.equal(1);
    expect((await nativeToken.balanceOf(addr2.address)).div(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER)).to.equal(3);

    expect((await smartChefGlobal.userInfo(addr1.address)).amount).to.equal(0);
    expect((await smartChefGlobal.userInfo(addr2.address)).amount).to.equal(0);

    expect(await smartChefGlobal.pendingReward(addr1.address)).to.equal(0);
    expect(await smartChefGlobal.pendingReward(addr2.address)).to.equal(0);
  });

  it("EmergencyRewardWithdraw", async function () {
    expect((await nativeToken.balanceOf(owner.address)).div(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER)).to.equal(998990);
    await smartChefGlobal.emergencyRewardWithdraw(BigNumber.from(10).mul(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER));
    expect((await nativeToken.balanceOf(owner.address)).div(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER)).to.equal(999000);
  });

  it("EmergencyRewardWithdraw with 2 users", async function () {
    expect((await nativeToken.balanceOf(owner.address)).div(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER)).to.equal(998990);
    await smartChefGlobal.emergencyRewardWithdraw(BigNumber.from(10).mul(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER));
    expect((await nativeToken.balanceOf(owner.address)).div(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER)).to.equal(999000);

    expect(await smartChefGlobal.connect(addr1).deposit(BigNumber.from(1).mul(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER))).to.emit(smartChefGlobal, 'Deposit')
        .withArgs(addr1.address, BigNumber.from(1).mul(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER));
    expect(await smartChefGlobal.connect(addr2).deposit(BigNumber.from(3).mul(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER))).to.emit(smartChefGlobal, 'Deposit')
        .withArgs(addr2.address, BigNumber.from(3).mul(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER));
    await WaitBlocks(10);

    expect((await nativeToken.balanceOf(owner.address)).div(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER)).to.equal(999000);
    await smartChefGlobal.emergencyRewardWithdraw(BigNumber.from(10).mul(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER));
    expect((await nativeToken.balanceOf(owner.address)).div(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER)).to.equal(999010);

    expect(await smartChefGlobal.connect(addr1).withdraw(BigNumber.from(1).mul(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER))).to.emit(smartChefGlobal, 'Withdraw')
        .withArgs(addr1.address, BigNumber.from(1).mul(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER));
    expect(await smartChefGlobal.connect(addr2).withdraw(BigNumber.from(3).mul(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER))).to.emit(smartChefGlobal, 'Withdraw')
        .withArgs(addr2.address, BigNumber.from(3).mul(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER));

    expect((await nativeToken.balanceOf(owner.address)).div(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER)).to.equal(999010);
    await smartChefGlobal.emergencyRewardWithdraw(BigNumber.from(10).mul(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER));
    expect((await nativeToken.balanceOf(owner.address)).div(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER)).to.equal(999020);
  });

  it("EmergencyRewardWithdraw too high", async function () {
    expect((await nativeToken.balanceOf(owner.address)).div(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER)).to.equal(998990);
    await expect(smartChefGlobal.emergencyRewardWithdraw(BigNumber.from(1001).mul(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER))).to.be.revertedWith("Cannot withdraw more than the deposited rewards");;
    expect((await nativeToken.balanceOf(owner.address)).div(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER)).to.equal(998990);
    await smartChefGlobal.emergencyRewardWithdraw(BigNumber.from(1000).mul(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER));
    expect((await nativeToken.balanceOf(owner.address)).div(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER)).to.equal(999990);
  });
});