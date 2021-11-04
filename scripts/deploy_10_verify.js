const hre = require("hardhat");
require("@nomiclabs/hardhat-ethers");

const {
    DEPLOYER_ADDRESS,
    DEV_POWER_ADDRESS,
    GLOBAL_TOKEN_ADDRESS,
    WETH_ADDRESS,
    BUSD_ADDRESS,
    CAKE_ADDRESS,
    CAKE_MASTERCHEF_ADDRESS,
    FACTORY_ADDRESS,
    ROUTER_ADDRESS,
    TOKEN_ADDRESSES_ADDRESS,
    PATH_FINDER_ADDRESS,
    MASTERCHEF_INTERNAL_ADDRESS,
    MASTERCHEF_ADDRESS,
    SMARTCHEF_FACTORY_ADDRESS,
    SMARTCHEF1_ADDRESS,
    SMARTCHEF2_ADDRESS,
    SMARTCHEF3_ADDRESS,
    SMARTCHEF4_ADDRESS,
    SMARTCHEF5_ADDRESS,
    SMARTCHEF6_ADDRESS,
    SMARTCHEF7_ADDRESS,
    VAULT_DISTRIBUTION_ADDRESS,
    VAULT_LOCKED_ADDRESS,
    VAULT_VESTED_15_ADDRESS,
    VAULT_VESTED_30_ADDRESS,
    VAULT_VESTED_50_ADDRESS,
    VAULT_STAKED,
    VAULT_STAKED_TO_GLOBAL,
    VAULT_CAKE_15,
    VAULT_CAKE_30,
    VAULT_CAKE_50,
    DOGE_ADDRESS,
    USDT_ADDRESS,
    ETH_ADDRESS,
    BTC_ADDRESS,
    TREASURY_CAKE15_OPERATIONS_BURN_ADDRESS,
    TREASURY_CAKE30_OPERATIONS_BURN_ADDRESS,
    TREASURY_CAKE50_OPERATIONS_BURN_ADDRESS,
    TREASURY_OPTIMIZER_OPERATIONS_ADDRESS
} = require("./addresses");

const { timestampNDays, bep20Amount} = require("../test/helpers/utils");

let CURRENT_BLOCK;

async function main() {
    console.log("Starting deploy");
    console.log("Ensure you have proper addresses set up into addresses.js for: Masterchef, VaultDistribution, VaultVested15, VaultVested30, VaultVested50");

    [deployer] = await hre.ethers.getSigners();

    CURRENT_BLOCK = await ethers.provider.getBlockNumber();
    console.log("Current block is:", CURRENT_BLOCK);

    //VERIFY AMM
    await hre.run("verify:verify", {
        address: FACTORY_ADDRESS,
        constructorArguments: [
            DEPLOYER_ADDRESS
        ],
    });

    await hre.run("verify:verify", {
        address: ROUTER_ADDRESS,
        constructorArguments: [
            FACTORY_ADDRESS,
            WETH_ADDRESS
        ],
    });

    await hre.run("verify:verify", {
        address: TOKEN_ADDRESSES_ADDRESS,
        constructorArguments: [],
    });

    //VERIFY MASTERCHEF
    await hre.run("verify:verify", {
        address: PATH_FINDER_ADDRESS,
        constructorArguments: [
            TOKEN_ADDRESSES_ADDRESS
        ],
    });

    await hre.run("verify:verify", {
        address: MASTERCHEF_INTERNAL_ADDRESS,
        constructorArguments: [
            TOKEN_ADDRESSES_ADDRESS,
            PATH_FINDER_ADDRESS
        ],
    });

    await hre.run("verify:verify", {
        address: MASTERCHEF_ADDRESS,
        constructorArguments: [
            MASTERCHEF_INTERNAL_ADDRESS,
            GLOBAL_TOKEN_ADDRESS,
            NATIVE_TOKEN_PER_BLOCK,
            MASTERCHEF_START_BLOCK,
            ROUTER_ADDRESS,
            TOKEN_ADDRESSES_ADDRESS,
            PATH_FINDER_ADDRESS
        ],
    });

    //VERIFY SMARTCHEF
    await hre.run("verify:verify", {
        address: SMARTCHEF_FACTORY_ADDRESS,
        constructorArguments: [],
    });

    await hre.run("verify:verify", {
        address: SMARTCHEF1_ADDRESS,
        constructorArguments: [
            GLOBAL_TOKEN_ADDRESS,
            WETH_ADDRESS,
            "1736111111111",
            START_BLOCK,
            END_BLOCK,
            bep20Amount(USER_POOL_LIMIT),
            DEV_POWER_ADDRESS
        ],
    });
    await hre.run("verify:verify", {
        address: SMARTCHEF2_ADDRESS,
        constructorArguments: [
            GLOBAL_TOKEN_ADDRESS,
            BUSD_ADDRESS,
            "6944444444444440",
            START_BLOCK,
            END_BLOCK,
            bep20Amount(USER_POOL_LIMIT),
            DEV_POWER_ADDRESS
        ],
    });
    await hre.run("verify:verify", {
        address: SMARTCHEF3_ADDRESS,
        constructorArguments: [
            GLOBAL_TOKEN_ADDRESS,
            CAKE_ADDRESS,
            "347222222222222",
            START_BLOCK,
            END_BLOCK,
            bep20Amount(USER_POOL_LIMIT),
            DEV_POWER_ADDRESS
        ],
    });
    await hre.run("verify:verify", {
        address: SMARTCHEF4_ADDRESS,
        constructorArguments: [
            GLOBAL_TOKEN_ADDRESS,
            USDT_ADDRESS,
            "6944444444444440",
            START_BLOCK,
            END_BLOCK,
            bep20Amount(USER_POOL_LIMIT),
            DEV_POWER_ADDRESS
        ],
    });
    await hre.run("verify:verify", {
        address: SMARTCHEF5_ADDRESS,
        constructorArguments: [
            GLOBAL_TOKEN_ADDRESS,
            ETH_ADDRESS,
            "1736111111111",
            START_BLOCK,
            END_BLOCK,
            bep20Amount(USER_POOL_LIMIT),
            DEV_POWER_ADDRESS
        ],
    });
    await hre.run("verify:verify", {
        address: SMARTCHEF6_ADDRESS,
        constructorArguments: [
            GLOBAL_TOKEN_ADDRESS,
            BTC_ADDRESS,
            "115740740741",
            START_BLOCK,
            END_BLOCK,
            bep20Amount(USER_POOL_LIMIT),
            DEV_POWER_ADDRESS
        ],
    });
    await hre.run("verify:verify", {
        address: SMARTCHEF7_ADDRESS,
        constructorArguments: [
            GLOBAL_TOKEN_ADDRESS,
            DOGE_ADDRESS,
            "27777777777777800",
            START_BLOCK,
            END_BLOCK,
            bep20Amount(USER_POOL_LIMIT),
            DEV_POWER_ADDRESS
        ],
    });

    //VERIFY DISTRIBUTION
    await hre.run("verify:verify", {
        address: VAULT_DISTRIBUTION_ADDRESS,
        constructorArguments: [
            WETH_ADDRESS,
            GLOBAL_TOKEN_ADDRESS
        ],
    });

    //VERIFY STAKEDS
    await hre.run("verify:verify", {
        address: VAULT_STAKED,
        constructorArguments: [
            GLOBAL_TOKEN_ADDRESS,
            WETH_ADDRESS,
            MASTERCHEF_ADDRESS
        ],
    });

    await hre.run("verify:verify", {
        address: VAULT_STAKED_TO_GLOBAL,
        constructorArguments: [
            GLOBAL_TOKEN_ADDRESS,
            WETH_ADDRESS,
            MASTERCHEF_ADDRESS,
            ROUTER_ADDRESS
        ],
    });

    //VERIFY LOCKED
    await hre.run("verify:verify", {
        address: VAULT_LOCKED_ADDRESS,
        constructorArguments: [
            GLOBAL_TOKEN_ADDRESS,
            WETH_ADDRESS,
            MASTERCHEF_ADDRESS,
            VAULT_LOCKED_DISTRIBUTE_GLOBAL_INTERVAL
        ],
    });

    //VERIFY VESTED
    await hre.run("verify:verify", {
        address: VAULT_VESTED_15_ADDRESS,
        constructorArguments: [
            GLOBAL_TOKEN_ADDRESS,
            WETH_ADDRESS,
            MASTERCHEF_ADDRESS,
            VAULT_LOCKED_ADDRESS
        ],
    });

    await hre.run("verify:verify", {
        address: VAULT_VESTED_30_ADDRESS,
        constructorArguments: [
            GLOBAL_TOKEN_ADDRESS,
            WETH_ADDRESS,
            MASTERCHEF_ADDRESS,
            VAULT_LOCKED_ADDRESS
        ],
    });

    await hre.run("verify:verify", {
        address: VAULT_VESTED_50_ADDRESS,
        constructorArguments: [
            GLOBAL_TOKEN_ADDRESS,
            WETH_ADDRESS,
            MASTERCHEF_ADDRESS,
            VAULT_LOCKED_ADDRESS
        ],
    });

    //VERIFY CAKE
    await hre.run("verify:verify", {
        address: VAULT_CAKE_15,
        constructorArguments: [
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
        ],
    });

    await hre.run("verify:verify", {
        address: VAULT_CAKE_30,
        constructorArguments: [
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
        ],
    });

    await hre.run("verify:verify", {
        address: VAULT_CAKE_50,
        constructorArguments: [
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
        ],
    });

    console.log("Verify finished");
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