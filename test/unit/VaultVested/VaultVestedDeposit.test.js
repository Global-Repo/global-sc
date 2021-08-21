const { expect } = require("chai");
const { bep20Amount } = require("../../helpers/utils.js");
const {
  deploy,
  getNativeToken,
  getBnb,
  getVaultVested,
  getMinter,
} = require("../../helpers/vaultVestedDeploy.js");
const INITIAL_SUPPLY = bep20Amount(100);

beforeEach(async function () {
  await deploy();

  // Set up scenarios
  await getBnb().mint(INITIAL_SUPPLY);

  await getNativeToken().mint(INITIAL_SUPPLY);
  await getMinter().addAddressToWhitelist(getVaultVested().address);
  await getNativeToken().transferOwnership(getMinter().address);
});

describe("VaultVested: Deposit", function () {
  it("Deposit globals as user for other user", async function () {
    const depositAmount = bep20Amount(2);

    await getNativeToken().connect(owner).transfer(depositary1.address, depositAmount);
    await getNativeToken().connect(depositary1).approve(getVaultVested().address, depositAmount);
    await getVaultVested().connect(owner).setDepositary(depositary1.address, true);

    // As depository1 deposits globals for depository2.
    await getVaultVested().connect(depositary1).deposit(depositAmount, depositary2.address);
    expect(await getVaultVested().balanceOf(depositary2.address)).to.equal(depositAmount);
    expect(await getVaultVested().balanceOf(depositary1.address)).to.equal(0);
  });
});