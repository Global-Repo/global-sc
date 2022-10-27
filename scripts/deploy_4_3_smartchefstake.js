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
    ADA_ADDRESS, MASTERCHEF_ADDRESS,
    SQUID_ADDRESS,
    RPS_ADDRESS,
    OWL_ADDRESS,
    SMARTCHEF_FACTORY_ADDRESS,
    STAKING_HELPER_ADDRESS, GLBD_ADDRESS
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



    // Start

    const SmartChefFactory = await ethers.getContractFactory("SmartChefFactory");
    smartChefFactory = await SmartChefFactory.attach(SMARTCHEF_FACTORY_ADDRESS);
    //smartChefFactory = await deploySmartChefFactory();
    //await smartChefFactory.deployed();
    console.log("SmartChefFactory deployed to:", smartChefFactory.address);
    await new Promise(r => setTimeout(() => r(), 10000));


    const START_BLOCK = 22519000;
    const END_BLOCK = START_BLOCK + 28800; //START_BLOCK + (28800 * 30);
    const USER_POOL_LIMIT = 0;
    // Set up
    const tx1 = await smartChefFactory.deployPool(
        "0xb56b63e1E427ff5f4B11b09B790F8e97d67080a0",//"0x95866DA49f3607de786e613ed3F2A57e661380fC",
        GLBD_ADDRESS,
        "31250",
        START_BLOCK,
        END_BLOCK,
        bep20Amount(USER_POOL_LIMIT),
        STAKING_HELPER_ADDRESS,
        DEV_POWER_ADDRESS
    );
    /*
        IBEP20 _stakedToken,
        IERC20 _rewardToken,
        uint256 _rewardPerBlock,
        uint256 _startBlock,
        uint256 _bonusEndBlock,
        uint256 _poolLimitPerUser,
        address _stakingContract,
        address _admin
    */
    const result1 = await tx1.wait();
    const smartChefAddress1 = result1.events[2].args[0];
    console.log("SmartChef created for GLB -> GLB on:", smartChefAddress1);
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

    const START_BLOCK = 12913200;
    const END_BLOCK = 13489200; //START_BLOCK + (28800 * 30);
    const USER_POOL_LIMIT = 0;

    // Set up
    const tx8 = await smartChefFactory.deployPool(
        GLOBAL_TOKEN_ADDRESS,
        SQUID_ADDRESS,
        "520833333333333333",
        START_BLOCK,
        END_BLOCK,
        bep20Amount(USER_POOL_LIMIT),
        DEV_POWER_ADDRESS
    );
    const result8 = await tx8.wait();
    const smartChefAddress8 = result8.events[2].args[0];
    console.log("SmartChef created for GLB - SQUID on:", smartChefAddress8);
    await new Promise(r => setTimeout(() => r(), 10000));

    console.log("Current block is:", CURRENT_BLOCK);


    // Set up
    const START_BLOCK = 13156400;
    const END_BLOCK = START_BLOCK + (28800 * 30);
    const USER_POOL_LIMIT = 0;
    const tx9 = await smartChefFactory.deployPool(
        RPS_ADDRESS,
        GLOBAL_TOKEN_ADDRESS,
        "181500000000000000",
        START_BLOCK,
        END_BLOCK,
        bep20Amount(USER_POOL_LIMIT),
        DEV_POWER_ADDRESS
    );
    const result9 = await tx9.wait();
    const smartChefAddress9 = result9.events[2].args[0];
    console.log("SmartChef created for RPS - GLB on:", smartChefAddress9);
    await new Promise(r => setTimeout(() => r(), 10000));


    // Set up
    const START_BLOCK = 13361951;
    const END_BLOCK = START_BLOCK + (28800 * 30);
    const USER_POOL_LIMIT = 0;
    const tx10 = await smartChefFactory.deployPool(
        GLOBAL_TOKEN_ADDRESS,
        OWL_ADDRESS,
        "694444444444444000",
        START_BLOCK,
        END_BLOCK,
        bep20Amount(USER_POOL_LIMIT),
        DEV_POWER_ADDRESS
    );
    const result10 = await tx10.wait();
    const smartChefAddress10 = result10.events[2].args[0];
    console.log("SmartChef created for GLB - OWL on:", smartChefAddress10);
    await new Promise(r => setTimeout(() => r(), 10000));

    const START_BLOCK = 13435045;
    const END_BLOCK = START_BLOCK + (28800 * 18);
    const USER_POOL_LIMIT = 0;
    // Set up
    const tx11 = await smartChefFactory.deployPool(
        GLOBAL_TOKEN_ADDRESS,
        GLOBAL_TOKEN_ADDRESS,
        "1740000000000000000",
        START_BLOCK,
        END_BLOCK,
        bep20Amount(USER_POOL_LIMIT),
        DEV_POWER_ADDRESS
    );
    const result11 = await tx11.wait();
    const smartChefAddress11 = result11.events[2].args[0];
    console.log("SmartChef created for GLB -> GLB on:", smartChefAddress11);
    await new Promise(r => setTimeout(() => r(), 10000));*/
    /*await hre.run("verify:verify", {
        address: smartChefFactory.address,
        constructorArguments: [],
    });*/

    await hre.run("verify:verify", {
        address: smartChefAddress1,
        constructorArguments: [],
    });
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
