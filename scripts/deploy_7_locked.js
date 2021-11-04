const hre = require("hardhat");
require("@nomiclabs/hardhat-ethers");

const {
    GLOBAL_TOKEN_ADDRESS,
    WETH_ADDRESS,
    MASTERCHEF_ADDRESS,
} = require("./addresses");

const {
    deployVaultLocked,
} = require("../test/helpers/singleDeploys");

const { timestampNHours, timestampNDays, bep20Amount } = require("../test/helpers/utils.js");

const VAULT_LOCKED_DISTRIBUTE_GLOBAL_INTERVAL = timestampNHours(12); // 12h, Hours to distribute Globals from last distribution event.

let CURRENT_BLOCK;
let masterchef;
let vaultLocked;

async function main() {
    console.log("Starting deploy");
    console.log("Ensure you have proper addresses set up into addresses.js for: Masterchef");

    [deployer] = await hre.ethers.getSigners();

    CURRENT_BLOCK = await ethers.provider.getBlockNumber();
    console.log("Current block is:", CURRENT_BLOCK);

    // Attach
    const Masterchef = await ethers.getContractFactory("MasterChef");
    masterchef = await Masterchef.attach(MASTERCHEF_ADDRESS);

    // Start
    vaultLocked = await deployVaultLocked(
        GLOBAL_TOKEN_ADDRESS,
        WETH_ADDRESS,
        MASTERCHEF_ADDRESS,
        VAULT_LOCKED_DISTRIBUTE_GLOBAL_INTERVAL
    );
    console.log("Vault locked deployed to:", vaultLocked.address);
    await new Promise(r => setTimeout(() => r(), 10000));

    // Set up
    await masterchef.addAddressToWhitelist(vaultLocked.address);
    console.log("Vault locked added into Masterchef whitelist");
    await new Promise(r => setTimeout(() => r(), 10000));

    await masterchef.setLockedVaultAddress(vaultLocked.address);
    console.log("Masterchef locked vault address set to:", vaultLocked.address);
    await new Promise(r => setTimeout(() => r(), 10000));

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
