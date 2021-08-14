const ethers = require("hardhat").ethers;
const { expect } = require("chai");
const { BigNumber } = require("@ethersproject/bignumber");

const TOKEN_DECIMALS = 18;
const BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER = BigNumber.from(10).pow(TOKEN_DECIMALS);

let wbnb;
let global;
let vaultDistribution;

beforeEach(async function () {
  [owner, devPower, depositary1, depositary2, ...addrs] = await ethers.getSigners();

  const Wbnb = await ethers.getContractFactory("BEP20");
  wbnb = await Wbnb.deploy('Wrapped BNB', 'WBNB');
  await wbnb.deployed();

  const Global = await ethers.getContractFactory("BEP20");
  global = await Global.deploy('Wrapped BNB', 'WBNB');
  await global.deployed();

  const VaultDistribution = await ethers.getContractFactory("VaultDistribution");
  vaultDistribution = await VaultDistribution.deploy(wbnb.address, global.address, devPower.address);
  await vaultDistribution.deployed();

  // Set up scenarios
  const INITIAL_SUPPLY = BigNumber.from(100).mul(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER);
  await wbnb.mint(INITIAL_SUPPLY);
});

describe("VaultDistribution: Depositories", function () {
  it("Only devPower is able to change depositories", async function () {
    await expect(vaultDistribution.setDepositary(depositary1.address, true))
        .to.be.revertedWith("DevPower: caller is not the dev with powers");

    await vaultDistribution.connect(devPower).setDepositary(depositary1.address, true);
    await vaultDistribution.connect(devPower).setDepositary(depositary2.address, false);
  });

  it("Only depositories are able to deposit", async function () {
    const depositAmount = BigNumber.from(5).mul(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER);

    await expect(vaultDistribution.deposit(depositAmount))
        .to.be.revertedWith("Only depositories can perform this action");

    await wbnb.connect(owner).transfer(depositary1.address, depositAmount);
    await wbnb.connect(depositary1).approve(vaultDistribution.address, depositAmount);
    await vaultDistribution.connect(devPower).setDepositary(depositary1.address, true);
    await vaultDistribution.connect(depositary1).deposit(depositAmount);
  });
});