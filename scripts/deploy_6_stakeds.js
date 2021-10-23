const hre = require("hardhat");
require("@nomiclabs/hardhat-ethers");

const {
    GLOBAL_TOKEN_ADDRESS,
    WETH_ADDRESS,
    MASTERCHEF_ADDRESS,
    ROUTER_ADDRESS,
    VAULT_DISTRIBUTOR_ADDRESS,
} = require("./addresses");

const {
    deployVaultStaked,
    deployVaultStakedToGlobal,
} = require("../test/helpers/singleDeploys");

const { timestampNHours, timestampNDays, bep20Amount } = require("../test/helpers/utils.js");

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
    vaultDistribution = await VaultDistribution.attach(VAULT_DISTRIBUTOR_ADDRESS);

    // Start
    vaultStaked = await deployVaultStaked(
        GLOBAL_TOKEN_ADDRESS,
        WETH_ADDRESS,
        MASTERCHEF_ADDRESS
    );
    console.log("Vault staked deployed to:", vaultStaked.address);

    vaultStakedToGlobal = await deployVaultStakedToGlobal(
        GLOBAL_TOKEN_ADDRESS,
        WETH_ADDRESS,
        MASTERCHEF_ADDRESS,
        ROUTER_ADDRESS
    );
    console.log("Vault staked to global deployed to:", vaultStakedToGlobal.address);

    // Verify
    await hre.run("verify:verify", {
        address: vaultStaked.address,
        constructorArguments: [
            GLOBAL_TOKEN_ADDRESS,
            WETH_ADDRESS,
            MASTERCHEF_ADDRESS
        ],
    });

    await hre.run("verify:verify", {
        address: vaultStakedToGlobal.address,
        constructorArguments: [
            GLOBAL_TOKEN_ADDRESS,
            WETH_ADDRESS,
            MASTERCHEF_ADDRESS,
            ROUTER_ADDRESS
        ],
    });

    // Set up
    await masterchef.addAddressToWhitelist(vaultStaked.address, true);
    console.log("Vault staked added into Masterchef whitelist");
    await masterchef.addAddressToWhitelist(vaultStakedToGlobal.address, true);
    console.log("Vault staked to global added into Masterchef whitelist");

    await vaultStaked.setRewarder(vaultDistribution.address, true);
    console.log("Vault distribution added into vault staked as rewarder");
    await vaultStakedToGlobal.setRewarder(vaultDistribution.address, true);
    console.log("Vault distribution added into vault staked to global as rewarder");

    await vaultDistribution.addBeneficiary(vaultStaked.address);
    console.log("Vault staked added into vault distribution as beneficiary");
    await vaultDistribution.addBeneficiary(vaultStakedToGlobal.address);
    console.log("Vault staked to global added into vault distribution as beneficiary");

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
