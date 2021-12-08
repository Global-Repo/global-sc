const hre = require("hardhat");
require("@nomiclabs/hardhat-ethers");
const { BigNumber } = require("@ethersproject/bignumber");

const {
    GLOBAL_TOKEN_ADDRESS,
    VAULT_LOCKED_MANUAL_ADDRESS,
    VAULT_LOCKED_MANUAL_ADDRESS_2
} = require("./addresses");

const {
    deployVaultLockedManualRewarder,
} = require("../test/helpers/singleDeploys");

let vaultLockedManualRewarder;

async function main() {
    console.log("Starting deploy rewarder");
    console.log("Ensure you have proper addresses set up into addresses.js for: GlobalTokenAddress & VaultLockedManual & VaultLockedManual2");

    [deployer] = await hre.ethers.getSigners();

    /*vaultLockedManualRewarder = await deployVaultLockedManualRewarder(
        GLOBAL_TOKEN_ADDRESS,
        VAULT_LOCKED_MANUAL_ADDRESS_2//VAULT_LOCKED_MANUAL_ADDRESS
    );

    console.log("Vault locked manual rewarder deployed to:", vaultLockedManualRewarder.address);
    await new Promise(r => setTimeout(() => r(), 10000));*/

    await hre.run("verify:verify", {
        address: vaultLockedManualRewarder.address,
        constructorArguments: [
            GLOBAL_TOKEN_ADDRESS,
            VAULT_LOCKED_MANUAL_ADDRESS_2//VAULT_LOCKED_MANUAL_ADDRESS
        ],
    });


    console.log("Rewarder deployed");
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
