const hre = require("hardhat");
require("@nomiclabs/hardhat-ethers");

const {
    GLOBAL_TOKEN_ADDRESS,
    WETH_ADDRESS,
    MASTERCHEF_ADDRESS,
    VAULT_LOCKED_ADDRESS,
    VAULT_DISTRIBUTION_ADDRESS,
} = require("./addresses");

const {
    deployVaultVested,
} = require("../test/helpers/singleDeploys");

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

    // Start
    vaultVested15 = await deployVaultVested(
        GLOBAL_TOKEN_ADDRESS,
        WETH_ADDRESS,
        MASTERCHEF_ADDRESS,
        VAULT_LOCKED_ADDRESS
    );
    console.log("Vault vested 15 deployed to:", vaultVested15.address);
    await new Promise(r => setTimeout(() => r(), 10000));

    vaultVested30 = await deployVaultVested(
        GLOBAL_TOKEN_ADDRESS,
        WETH_ADDRESS,
        MASTERCHEF_ADDRESS,
        VAULT_LOCKED_ADDRESS
    );
    console.log("Vault vested 30 deployed to:", vaultVested30.address);
    await new Promise(r => setTimeout(() => r(), 10000));

    vaultVested50 = await deployVaultVested(
        GLOBAL_TOKEN_ADDRESS,
        WETH_ADDRESS,
        MASTERCHEF_ADDRESS,
        VAULT_LOCKED_ADDRESS
    );
    console.log("Vault vested 50 deployed to:", vaultVested50.address);

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
