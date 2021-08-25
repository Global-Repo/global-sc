const { expect } = require("chai");
const { BigNumber } = require("@ethersproject/bignumber");
const { timestampNDays } = require("../../helpers/utils");
const {
  deploy,
  getNativeToken,
  getGlobalMasterChef,
  getVaultCake,
} = require("../../helpers/vaultCakeDeploy.js");

const DEFAULT_WITHDRAWAL_FEES_BURN = 60;
const DEFAULT_WITHDRAWAL_FEES_TEAM = 10;
const DEFAULT_REWARDS_FEES_TO_USER = 7500;
const DEFAULT_REWARDS_FEES_TO_OPERATIONS = 400;
const DEFAULT_REWARDS_FEES_TO_BUY_GLOBAL = 600;
const DEFAULT_REWARDS_FEES_TO_BUY_BNB = 1500;
const DEFAULT_REWARDS_FEES_TO_MINT_GLOBAL = 25000;

beforeEach(async function () {
  await deploy();
  await getNativeToken().transferOwnership(getGlobalMasterChef().address);
});

describe("VaultCake: Fees", function () {
  it("Default withdrawal fees are properly configured", async function () {
    const {0: burn, 1: team, 2: interval} = await getVaultCake().withdrawalFees();

    expect(burn).to.equal(DEFAULT_WITHDRAWAL_FEES_BURN);
    expect(team).to.equal(DEFAULT_WITHDRAWAL_FEES_TEAM);
    expect(interval.toHexString()).to.equal(BigNumber.from(timestampNDays(4)));
  });

  it("Change withdrawal fees", async function () {
    const withdrawalFeesBurn = 70;
    const withdrawalFeesTeam = 20;

    await getVaultCake().setWithdrawalFees(withdrawalFeesBurn, withdrawalFeesTeam, timestampNDays(3));

    const {0: burn, 1: team, 2: interval} = await getVaultCake().withdrawalFees();

    expect(burn).to.equal(withdrawalFeesBurn);
    expect(team).to.equal(withdrawalFeesTeam);
    expect(interval.toHexString()).to.equal(BigNumber.from(timestampNDays(3)));
  });

  it("Withdrawal fees cannot to be higher than maximum withdrawal fees", async function () {
    const withdrawalFeesBurn = 70;
    const withdrawalFeesTeam = 40;

    await expect(
        getVaultCake().setWithdrawalFees(withdrawalFeesBurn, withdrawalFeesTeam, timestampNDays(3))
    ).to.be.revertedWith("Withdrawal fees too high");
  });

  it("Only owner can change withdrawal fees", async function () {
    const withdrawalFeesBurn = 70;
    const withdrawalFeesTeam = 20;

    await expect(
        getVaultCake().connect(user3).setWithdrawalFees(withdrawalFeesBurn, withdrawalFeesTeam, timestampNDays(3))
    ).to.be.revertedWith("Ownable: caller is not the owner");
  });

  it("Default rewards fees are properly configured", async function () {
    const {0: toUser, 1: toOperations, 2: toBuyGlobal, 3: toBuyBNB, 4: toMintGlobal} = await getVaultCake().rewards();

    expect(toUser).to.equal(DEFAULT_REWARDS_FEES_TO_USER);
    expect(toOperations).to.equal(DEFAULT_REWARDS_FEES_TO_OPERATIONS);
    expect(toBuyGlobal).to.equal(DEFAULT_REWARDS_FEES_TO_BUY_GLOBAL);
    expect(toBuyBNB).to.equal(DEFAULT_REWARDS_FEES_TO_BUY_BNB);
    expect(toMintGlobal).to.equal(DEFAULT_REWARDS_FEES_TO_MINT_GLOBAL);
  });

  it("Change rewards fees", async function () {
    const rewardsToUser = 8000;
    const rewardsToOperations = 500;
    const rewardsToBuyGlobal = 500;
    const rewardsToBuyBNB = 1000;
    const rewardsToMintGlobal = 20000;

    await getVaultCake().setRewards(rewardsToUser, rewardsToOperations, rewardsToBuyGlobal, rewardsToBuyBNB, rewardsToMintGlobal);

    const {0: toUser, 1: toOperations, 2: toBuyGlobal, 3: toBuyBNB, 4: toMintGlobal} = await getVaultCake().rewards();

    expect(toUser).to.equal(rewardsToUser);
    expect(toOperations).to.equal(rewardsToOperations);
    expect(toBuyGlobal).to.equal(rewardsToBuyGlobal);
    expect(toBuyBNB).to.equal(rewardsToBuyBNB);
    expect(toMintGlobal).to.equal(rewardsToMintGlobal);
  });

  it("Rewards fees must add up to 100%", async function () {
    const rewardsToUser = 8001;
    const rewardsToOperations = 500;
    const rewardsToBuyGlobal = 500;
    const rewardsToBuyBNB = 1000;
    const rewardsToMintGlobal = 20000;

    await expect(
        getVaultCake().setRewards(rewardsToUser, rewardsToOperations, rewardsToBuyGlobal, rewardsToBuyBNB, rewardsToMintGlobal)
    ).to.be.revertedWith("Rewards must add up to 100%");
  });

  it("Only owner can change rewards fees", async function () {
    const rewardsToUser = 8001;
    const rewardsToOperations = 500;
    const rewardsToBuyGlobal = 500;
    const rewardsToBuyBNB = 1000;
    const rewardsToMintGlobal = 20000;

    await expect(
        getVaultCake().connect(user3).setRewards(rewardsToUser, rewardsToOperations, rewardsToBuyGlobal, rewardsToBuyBNB, rewardsToMintGlobal)
    ).to.be.revertedWith("Ownable: caller is not the owner");
  });
});