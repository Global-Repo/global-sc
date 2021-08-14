const { expect } = require("chai");
const { BigNumber } = require("@ethersproject/bignumber");
const { BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER, TIMESTAMP_3_DAYS } = require("../../helpers/constants.js");
const {
  deploy,
  getCakeToken,
  getNativeToken,
  getMinter,
  getCakeMasterChefMock,
  getVaultCake,
} = require("../../helpers/vaultCakeDeploy.js");

const OWNER_INITIAL_CAKES = BigNumber.from(100).mul(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER);

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

describe("PathFinder", function () {
  it("Cannot withdraw without previous deposit", async function () {
    expect(await getVaultCake().withdrawableBalanceOf(owner.address)).to.equal(0);
    await expect(
        getVaultCake().connect(user3).withdraw(BigNumber.from(0).mul(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER))
    ).to.be.revertedWith("Whitelist: caller is not on the whitelist");
  });

  it("Withdraw without fees", async function () {
    const depositAmount = BigNumber.from(5).mul(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER);
    const withdrawAmount = BigNumber.from(1).mul(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER);
    const expectedWithdraw = OWNER_INITIAL_CAKES.sub(depositAmount).add(withdrawAmount);

    // Needed to execute withdraw method.
    await getVaultCake().setWhitelist(owner.address, true);

    await getVaultCake().setWithdrawalFees(0, 0, 0);
    await getCakeToken().approve(getVaultCake().address, OWNER_INITIAL_CAKES);
    await getVaultCake().deposit(depositAmount);

    expect(await getVaultCake().withdrawableBalanceOf(owner.address)).to.equal(depositAmount);
    expect(await getVaultCake().withdraw(withdrawAmount))
        .to.emit(getVaultCake(), 'Withdrawn')
        .withArgs(owner.address, withdrawAmount, 0);

    expect(await getCakeToken().balanceOf(owner.address)).to.equal(expectedWithdraw);
  });

  it("Withdraw with fees but in whitelist do not pay withdraw fees", async function () {
    const depositAmount = BigNumber.from(5).mul(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER);
    const withdrawAmount = BigNumber.from(1).mul(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER);
    const expectedWithdraw = OWNER_INITIAL_CAKES.sub(depositAmount).add(withdrawAmount);

    // Needed to execute withdraw method.
    await getVaultCake().setWhitelist(owner.address, true);

    await getVaultCake().setWithdrawalFees(60, 40, TIMESTAMP_3_DAYS); // 0.6% and 0.4% = 1% in total
    await getCakeToken().approve(getVaultCake().address, OWNER_INITIAL_CAKES);
    await getVaultCake().deposit(depositAmount);

    expect(await getVaultCake().withdrawableBalanceOf(owner.address)).to.equal(depositAmount);
    expect(await getVaultCake().withdraw(withdrawAmount))
        .to.emit(getVaultCake(), 'Withdrawn')
        .withArgs(owner.address, withdrawAmount, 0);

    expect(await getCakeToken().balanceOf(owner.address)).to.equal(expectedWithdraw);
  });
});