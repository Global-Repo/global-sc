const hre = require("hardhat");
require("@nomiclabs/hardhat-ethers");

const {
    GLOBAL_TOKEN_ADDRESS,
    CAKE_ADDRESS,
    CAKE_MASTERCHEF_ADDRESS,
    TREASURY_ADDRESS,
    TOKEN_ADDRESSES_ADDRESS,
    ROUTER_ADDRESS,
    PATH_FINDER_ADDRESS,
    VAULT_DISTRIBUTOR_ADDRESS,
    VAULT_VESTED_15_ADDRESS,
    VAULT_VESTED_30_ADDRESS,
    VAULT_VESTED_50_ADDRESS,
} = require("addresses.js");

const {
    deployVaultCake,
} = require("../../test/helpers/singleDeploys.js");

const { timestampNHours, timestampNDays, bep20Amount } = require("../test/helpers/utils.js");

const VAULT_LOCKED_DISTRIBUTE_GLOBAL_INTERVAL = timestampNHours(12); // 12h, Hours to distribute Globals from last distribution event.

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
    console.log("Ensure you have proper addresses set up into addresses.js for: VaultDistribution, VaultVested15, VaultVested30, VaultVested50");

    [deployer] = await hre.ethers.getSigners();

    CURRENT_BLOCK = await ethers.provider.getBlockNumber();
    console.log("Current block is:", CURRENT_BLOCK);

    // Attach
    const VaultDistribution = await ethers.getContractFactory("VaultDistribution");
    vaultDistribution = await VaultDistribution.attach(VAULT_DISTRIBUTOR_ADDRESS);

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
        TREASURY_ADDRESS,
        TOKEN_ADDRESSES_ADDRESS,
        ROUTER_ADDRESS,
        PATH_FINDER_ADDRESS,
        VAULT_DISTRIBUTOR_ADDRESS,
        VAULT_VESTED_15_ADDRESS
    );
    console.log("Vault Cake 15 deployed to:", vaultCake15.address);

    vaultCake30 = await deployVaultCake(
        CAKE_ADDRESS,
        GLOBAL_TOKEN_ADDRESS,
        CAKE_MASTERCHEF_ADDRESS,
        TREASURY_ADDRESS,
        TOKEN_ADDRESSES_ADDRESS,
        ROUTER_ADDRESS,
        PATH_FINDER_ADDRESS,
        VAULT_DISTRIBUTOR_ADDRESS,
        VAULT_VESTED_30_ADDRESS
    );
    console.log("Vault Cake 30 deployed to:", vaultCake30.address);

    vaultCake50 = await deployVaultCake(
        CAKE_ADDRESS,
        GLOBAL_TOKEN_ADDRESS,
        CAKE_MASTERCHEF_ADDRESS,
        TREASURY_ADDRESS,
        TOKEN_ADDRESSES_ADDRESS,
        ROUTER_ADDRESS,
        PATH_FINDER_ADDRESS,
        VAULT_DISTRIBUTOR_ADDRESS,
        VAULT_VESTED_50_ADDRESS
    );
    console.log("Vault Cake 50 deployed to:", vaultCake50.address);


    // Verify
    await hre.run("verify:verify", {
        address: vaultCake15.address,
        constructorArguments: [
            CAKE_ADDRESS,
            GLOBAL_TOKEN_ADDRESS,
            CAKE_MASTERCHEF_ADDRESS,
            TREASURY_ADDRESS,
            TOKEN_ADDRESSES_ADDRESS,
            ROUTER_ADDRESS,
            PATH_FINDER_ADDRESS,
            VAULT_DISTRIBUTOR_ADDRESS,
            VAULT_VESTED_15_ADDRESS
        ],
    });

    // Set up


    console.log("Current block is:", CURRENT_BLOCK);

    console.log("Deploy finished");
    console.log("Ensure you update VaultLocked address into addresses.js");
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
