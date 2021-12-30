const hre = require("hardhat");
require("@nomiclabs/hardhat-ethers");
const {ethers} = require("hardhat");
const {
    GLOBAL_TOKEN_ADDRESS,
    DEV_POWER_ADDRESS,
    RPS_ADDRESS
} = require("./addresses");
const {
    deploySmartChefFactoryGlobal
} = require("../test/helpers/singleDeploys");
const { bep20Amount } = require("../test/helpers/utils");

let smartChefFactoryGlobal;

let CURRENT_BLOCK;

async function main() {
    console.log("Starting deploy");
    console.log("You do not need dependencies for it");

    [deployer] = await hre.ethers.getSigners();

    CURRENT_BLOCK = await ethers.provider.getBlockNumber();
    console.log("Current block is:", CURRENT_BLOCK);

    // Start

    const SmartChefFactoryGlobal = await ethers.getContractFactory("SmartChefFactoryGlobal");
    smartChefFactoryGlobal = await SmartChefFactoryGlobal.attach("0x9ff74d6828d5d6ad03b5f3b1f9dfc364192a38af");//SMARTCHEF_FACTORY_GLOBAL_ADDRESS);
    //smartChefFactoryGlobal = await deploySmartChefFactoryGlobal();
    //await smartChefFactoryGlobal.deployed();
    console.log("SmartChefFactoryGlobal deployed to:", smartChefFactoryGlobal.address);
    await new Promise(r => setTimeout(() => r(), 10000));

    // Set up

    const START_BLOCK = 13939717 + 14400;
    const END_BLOCK = START_BLOCK + 864000;
    const USER_POOL_LIMIT = 0;

    const tx1 = await smartChefFactoryGlobal.deployPool(
        RPS_ADDRESS,
        RPS_ADDRESS,
        "34720000000000000",
        START_BLOCK,
        END_BLOCK,
        bep20Amount(USER_POOL_LIMIT),
        DEV_POWER_ADDRESS
    );
    const result1 = await tx1.wait();
    const smartChefGlobalAddress1 = result1.events[2].args[0];
    console.log("SmartChefGlobal created for RPS -> RPS on:", smartChefGlobalAddress1);
    await new Promise(r => setTimeout(() => r(), 10000));

    /*const START_BLOCK = 13435045;
    const END_BLOCK = START_BLOCK + (28800 * 18);
    const USER_POOL_LIMIT = 0;
    // Set up
    const tx2 = await smartChefFactoryGlobal.deployPool(
        GLOBAL_TOKEN_ADDRESS,
        GLOBAL_TOKEN_ADDRESS,
        "1740000000000000000",
        START_BLOCK,
        END_BLOCK,
        bep20Amount(USER_POOL_LIMIT),
        DEV_POWER_ADDRESS
    );
    const result2 = await tx2.wait();
    const smartChefAddress2 = result2.events[2].args[0];
    console.log("SmartChef created for GLB -> GLB on:", smartChefAddress2);
    await new Promise(r => setTimeout(() => r(), 10000));*/


    console.log("Deploy finished");
    console.log("Ensure you update SmartchefFactoryGlobal address into addresses.js");
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
