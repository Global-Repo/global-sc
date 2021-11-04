const hre = require("hardhat");
require("@nomiclabs/hardhat-ethers");

const {
    GLOBAL_TOKEN_ADDRESS,
    CAKE_ADDRESS,
    CAKE_MASTERCHEF_ADDRESS,
    TOKEN_ADDRESSES_ADDRESS,
    ROUTER_ADDRESS,
    PATH_FINDER_ADDRESS,
    VAULT_DISTRIBUTION_ADDRESS,
    VAULT_VESTED_15_ADDRESS,
    VAULT_VESTED_30_ADDRESS,
    VAULT_VESTED_50_ADDRESS,
    MASTERCHEF_ADDRESS,
    TREASURY_CAKE15_OPERATIONS_BURN_ADDRESS,
    TREASURY_CAKE30_OPERATIONS_BURN_ADDRESS,
    TREASURY_CAKE50_OPERATIONS_BURN_ADDRESS,
    TREASURY_OPTIMIZER_OPERATIONS_ADDRESS
} = require("./addresses");


const {
    deployVaultCake,
} = require("../test/helpers/singleDeploys");

const { timestampNDays } = require("../test/helpers/utils");

let CURRENT_BLOCK;
let vaultDistribution;
let vaultVested15;
let vaultVested30;
let vaultVested50;
let vaultCake15;
let vaultCake30;
let vaultCake50;

async function main() {
    console.log("Starting deploy");
    console.log("Ensure you have proper addresses set up into addresses.js for: Masterchef, VaultDistribution, VaultVested15, VaultVested30, VaultVested50");

    [deployer] = await hre.ethers.getSigners();

    CURRENT_BLOCK = await ethers.provider.getBlockNumber();
    console.log("Current block is:", CURRENT_BLOCK);

    // Attach
    const VaultDistribution = await ethers.getContractFactory("VaultDistribution");
    vaultDistribution = await VaultDistribution.attach(VAULT_DISTRIBUTION_ADDRESS);

    const VaultVested15 = await ethers.getContractFactory("VaultVested");
    vaultVested15 = await VaultVested15.attach(VAULT_VESTED_15_ADDRESS);

    const VaultVested30 = await ethers.getContractFactory("VaultVested");
    vaultVested30 = await VaultVested30.attach(VAULT_VESTED_30_ADDRESS);

    const VaultVested50 = await ethers.getContractFactory("VaultVested");
    vaultVested50 = await VaultVested50.attach(VAULT_VESTED_50_ADDRESS);

    // Start
    vaultCake15 = await deployVaultCake(
        CAKE_ADDRESS,
        GLOBAL_TOKEN_ADDRESS,
        CAKE_MASTERCHEF_ADDRESS,
        TREASURY_CAKE15_OPERATIONS_BURN_ADDRESS,
        TREASURY_OPTIMIZER_OPERATIONS_ADDRESS,
        TOKEN_ADDRESSES_ADDRESS,
        ROUTER_ADDRESS,
        PATH_FINDER_ADDRESS,
        VAULT_DISTRIBUTION_ADDRESS,
        VAULT_VESTED_15_ADDRESS
    );
    console.log("Vault Cake 15 deployed to:", vaultCake15.address);
    await new Promise(r => setTimeout(() => r(), 10000));

    vaultCake30 = await deployVaultCake(
        CAKE_ADDRESS,
        GLOBAL_TOKEN_ADDRESS,
        CAKE_MASTERCHEF_ADDRESS,
        TREASURY_CAKE30_OPERATIONS_BURN_ADDRESS,
        TREASURY_OPTIMIZER_OPERATIONS_ADDRESS,
        TOKEN_ADDRESSES_ADDRESS,
        ROUTER_ADDRESS,
        PATH_FINDER_ADDRESS,
        VAULT_DISTRIBUTION_ADDRESS,
        VAULT_VESTED_30_ADDRESS
    );
    console.log("Vault Cake 30 deployed to:", vaultCake30.address);
    await new Promise(r => setTimeout(() => r(), 10000));

    vaultCake50 = await deployVaultCake(
        CAKE_ADDRESS,
        GLOBAL_TOKEN_ADDRESS,
        CAKE_MASTERCHEF_ADDRESS,
        TREASURY_CAKE50_OPERATIONS_BURN_ADDRESS,
        TREASURY_OPTIMIZER_OPERATIONS_ADDRESS,
        TOKEN_ADDRESSES_ADDRESS,
        ROUTER_ADDRESS,
        PATH_FINDER_ADDRESS,
        VAULT_DISTRIBUTION_ADDRESS,
        VAULT_VESTED_50_ADDRESS
    );
    console.log("Vault Cake 50 deployed to:", vaultCake50.address);
    await new Promise(r => setTimeout(() => r(), 10000));

    // Set up
    await vaultCake15.setRewards(8500, 100, 600, 800, 2500);
    console.log("Vault cake 15 rewards set to: toUser:8500, toOperations:100, toBuyGlobal:600, toBuyBNB:800, toMintGlobal:2500");
    await new Promise(r => setTimeout(() => r(), 10000));
    await vaultCake30.setRewards(7000, 300, 1000, 1700, 5000);
    console.log("Vault cake 30 rewards set to: toUser:7000, toOperations:300, toBuyGlobal:1000, toBuyBNB:1700, toMintGlobal:5000");
    await new Promise(r => setTimeout(() => r(), 10000));
    await vaultCake50.setRewards(5000, 500, 1500, 3000, 7500);
    console.log("Vault cake 50 rewards set to: toUser:5000, toOperations:500, toBuyGlobal:1500, toBuyBNB:3000, toMintGlobal:7500");
    await new Promise(r => setTimeout(() => r(), 10000));

    await vaultDistribution.setDepositary(vaultCake15.address, true);
    console.log("Vault cake 15 added into vault distribution as depositary");
    await new Promise(r => setTimeout(() => r(), 10000));
    await vaultDistribution.setDepositary(vaultCake30.address, true);
    console.log("Vault cake 30 added into vault distribution as depositary");
    await new Promise(r => setTimeout(() => r(), 10000));
    await vaultDistribution.setDepositary(vaultCake50.address, true);
    console.log("Vault cake 50 added into vault distribution as depositary");
    await new Promise(r => setTimeout(() => r(), 10000));

    await vaultVested15.setDepositary(vaultCake15.address, true);
    console.log("Vault cake 15 added into vault distribution as depositary");
    await new Promise(r => setTimeout(() => r(), 10000));
    await vaultVested30.setDepositary(vaultCake30.address, true);
    console.log("Vault cake 30 added into vault distribution as depositary");
    await new Promise(r => setTimeout(() => r(), 10000));
    await vaultVested50.setDepositary(vaultCake50.address, true);
    console.log("Vault cake 50 added into vault distribution as depositary");
    await new Promise(r => setTimeout(() => r(), 10000));

    await vaultCake15.setWithdrawalFees(65, 15, timestampNDays(4));
    console.log("Vault cake 15 withdrawal fees set to: burn:65, team:15, interval:4");
    await new Promise(r => setTimeout(() => r(), 10000));
    await vaultCake30.setWithdrawalFees(65, 15, timestampNDays(4));
    console.log("Vault cake 30 withdrawal fees set to: burn:65, team:15, interval:4");
    await new Promise(r => setTimeout(() => r(), 10000));
    await vaultCake50.setWithdrawalFees(65, 15, timestampNDays(4));
    console.log("Vault cake 50 withdrawal fees set to: burn:65, team:15, interval:4");
    await new Promise(r => setTimeout(() => r(), 10000));

    console.log("Current block is:", CURRENT_BLOCK);

    console.log("Deploy finished");
    console.log("Ensure you update VaultCake15, VaultCake30, VaultCake50 addresses into addresses.js");
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
