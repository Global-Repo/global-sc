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
let tokenAddresses;

let CURRENT_BLOCK;

async function main() {
    console.log("Starting deploy");
    console.log("Ensure you have proper addresses set up into addresses.js for: GLOBAL_TOKEN_ADDRESS");

    [deployer] = await hre.ethers.getSigners();

    CURRENT_BLOCK = await ethers.provider.getBlockNumber();
    console.log("Current block is:", CURRENT_BLOCK);

    // Start
    factory = await deployFactory(DEPLOYER_ADDRESS);
    console.log("Factory deployed to:", factory.address);
    await new Promise(r => setTimeout(() => r(), 10000));

    await factory.setFeeTo(TREASURY_SWAP_ADDRESS);
    console.log("FeeTo from factory set to treasury:", TREASURY_SWAP_ADDRESS);
    await new Promise(r => setTimeout(() => r(), 10000));

    router = await deployRouter(factory.address, WETH_ADDRESS);
    console.log("Router deployed to:", router.address);
    await new Promise(r => setTimeout(() => r(), 10000));

    tokenAddresses = await deployTokenAddresses();
    console.log("TokenAddresses deployed to:", tokenAddresses.address);
    await new Promise(r => setTimeout(() => r(), 10000));

    await tokenAddresses.addToken(tokenAddresses.GLOBAL(), GLOBAL_TOKEN_ADDRESS);
    console.log("Added Global to TokenAddresses with address:", GLOBAL_TOKEN_ADDRESS);
    await new Promise(r => setTimeout(() => r(), 10000));
    await tokenAddresses.addToken(tokenAddresses.BNB(), WETH_ADDRESS);
    console.log("Added BNB to TokenAddresses with address:", WETH_ADDRESS);
    await new Promise(r => setTimeout(() => r(), 10000));
    await tokenAddresses.addToken(tokenAddresses.WBNB(), WETH_ADDRESS);
    console.log("Added WBNB to TokenAddresses with address:", WETH_ADDRESS);
    await new Promise(r => setTimeout(() => r(), 10000));
    await tokenAddresses.addToken(tokenAddresses.BUSD(), BUSD_ADDRESS);
    console.log("Added BUSD to TokenAddresses with address:", BUSD_ADDRESS);
    await new Promise(r => setTimeout(() => r(), 10000));
    await tokenAddresses.addToken(tokenAddresses.CAKE(), CAKE_ADDRESS);
    console.log("Added CAKE to TokenAddresses with address:", CAKE_ADDRESS);
    await new Promise(r => setTimeout(() => r(), 10000));

    console.log("Current block is:", CURRENT_BLOCK);

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
