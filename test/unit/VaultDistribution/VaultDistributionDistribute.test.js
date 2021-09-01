const ethers = require("hardhat").ethers;
const { expect } = require("chai");
const { bep20Amount, timestampNHours } = require("../../helpers/utils.js");
const {
  deploy,
  getNativeToken,
  getBnb,
  getVaultDistribution,
} = require("../../helpers/vaultDistributionDeploy");
const {timestampNDays} = require("../../helpers/utils");

const MIN_BNB_AMOUNT_TO_DISTRIBUTE = bep20Amount(6);

let beneficiaryMock1;
let beneficiaryMock2;
let beneficiaryMock3;

beforeEach(async function () {
  await deploy();
  const INITIAL_SUPPLY = bep20Amount(100);
  await getBnb().mint(INITIAL_SUPPLY);
  await getNativeToken().mint(INITIAL_SUPPLY);

  const BeneficiaryMock1 = await ethers.getContractFactory("BeneficiaryMock");
  beneficiaryMock1 = await BeneficiaryMock1.deploy();
  await beneficiaryMock1.deployed();
  const BeneficiaryMock2 = await ethers.getContractFactory("BeneficiaryMock");
  beneficiaryMock2 = await BeneficiaryMock2.deploy();
  await beneficiaryMock2.deployed();
  const BeneficiaryMock3 = await ethers.getContractFactory("BeneficiaryMock");
  beneficiaryMock3 = await BeneficiaryMock3.deploy();
  await beneficiaryMock3.deployed();
});

describe("VaultDistribution: Distribute", function () {
  it("Distributes BNBs between Global's depositories equitably", async function () {
    const bnbAmountPerDepositary = bep20Amount(5);
    const globalAmountBeneficiary1 = bep20Amount(5);
    const globalAmountBeneficiary2 = bep20Amount(3);
    const globalAmountBeneficiary3 = bep20Amount(2);

    // Set up globals and bnb between depositories and beneficiaries.
    await getBnb().connect(owner).transfer(depositary1.address, bnbAmountPerDepositary);
    await getBnb().connect(owner).transfer(depositary2.address, bnbAmountPerDepositary);
    await getNativeToken().connect(owner).transfer(beneficiaryMock1.address, globalAmountBeneficiary1);
    await getNativeToken().connect(owner).transfer(beneficiaryMock2.address, globalAmountBeneficiary2);
    await getNativeToken().connect(owner).transfer(beneficiaryMock3.address, globalAmountBeneficiary3);

    // Set up vault preferences
    await getVaultDistribution().setMinTokenAmountToDistribute(MIN_BNB_AMOUNT_TO_DISTRIBUTE);
    await getBnb().connect(depositary1).approve(getVaultDistribution().address, bnbAmountPerDepositary);
    await getBnb().connect(depositary2).approve(getVaultDistribution().address, bnbAmountPerDepositary);
    await getVaultDistribution().setDepositary(depositary1.address, true);
    await getVaultDistribution().setDepositary(depositary2.address, true);
    await getVaultDistribution().addBeneficiary(beneficiaryMock1.address);
    await getVaultDistribution().addBeneficiary(beneficiaryMock2.address);
    await getVaultDistribution().addBeneficiary(beneficiaryMock3.address);
    expect(await getBnb().balanceOf(getVaultDistribution().address)).equal(0);

    // Starting test.
    // First deposit of 5bnb does not trigger distribution process because of the minimum configured is 6bnb
    await getVaultDistribution().connect(depositary1).deposit(bnbAmountPerDepositary);
    expect(await getBnb().balanceOf(getVaultDistribution().address)).equal(bnbAmountPerDepositary);
    expect(await getBnb().balanceOf(beneficiaryMock1.address)).equal(0);
    expect(await getBnb().balanceOf(beneficiaryMock2.address)).equal(0);
    expect(await getBnb().balanceOf(beneficiaryMock3.address)).equal(0);

    // Second deposit of 5bnb make vault to have 10bnb so it runs the distribution process between 3 beneficiaries.
    await expect(getVaultDistribution().connect(depositary2).deposit(bnbAmountPerDepositary))
        .to.not.emit(getVaultDistribution(), 'Distributed')
        .withArgs(bnbAmountPerDepositary.mul(2), 3);

    await ethers.provider.send('evm_increaseTime', [timestampNHours(12)]);

    await expect(getVaultDistribution().connect(depositary2).deposit(0))
        .to.emit(getVaultDistribution(), 'Distributed')
        .withArgs(bnbAmountPerDepositary.mul(2), 3);

    // Because vault have 10bnb and there are 10globals between beneficiaries so distribution is gonna be 1bnb per global
    const expectedBnbAmountForBeneficiary1 = globalAmountBeneficiary1;
    const expectedBnbAmountForBeneficiary2 = globalAmountBeneficiary2;
    const expectedBnbAmountForBeneficiary3 = globalAmountBeneficiary3;

    expect(await getBnb().balanceOf(beneficiaryMock1.address)).equal(expectedBnbAmountForBeneficiary1);
    expect(await getBnb().balanceOf(beneficiaryMock2.address)).equal(expectedBnbAmountForBeneficiary2);
    expect(await getBnb().balanceOf(beneficiaryMock3.address)).equal(expectedBnbAmountForBeneficiary3);
    expect(await getBnb().balanceOf(getVaultDistribution().address)).equal(0);
  });
});