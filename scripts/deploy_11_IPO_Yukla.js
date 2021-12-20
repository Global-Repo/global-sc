const hre = require("hardhat");
require("@nomiclabs/hardhat-ethers");

const {
    DEV_POWER_ADDRESS,
} = require("./addresses");

const {
    deployVaultLocked,
} = require("../test/helpers/singleDeploys");

const { timestampNHours, timestampNDays, bep20Amount } = require("../test/helpers/utils.js");

const VAULT_LOCKED_DISTRIBUTE_GLOBAL_INTERVAL = timestampNHours(12); // 12h, Hours to distribute Globals from last distribution event.

let CURRENT_BLOCK;
let ipo;

async function main() {
    console.log("Starting deploy");

    [deployer] = await hre.ethers.getSigners();

    CURRENT_BLOCK = await ethers.provider.getBlockNumber();
    console.log("Current block is:", CURRENT_BLOCK);

    // Attach
    const IPO = await ethers.getContractFactory("IPO");
    ipo = await IPO.deploy(
        "0x09f909A25D04d690DFb9B1A01Ed2D129E8969eE8",
        "0xD1831487Df03Af92a30603Cd6926D0A8f3798dF9",//"0x1ca64898485Ccc5be993695B9E3c171b75dC13C1",
        13506600, //CURRENT_BLOCK,
        13506600 + (28800*9), //CURRENT_BLOCK+100,
        55,
        bep20Amount(31620),
        DEV_POWER_ADDRESS
    );

    await ipo.deployed();
    console.log("IPO deployed to:", ipo.address);
    await new Promise(r => setTimeout(() => r(), 10000));

    // Verify
    await hre.run("verify:verify", {
        address: "0x6519979490884075AF390A569C1e07F7173AE672",//ipo.address,
        constructorArguments: [
            "0x09f909A25D04d690DFb9B1A01Ed2D129E8969eE8",
            "0xD1831487Df03Af92a30603Cd6926D0A8f3798dF9",//"0x1ca64898485Ccc5be993695B9E3c171b75dC13C1",
            13506600, //CURRENT_BLOCK,
            13506600 + (28800*9), //CURRENT_BLOCK+100,
            55,
            bep20Amount(31620),
            DEV_POWER_ADDRESS
        ],
    });

    console.log("Deploy finished");
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
