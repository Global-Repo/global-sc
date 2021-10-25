const hre = require("hardhat");
require("@nomiclabs/hardhat-ethers");

const {
    GLOBAL_TOKEN_ADDRESS,
    WETH_ADDRESS,
    MASTERCHEF_ADDRESS,
    VAULT_LOCKED_ADDRESS,
    VAULT_DISTRIBUTION_ADDRESS,
    VAULT_VESTED_15_ADDRESS,
    VAULT_VESTED_30_ADDRESS,
    VAULT_VESTED_50_ADDRESS,
} = require("./addresses");

const {
    deployVaultVested,
} = require("../test/helpers/singleDeploys");

const { timestampNDays, bep20Amount } = require("../test/helpers/utils");

const VAULT_VESTED_MIN_BNB_TO_DISTRIBUTE = bep20Amount(1); // 1 BNB
const VAULT_VESTED_PENALTY_FEES_INTERVAL = timestampNDays(99); // 99 days

let CURRENT_BLOCK;
let masterchef;
let vaultDistribution;
let vaultLocked;
let vaultVested15;
let vaultVested30;
let vaultVested50;

async function main() {
    console.log("Starting deploy");
    console.log("Ensure you have proper addresses set up into addresses.js for: Masterchef, VaultDistribution, VaultLocked");

    [deployer] = await hre.ethers.getSigners();

    CURRENT_BLOCK = await ethers.provider.getBlockNumber();
    console.log("Current block is:", CURRENT_BLOCK);

    // Attach
    const Masterchef = await ethers.getContractFactory("MasterChef");
    masterchef = await Masterchef.attach(MASTERCHEF_ADDRESS);

    const VaultDistribution = await ethers.getContractFactory("VaultDistribution");
    vaultDistribution = await VaultDistribution.attach(VAULT_DISTRIBUTION_ADDRESS);

    const VaultLocked = await ethers.getContractFactory("VaultLocked");
    vaultLocked = await VaultLocked.attach(VAULT_LOCKED_ADDRESS);

    const VaultVested15 = await ethers.getContractFactory("VaultVested");
    vaultVested15 = await VaultVested15.attach(VAULT_VESTED_15_ADDRESS);

    const VaultVested30 = await ethers.getContractFactory("VaultVested");
    vaultVested30 = await VaultVested15.attach(VAULT_VESTED_30_ADDRESS);

    const VaultVested50 = await ethers.getContractFactory("VaultVested");
    vaultVested50 = await VaultVested15.attach(VAULT_VESTED_50_ADDRESS);

    // Set up
    await vaultVested15.setMinTokenAmountToDistribute(VAULT_VESTED_MIN_BNB_TO_DISTRIBUTE);
    await vaultVested30.setMinTokenAmountToDistribute(VAULT_VESTED_MIN_BNB_TO_DISTRIBUTE);
    await vaultVested50.setMinTokenAmountToDistribute(VAULT_VESTED_MIN_BNB_TO_DISTRIBUTE);
    console.log("Min BNB to distribute set to: ", VAULT_VESTED_MIN_BNB_TO_DISTRIBUTE.toString());

    await vaultVested15.setPenaltyFees(6500, VAULT_VESTED_PENALTY_FEES_INTERVAL);
    console.log("Vault vested 15 penalty fees percentage set to: 6500 and interval of days: ", VAULT_VESTED_PENALTY_FEES_INTERVAL.toString());
    await vaultVested30.setPenaltyFees(7500, VAULT_VESTED_PENALTY_FEES_INTERVAL);
    console.log("Vault vested 30 penalty fees percentage set to: 7500 and interval of days: ", VAULT_VESTED_PENALTY_FEES_INTERVAL.toString());
    await vaultVested50.setPenaltyFees(8300, VAULT_VESTED_PENALTY_FEES_INTERVAL);
    console.log("Vault vested 50 penalty fees percentage set to: 8300 and interval of days: ", VAULT_VESTED_PENALTY_FEES_INTERVAL.toString());

    await masterchef.addAddressToWhitelist(vaultVested15.address);
    console.log("Vault vested 15 added into Masterchef whitelist");
    await masterchef.addAddressToWhitelist(vaultVested30.address);
    console.log("Vault vested 30 added into Masterchef whitelist");
    await masterchef.addAddressToWhitelist(vaultVested50.address);
    console.log("Vault vested 50 added into Masterchef whitelist");

    await vaultVested15.setRewarder(vaultDistribution.address, true);
    console.log("Vault distribution added into vault vested 15 as rewarder");
    await vaultVested30.setRewarder(vaultDistribution.address, true);
    console.log("Vault distribution added into vault vested 30 as rewarder");
    await vaultVested50.setRewarder(vaultDistribution.address, true);
    console.log("Vault distribution added into vault vested 50 as rewarder");

    await vaultDistribution.addBeneficiary(vaultVested15.address);
    console.log("Vault vested 15 added into vault distribution as beneficiary");
    await vaultDistribution.addBeneficiary(vaultVested30.address);
    console.log("Vault vested 30 added into vault distribution as beneficiary");
    await vaultDistribution.addBeneficiary(vaultVested50.address);
    console.log("Vault vested 50 added into vault distribution as beneficiary");

    await vaultLocked.setDepositary(vaultVested15.address, true);
    console.log("Vault vested 15 added into vault locked as depositary");
    await vaultLocked.setDepositary(vaultVested30.address, true);
    console.log("Vault vested 30 added into vault locked as depositary");
    await vaultLocked.setDepositary(vaultVested50.address, true);
    console.log("Vault vested 50 added into vault locked as depositary");

    console.log("Current block is:", CURRENT_BLOCK);

    console.log("Deploy finished");
    console.log("Ensure you update VaultVested15, VaultVested30, VaultVested50, addresses into addresses.js");
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
