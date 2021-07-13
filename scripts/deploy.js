const hre = require("hardhat");
const { BigNumber } = require("@ethersproject/bignumber");
require("@nomiclabs/hardhat-ethers");

const TOKEN_DECIMALS = 18;
const BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER = BigNumber.from(10).pow(TOKEN_DECIMALS);

const DEV_ADDRESS = "0xae1671Faa94A7Cc296D3cb0c3619e35600de384C";
const NATIVE_TOKEN_PER_BLOCK = BigNumber.from(40).mul(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER);

async function main() {
    const CURRENT_BLOCK = await ethers.provider.getBlockNumber();
    console.log("Current block is:", CURRENT_BLOCK);

    const NativeToken = await hre.ethers.getContractFactory("NativeToken");
    const nativeToken = await NativeToken.deploy();
    await nativeToken.deployed();

    // const QuoteToken = await hre.ethers.getContractFactory("QuoteToken");
    // const quoteToken = await QuoteToken.deploy(nativeToken.address);
    // await quoteToken.deployed();

    const MasterChef = await hre.ethers.getContractFactory("MasterChef");
    const masterChef = await MasterChef.deploy(
        nativeToken.address,
        NATIVE_TOKEN_PER_BLOCK,
        CURRENT_BLOCK + 1,
        "0xae1671Faa94A7Cc296D3cb0c3619e35600de384C" // TODO: Router Global
    );
    await masterChef.deployed();

    console.log("NativeToken deployed to:", nativeToken.address);
    // console.log("QuoteToken deployed to:", quoteToken.address);
    console.log("Masterchef deployed to:", masterChef.address);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
