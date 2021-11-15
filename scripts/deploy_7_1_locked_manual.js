const hre = require("hardhat");
require("@nomiclabs/hardhat-ethers");

const {
    GLOBAL_TOKEN_ADDRESS,
    WETH_ADDRESS,
    MASTERCHEF_ADDRESS,
    TREASURY_MINT_ADDRESS,
} = require("./addresses");

const {
    deployVaultLockedManual,
} = require("../test/helpers/singleDeploys");

const { timestampNHours } = require("../test/helpers/utils.js");

const VAULT_LOCKED_DISTRIBUTE_GLOBAL_INTERVAL = timestampNHours(48);

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
    vaultLocked = await deployVaultLockedManual(
        GLOBAL_TOKEN_ADDRESS,
        WETH_ADDRESS,
        MASTERCHEF_ADDRESS,
        VAULT_LOCKED_DISTRIBUTE_GLOBAL_INTERVAL
    );

    console.log("Vault locked manual deployed to:", vaultLocked.address);
    await new Promise(r => setTimeout(() => r(), 10000));

    // Set up
    await masterchef.addAddressToWhitelist(vaultLocked.address);
    console.log("Vault locked added into Masterchef whitelist");
    await new Promise(r => setTimeout(() => r(), 10000));

    await vaultLocked.setDepositary(TREASURY_MINT_ADDRESS, true);
    console.log("Treasury depositary added into vault locked manual as depositary");
    await new Promise(r => setTimeout(() => r(), 10000));

    await hre.run("verify:verify", {
        address: vaultLocked.address,
        constructorArguments: [
            GLOBAL_TOKEN_ADDRESS,
            WETH_ADDRESS,
            MASTERCHEF_ADDRESS,
            VAULT_LOCKED_DISTRIBUTE_GLOBAL_INTERVAL
        ],
    });

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
