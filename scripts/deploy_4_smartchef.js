const hre = require("hardhat");
require("@nomiclabs/hardhat-ethers");
const {ethers} = require("hardhat");
const {
    GLOBAL_TOKEN_ADDRESS,
    WETH_ADDRESS,
    DEV_POWER_ADDRESS,
    BUSD_ADDRESS,
    USDT_ADDRESS,
    ETH_ADDRESS,
    BTC_ADDRESS,
    ADA_ADDRESS, MASTERCHEF_ADDRESS
} = require("./addresses");
const {
    deploySmartChefFactory,
} = require("../test/helpers/singleDeploys");
const { bep20Amount } = require("../test/helpers/utils");

let smartChefFactory;

let CURRENT_BLOCK;

async function main() {
    console.log("Starting deploy");
    console.log("You do not need dependencies for it");

    [deployer] = await hre.ethers.getSigners();

    CURRENT_BLOCK = await ethers.provider.getBlockNumber();
    console.log("Current block is:", CURRENT_BLOCK);

    const START_BLOCK = 12627470;
    const END_BLOCK = 13484270; //START_BLOCK + (28800 * 30);
    const USER_POOL_LIMIT = 700;

    // Start

    const SmartChefFactory = await ethers.getContractFactory("SmartChefFactory");
    smartChefFactory = await SmartChefFactory.attach("0x92ab461431f1aE22f6A3de1ba45051DEbdDEa19b");
    //smartChefFactory = await deploySmartChefFactory();
    console.log("SmartChefFactory deployed to:", smartChefFactory.address);
    await new Promise(r => setTimeout(() => r(), 10000));

    // Set up
    const tx1 = await smartChefFactory.deployPool(
        GLOBAL_TOKEN_ADDRESS,
        WETH_ADDRESS,
        "100000000000000",
        12627470,//START_BLOCK,
        13484270,//END_BLOCK,
        bep20Amount(USER_POOL_LIMIT),
        DEV_POWER_ADDRESS
    );
    const result1 = await tx1.wait();
    const smartChefAddress1 = result1.events[2].args[0];
    console.log("SmartChef created for GLB -> BNB on:", smartChefAddress1);
    await new Promise(r => setTimeout(() => r(), 10000));
/*
    const tx2 = await smartChefFactory.deployPool(
        GLOBAL_TOKEN_ADDRESS,
        BUSD_ADDRESS,
        "6944444444444444",
        START_BLOCK,
        END_BLOCK,
        bep20Amount(USER_POOL_LIMIT),
        DEV_POWER_ADDRESS
    );
    const result2 = await tx2.wait();
    const smartChefAddress2 = result2.events[2].args[0];
    console.log("SmartChef created for GLB -> BUSD on:", smartChefAddress2);
    await new Promise(r => setTimeout(() => r(), 10000));

    const tx3 = await smartChefFactory.deployPool(
        GLOBAL_TOKEN_ADDRESS,
        USDT_ADDRESS,
        "6944444444444444",
        START_BLOCK,
        END_BLOCK,
        bep20Amount(USER_POOL_LIMIT),
        DEV_POWER_ADDRESS
    );
    const result3 = await tx3.wait();
    const smartChefAddress3 = result3.events[2].args[0];
    console.log("SmartChef created for GLB -> USDT on:", smartChefAddress3);
    await new Promise(r => setTimeout(() => r(), 10000));

    const tx4 = await smartChefFactory.deployPool(
        GLOBAL_TOKEN_ADDRESS,
        BTC_ADDRESS,
        "108506944444",
        START_BLOCK,
        END_BLOCK,
        bep20Amount(USER_POOL_LIMIT),
        DEV_POWER_ADDRESS
    );
    const result4 = await tx4.wait();
    const smartChefAddress4 = result4.events[2].args[0];
    console.log("SmartChef created for GLB -> BTC on:", smartChefAddress4);
    await new Promise(r => setTimeout(() => r(), 10000));

    const tx5 = await smartChefFactory.deployPool(
        GLOBAL_TOKEN_ADDRESS,
        ETH_ADDRESS,
        "1509661835748",
        START_BLOCK,
        END_BLOCK,
        bep20Amount(USER_POOL_LIMIT),
        DEV_POWER_ADDRESS
    );
    const result5 = await tx5.wait();
    const smartChefAddress5 = result5.events[2].args[0];
    console.log("SmartChef created for GLB -> ETH on:", smartChefAddress5);
    await new Promise(r => setTimeout(() => r(), 10000));

    const tx6 = await smartChefFactory.deployPool(
        GLOBAL_TOKEN_ADDRESS,
        ADA_ADDRESS,
        "3338675213675213",
        START_BLOCK,
        END_BLOCK,
        bep20Amount(USER_POOL_LIMIT),
        DEV_POWER_ADDRESS
    );
    const result6 = await tx6.wait();
    const smartChefAddress6 = result6.events[2].args[0];
    console.log("SmartChef created for GLB -> ADA on:", smartChefAddress6);
    await new Promise(r => setTimeout(() => r(), 10000));*/

    /*const tx7 = await smartChefFactory.deployPool(
        GLOBAL_TOKEN_ADDRESS,
        ADA_ADDRESS,
        "27777777777777800",
        START_BLOCK,
        END_BLOCK,
        bep20Amount(USER_POOL_LIMIT),
        DEV_POWER_ADDRESS
    );
    const result7 = await tx7.wait();
    const smartChefAddress7 = result7.events[2].args[0];
    console.log("SmartChef created for GLB - DOGE on:", smartChefAddress7);
    await new Promise(r => setTimeout(() => r(), 10000));

    console.log("Current block is:", CURRENT_BLOCK);*/

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
