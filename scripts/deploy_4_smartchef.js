const hre = require("hardhat");
require("@nomiclabs/hardhat-ethers");
const {ethers} = require("hardhat");
const {
    GLOBAL_TOKEN_ADDRESS,
    WETH_ADDRESS,
    DEV_ADDRESS,
    CAKE_ADDRESS,
    BUSD_ADDRESS,
} = require("./addresses");
const {
    deploySmartChefFactory,
} = require("../test/helpers/singleDeploys");
const { timestampNHours, bep20Amount } = require("../../test/helpers/utils.js");

let smartChefFactory;

let CURRENT_BLOCK;

async function main() {
    console.log("Starting deploy");
    console.log("You do not need dependencies for it");

    [deployer] = await hre.ethers.getSigners();

    CURRENT_BLOCK = await ethers.provider.getBlockNumber();
    console.log("Current block is:", CURRENT_BLOCK);

    // Start
    smartChefFactory = await deploySmartChefFactory();
    console.log("SmartChefFactory deployed to:", smartChefFactory.address);

    // Verify
    await hre.run("verify:verify", {
        address: smartChefFactory.address,
        constructorArguments: [],
    });

    // Set up
    // TODO comptar cuanta pasta i quina emisió
    smartChefFactory.deployPool(
        GLOBAL_TOKEN_ADDRESS,
        WETH_ADDRESS,
        BigNumber.from(10).mul(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER),
        CURRENT_BLOCK,
        CURRENT_BLOCK + 28800 * 30,
        BigNumber.from(300).mul(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER),
        DEV_ADDRESS
    );
    console.log("SmartChef created for GLB - BNB on:", smartChefFactory.address);

    smartChefFactory.deployPool(
        GLOBAL_TOKEN_ADDRESS,
        BUSD_ADDRESS,
        BigNumber.from(10).mul(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER),
        CURRENT_BLOCK,
        CURRENT_BLOCK + 28800 * 30,
        BigNumber.from(300).mul(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER),
        DEV_ADDRESS
    );
    console.log("SmartChef created for GLB - BUSD on:", smartChefFactory.address);

    smartChefFactory.deployPool(
        GLOBAL_TOKEN_ADDRESS,
        CAKE_ADDRESS,
        BigNumber.from(10).mul(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER),
        CURRENT_BLOCK,
        CURRENT_BLOCK + 28800 * 30,
        BigNumber.from(300).mul(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER),
        DEV_ADDRESS
    );
    console.log("SmartChef created for GLB - CAKE on:", smartChefFactory.address);

    console.log("Current block is:", CURRENT_BLOCK);

    console.log("Deploy finished");
    console.log("Ensure you update SmartchefFactory address into addresses.js");
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
