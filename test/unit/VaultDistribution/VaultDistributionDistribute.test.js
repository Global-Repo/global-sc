const ethers = require("hardhat").ethers;
const { expect } = require("chai");
const { BigNumber } = require("@ethersproject/bignumber");

const TOKEN_DECIMALS = 18;
const BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER = BigNumber.from(10).pow(TOKEN_DECIMALS);
const MIN_BNB_AMOUNT_TO_DISTRIBUTE = BigNumber.from(6).mul(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER);

let wbnb;
let global;
let vaultDistribution;

beforeEach(async function () {
  [owner, devPower, depositary1, depositary2, beneficiary1, beneficiary2, beneficiary3, ...addrs] = await ethers.getSigners();

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
  await global.mint(INITIAL_SUPPLY);
});

describe("VaultDistribution: Distribute", function () {
  it("Distributes BNBs between Global's depositories equitably", async function () {
    const bnbAmountPerDepositary = BigNumber.from(5).mul(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER);
    const globalAmountBeneficiary1 = BigNumber.from(5).mul(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER);
    const globalAmountBeneficiary2 = BigNumber.from(3).mul(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER);
    const globalAmountBeneficiary3 = BigNumber.from(2).mul(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER);

    // Set up globals and bnb between depositories and beneficiaries.
    await wbnb.connect(owner).transfer(depositary1.address, bnbAmountPerDepositary);
    await wbnb.connect(owner).transfer(depositary2.address, bnbAmountPerDepositary);
    await global.connect(owner).transfer(beneficiary1.address, globalAmountBeneficiary1);
    await global.connect(owner).transfer(beneficiary2.address, globalAmountBeneficiary2);
    await global.connect(owner).transfer(beneficiary3.address, globalAmountBeneficiary3);

    // Set up vault preferences
    await vaultDistribution.connect(devPower).setMinTokenAmountToDistribute(MIN_BNB_AMOUNT_TO_DISTRIBUTE);
    await wbnb.connect(depositary1).approve(vaultDistribution.address, bnbAmountPerDepositary);
    await wbnb.connect(depositary2).approve(vaultDistribution.address, bnbAmountPerDepositary);
    await vaultDistribution.connect(devPower).setDepositary(depositary1.address, true);
    await vaultDistribution.connect(devPower).setDepositary(depositary2.address, true);
    await vaultDistribution.connect(devPower).addBeneficiary(beneficiary1.address);
    await vaultDistribution.connect(devPower).addBeneficiary(beneficiary2.address);
    await vaultDistribution.connect(devPower).addBeneficiary(beneficiary3.address);
    expect(await wbnb.balanceOf(vaultDistribution.address)).equal(0);

    // Starting test.
    // First deposit of 5bnb does not trigger distribution process because of the minimum configured is 6bnb
    await vaultDistribution.connect(depositary1).deposit(bnbAmountPerDepositary);
    expect(await wbnb.balanceOf(vaultDistribution.address)).equal(bnbAmountPerDepositary);
    expect(await wbnb.balanceOf(beneficiary1.address)).equal(0);
    expect(await wbnb.balanceOf(beneficiary2.address)).equal(0);
    expect(await wbnb.balanceOf(beneficiary3.address)).equal(0);

    // Second deposit of 5bnb make vault to have 10bnb so it runs the distribution process between 3 beneficiaries.
    await expect(vaultDistribution.connect(depositary2).deposit(bnbAmountPerDepositary))
        .to.emit(vaultDistribution, 'Distributed')
        .withArgs(bnbAmountPerDepositary.mul(2), 3);

    // Because vault have 10bnb and there are 10globals between beneficiaries so distribution is gonna be 1bnb per global
    const expectedBnbAmountForBeneficiary1 = globalAmountBeneficiary1;
    const expectedBnbAmountForBeneficiary2 = globalAmountBeneficiary2;
    const expectedBnbAmountForBeneficiary3 = globalAmountBeneficiary3;

    expect(await wbnb.balanceOf(beneficiary1.address)).equal(expectedBnbAmountForBeneficiary1);
    expect(await wbnb.balanceOf(beneficiary2.address)).equal(expectedBnbAmountForBeneficiary2);
    expect(await wbnb.balanceOf(beneficiary3.address)).equal(expectedBnbAmountForBeneficiary3);
    expect(await wbnb.balanceOf(vaultDistribution.address)).equal(0);
  });
});