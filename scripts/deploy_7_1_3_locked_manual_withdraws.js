const hre = require("hardhat");
require("@nomiclabs/hardhat-ethers");
const { BigNumber } = require("@ethersproject/bignumber");

const {
    GLOBAL_TOKEN_ADDRESS,
    VAULT_LOCKED_MANUAL_ADDRESS,
    VAULT_LOCKED_MANUAL_ADDRESS_2
} = require("./addresses");

const {
    deployVaultLockedManualWithdrawer
} = require("../test/helpers/singleDeploys");

let vaultLockedManualWithdrawer;
let vaultLockedManualWithdrawer2;

async function main() {
    console.log("Starting deploy withdrawer");
    console.log("Ensure you have proper addresses set up into addresses.js for: GlobalTokenAddress & VaultLockedManual & VaultLockedManual2");

    [deployer] = await hre.ethers.getSigners();

    vaultLockedManualWithdrawer = await deployVaultLockedManualWithdrawer(
        GLOBAL_TOKEN_ADDRESS,
        VAULT_LOCKED_MANUAL_ADDRESS//VAULT_LOCKED_MANUAL_ADDRESS
    );

    console.log("Vault locked manual withdrawer deployed to:", vaultLockedManualWithdrawer.address);
    await new Promise(r => setTimeout(() => r(), 10000));

    await hre.run("verify:verify", {
        address: vaultLockedManualWithdrawer.address,
        constructorArguments: [
            GLOBAL_TOKEN_ADDRESS,
            VAULT_LOCKED_MANUAL_ADDRESS//VAULT_LOCKED_MANUAL_ADDRESS
        ],
    });

    console.log("Vault locked manual withdrawer verified");
    await new Promise(r => setTimeout(() => r(), 10000));

    vaultLockedManualWithdrawer2 = await deployVaultLockedManualWithdrawer(
        GLOBAL_TOKEN_ADDRESS,
        VAULT_LOCKED_MANUAL_ADDRESS_2//VAULT_LOCKED_MANUAL_ADDRESS
    );

    console.log("Vault locked manual withdrawer2 deployed to:", vaultLockedManualWithdrawer2.address);
    await new Promise(r => setTimeout(() => r(), 10000));

    await hre.run("verify:verify", {
        address: vaultLockedManualWithdrawer2.address,
        constructorArguments: [
            GLOBAL_TOKEN_ADDRESS,
            VAULT_LOCKED_MANUAL_ADDRESS_2//VAULT_LOCKED_MANUAL_ADDRESS
        ],
    });

    console.log("Vault locked manual withdrawer2 verified");
    await new Promise(r => setTimeout(() => r(), 10000));

    console.log("Withdrawer deployed");
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
