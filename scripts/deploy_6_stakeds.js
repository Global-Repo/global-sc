const hre = require("hardhat");
require("@nomiclabs/hardhat-ethers");

const {
    GLOBAL_TOKEN_ADDRESS,
    WETH_ADDRESS,
    MASTERCHEF_ADDRESS,
    ROUTER_ADDRESS,
    VAULT_DISTRIBUTION_ADDRESS,
} = require("./addresses");

const {
    deployVaultStaked,
    deployVaultStakedToGlobal,
} = require("../test/helpers/singleDeploys");

let CURRENT_BLOCK;
let masterchef;
let vaultDistribution;
let vaultStaked;
let vaultStakedToGlobal;

async function main() {
    console.log("Starting deploy");
    console.log("Ensure you have proper addresses set up into addresses.js for: Masterchef, VaultDistribution");

    [deployer] = await hre.ethers.getSigners();

    CURRENT_BLOCK = await ethers.provider.getBlockNumber();
    console.log("Current block is:", CURRENT_BLOCK);

    // Attach
    const Masterchef = await ethers.getContractFactory("MasterChef");
    masterchef = await Masterchef.attach(MASTERCHEF_ADDRESS);

    const VaultDistribution = await ethers.getContractFactory("VaultDistribution");
    vaultDistribution = await VaultDistribution.attach(VAULT_DISTRIBUTION_ADDRESS);

    // Start
    vaultStaked = await deployVaultStaked(
        GLOBAL_TOKEN_ADDRESS,
        WETH_ADDRESS,
        MASTERCHEF_ADDRESS
    );
    console.log("Vault staked deployed to:", vaultStaked.address);
    await new Promise(r => setTimeout(() => r(), 10000));

    vaultStakedToGlobal = await deployVaultStakedToGlobal(
        GLOBAL_TOKEN_ADDRESS,
        WETH_ADDRESS,
        MASTERCHEF_ADDRESS,
        ROUTER_ADDRESS
    );
    console.log("Vault staked to global deployed to:", vaultStakedToGlobal.address);
    await new Promise(r => setTimeout(() => r(), 10000));

    // Set up
    await masterchef.addAddressToWhitelist(vaultStaked.address);
    console.log("Vault staked added into Masterchef whitelist");
    await new Promise(r => setTimeout(() => r(), 10000));
    await masterchef.addAddressToWhitelist(vaultStakedToGlobal.address);
    console.log("Vault staked to global added into Masterchef whitelist");
    await new Promise(r => setTimeout(() => r(), 10000));

    await vaultStaked.setRewarder(vaultDistribution.address, true);
    console.log("Vault distribution added into vault staked as rewarder");
    await new Promise(r => setTimeout(() => r(), 10000));
    await vaultStakedToGlobal.setRewarder(vaultDistribution.address, true);
    console.log("Vault distribution added into vault staked to global as rewarder");
    await new Promise(r => setTimeout(() => r(), 10000));

    await vaultDistribution.addBeneficiary(vaultStaked.address);
    console.log("Vault staked added into vault distribution as beneficiary");
    await new Promise(r => setTimeout(() => r(), 10000));
    await vaultDistribution.addBeneficiary(vaultStakedToGlobal.address);
    console.log("Vault staked to global added into vault distribution as beneficiary");
    await new Promise(r => setTimeout(() => r(), 10000));

    console.log("Current block is:", CURRENT_BLOCK);

    console.log("Deploy finished");
    console.log("Ensure you update VaultStaked, VaultStakedToGlobal addresses into addresses.js");
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
