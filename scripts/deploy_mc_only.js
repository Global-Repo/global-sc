const hre = require("hardhat");
const { deployMasterChef } = require("../test/helpers/singleDeploys.js");
const { BigNumber } = require("@ethersproject/bignumber");
require("@nomiclabs/hardhat-ethers");
const {ethers} = require("hardhat");

const TOKEN_DECIMALS = 18;
const BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER = BigNumber.from(10).pow(TOKEN_DECIMALS);

// Setup
let feeSetterAddress = null;
let masterChefStartBlock = null;
const NATIVE_TOKEN_PER_BLOCK = BigNumber.from(40).mul(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER);

// Deployed contracts
let masterChef;

async function main() {
    [owner, ...addrs] = await hre.ethers.getSigners();

    const CURRENT_BLOCK = await ethers.provider.getBlockNumber();
    console.log("Current block is:", CURRENT_BLOCK);

    // Setup
    feeSetterAddress = owner.address;
    masterChefStartBlock = CURRENT_BLOCK + 1;

    masterChef = await deployMasterChef(
        "0x6fA19aEBd7BEF3D7e351532A69908d33b57E5fDE",
        "0x793793C732645eA7506dc52387C7d38A6804f303",
        "0xD190C873C875F4DD85D7AeD8CCddAB11cC88C485",
        "0x64787D2F505A006907A160f76e24Ed732fc6FDA6"
    );
    console.log("Masterchef deployed to:", masterChef.address);
    console.log("Globals per block: ", NATIVE_TOKEN_PER_BLOCK.toString());
    console.log("Start block", CURRENT_BLOCK + 1);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
