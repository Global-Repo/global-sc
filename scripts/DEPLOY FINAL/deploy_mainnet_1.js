const hre = require("hardhat");
const { BigNumber } = require("@ethersproject/bignumber");
require("@nomiclabs/hardhat-ethers");
const {ethers} = require("hardhat");

let nativeToken;
let presale;

const TOKEN_DECIMALS = 18;
const BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER = BigNumber.from(10).pow(TOKEN_DECIMALS);

const NATIVE_TOKEN_TO_MINT = BigNumber.from(1000000).mul(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER);

async function main() {
    [owner, ...addrs] = await hre.ethers.getSigners();

    const NativeToken = await ethers.getContractFactory("NativeToken");
    nativeToken = await NativeToken.deploy();
    await nativeToken.deployed();
    console.log("NativeToken deployed to:", nativeToken.address);

    const whiteTime = (1633118400); // Oct 1st 10pm
    const publicTime = (1633982400); // Oct 11th 10pm

    const Presale = await ethers.getContractFactory("Presale");
    presale = await Presale.deploy(nativeToken.address, whiteTime, publicTime);
    await presale.deployed();
    console.log("Presale deployed to:", presale.address);
    console.log("Presale whiteTime:", whiteTime);
    console.log("Presale publicTime:", publicTime);

    await nativeToken.transferOwnership(presale.address);
    console.log("Native token ownership for:", presale.address);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
