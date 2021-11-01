const hre = require("hardhat");
const { deployMasterChef } = require("../test/helpers/singleDeploys.js");
const { BigNumber } = require("@ethersproject/bignumber");
require("@nomiclabs/hardhat-ethers");
const {ethers} = require("hardhat");
const {
    deployMasterChef,
    deployMasterChefInternal,
    deployTokenAddresses,
    deployPathFinder,
} = require("../test/helpers/singleDeploys.js");

const TOKEN_DECIMALS = 18;
const BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER = BigNumber.from(10).pow(TOKEN_DECIMALS);

// Setup
let masterChefStartBlock = null;
const NATIVE_TOKEN_PER_BLOCK = BigNumber.from(40).mul(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER);

// Deployed contracts
let masterChef;
let masterChefInternal;

async function main() {
    [owner, ...addrs] = await hre.ethers.getSigners();

    const CURRENT_BLOCK = await ethers.provider.getBlockNumber();
    console.log("Current block is:", CURRENT_BLOCK);

    tokenAddresses = await deployTokenAddresses();
    console.log("TokenAddresses deployed to:", tokenAddresses.address);

    await tokenAddresses.addToken(tokenAddresses.GLOBAL(), globalToken.address);
    console.log("Added Global to TokenAddresses with address:", globalToken.address);
    await tokenAddresses.addToken(tokenAddresses.BNB(), wethAddress);
    console.log("Added BNB to TokenAddresses with address:", wethAddress);
    await tokenAddresses.addToken(tokenAddresses.WBNB(), wethAddress);
    console.log("Added WBNB to TokenAddresses with address:", wethAddress);
    await tokenAddresses.addToken(tokenAddresses.BUSD(), busdAddress);
    console.log("Added BUSD to TokenAddresses with address:", busdAddress);
    await tokenAddresses.addToken(tokenAddresses.CAKE(), cakeAddress);
    console.log("Added CAKE to TokenAddresses with address:", cakeAddress);
    //
    //await tokenAddresses.addToken(tokenAddresses.CAKE_WBNB_LP(), cakeWbnbLPAddress);
    //console.log("Added CAKE-WBNB-LP to TokenAddresses with address:", cakeWbnbLPAddress);

    pathFinder = await deployPathFinder(tokenAddresses.address);
    console.log("PathFinder deployed to:", pathFinder.address);

    // Setup
    masterChefStartBlock = CURRENT_BLOCK + 1;

    const MasterChefInternal = await ethers.getContractFactory("MasterChefInternal");
    masterChefInternal = await MasterChefInternal.deploy(tokenaddresses,pathfinder);
    await masterChefInternal.deployed();
    console.log("Masterchef Internal deployed to:", masterChefInternal.address);

    const MasterChef = await ethers.getContractFactory("MasterChef");
    masterChef = await MasterChef.deploy(
        masterChefInternal.address,
        "0x6fA19aEBd7BEF3D7e351532A69908d33b57E5fDE",
        NATIVE_TOKEN_PER_BLOCK,
        masterChefStartBlock,
        "0x793793C732645eA7506dc52387C7d38A6804f303",
        "0xD190C873C875F4DD85D7AeD8CCddAB11cC88C485",
        "0x64787D2F505A006907A160f76e24Ed732fc6FDA6"
    );
    await masterChef.deployed();
    console.log("Masterchef deployed to:", masterChef.address);
    console.log("Globals per block: ", NATIVE_TOKEN_PER_BLOCK.toString());
    console.log("Start block", masterChefStartBlock);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
