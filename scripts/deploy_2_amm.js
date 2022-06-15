const hre = require("hardhat");
require("@nomiclabs/hardhat-ethers");
const {ethers} = require("hardhat");
const {
    GLOBAL_TOKEN_ADDRESS,
    WETH_ADDRESS,
    BUSD_ADDRESS,
    CAKE_ADDRESS,
    TREASURY_SWAP_ADDRESS,
    DEPLOYER_ADDRESS
} = require("./addresses");
const {
    deployFactory,
    deployRouter,
    deployTokenAddresses,
} = require("../test/helpers/singleDeploys");

let factory;
let router;

let CURRENT_BLOCK;

async function main() {
    console.log("Starting deploy");
    console.log("Ensure you have proper addresses set up into addresses.js for: GLOBAL_TOKEN_ADDRESS");

    [deployer] = await hre.ethers.getSigners();

    CURRENT_BLOCK = await ethers.provider.getBlockNumber();
    console.log("Current block is:", CURRENT_BLOCK);

    // Start
    //factory = await deployFactory(DEPLOYER_ADDRESS);
    const Factory = await ethers.getContractFactory("Factory");
    factory = await Factory.attach("0x5C28c151C27C02ae7fFfB8c4e47b3557c3A40344");
    console.log("Factory deployed to:", factory.address);
    await new Promise(r => setTimeout(() => r(), 10000));

    await factory.setFeeTo(DEPLOYER_ADDRESS);
    console.log("FeeTo from factory set to treasury:", DEPLOYER_ADDRESS);
    await new Promise(r => setTimeout(() => r(), 10000));

    //router = await deployRouter(factory.address, WETH_ADDRESS);
    const Router = await ethers.getContractFactory("Router");
    router = await Router.attach("0x637315757AC58Ee020Ef2e27e24482873011f21C");
    console.log("Router deployed to:", router.address);
    await new Promise(r => setTimeout(() => r(), 10000));

    console.log("Current block is:", CURRENT_BLOCK);

    //VERIFY AMM
    /*await hre.run("verify:verify", {
        address: factory.address,
        constructorArguments: [
            DEPLOYER_ADDRESS
        ],
    });

    await hre.run("verify:verify", {
        address: router.address,
        constructorArguments: [
            factory.address,
            WETH_ADDRESS
        ],
    });*/

    await hre.run("verify:verify", {
        address: "0x0d954c8791cf728dc892e285ee177d4c0b4bd7c5",
        constructorArguments: [
        ],
    });



    console.log("Deploy finished");
    console.log("Ensure you update, Router, TokenAddresses address into addresses.js");
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });


