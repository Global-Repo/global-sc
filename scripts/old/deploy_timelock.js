const hre = require("hardhat");
const { BigNumber } = require("@ethersproject/bignumber");
require("@nomiclabs/hardhat-ethers");
const {ethers} = require("hardhat");
const {
    deployGlobal,
    deployFactory,
    deployRouter,
    deployTokenAddresses,
    deployPathFinder,
    deployMintNotifier,
    deploySmartChefFactory,
    deployVaultLocked,
} = require("../test/helpers/singleDeploys.js");
const { timestampNHours, bep20Amount } = require("../test/helpers/utils.js");

let globalToken; //
let factory;
let router;
let tokenAddresses;
let pathFinder;
let masterChefInternal;
let masterChef;
let smartChefFactory;
let mintNotifier;
let vaultLocked;

let wethAddress;
let busdAddress;
let cakeAddress;

let CURRENT_BLOCK;
let masterChefStartBlock

// Addresses
let DEPLOYER_ADDRESS = null;
let TREASURY_ADDRESS = null;
let DEV_ADDRESS = null;
let DEV_POWER_ADDRESS = null;

const TOKEN_DECIMALS = 18;
const BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER = BigNumber.from(10).pow(TOKEN_DECIMALS);
async function main() {
    [owner, ...addrs] = await hre.ethers.getSigners();

    const Token = await ethers.getContractFactory("BEP20");
    const token = await Token.deploy("LOKO", "LOKO");
    await token.deployed();
    console.log("token: ", token.address);

    await hre.run("verify:verify", {
        address: token.address,
        constructorArguments: [
            "LOKO",
            "LOKO"
        ],
    });
    /*const Timelock = await ethers.getContractFactory("Timelock");
    const timelock = await Timelock.deploy(owner.address, 60);
    await timelock.deployed();
    console.log("timelock: ", timelock.address);*/

    const Multisig = await ethers.getContractFactory("MultiSigWallet");
    const multisig = await Multisig.deploy(["0xae1671Faa94A7Cc296D3cb0c3619e35600de384C","0x1daDDe3C9Fa76D1b59f61A9B41c0ef1f89968aa3","0x73feaa1ee314f8c655e354234017be2193c9e24e"], 2);
    await multisig.deployed();
    console.log("multisig: ", multisig.address);

    await hre.run("verify:verify", {
        address: multisig.address,
        constructorArguments: [
            ["0xae1671Faa94A7Cc296D3cb0c3619e35600de384C","0x1daDDe3C9Fa76D1b59f61A9B41c0ef1f89968aa3","0x73feaa1ee314f8c655e354234017be2193c9e24e"],
            2
        ],
    });

    await token.transferOwnership(multisig.address);
    console.log("Token ownership for:", multisig.address);

}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
