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
    /*ipo = await IPO.attach(
        "0x1f993896a6e00BF0c2a5Fe6a9d6ACB991FD955dA"
    );
    let prova = await ipo.userInfo("0x6063130f5Ba259ee9d51F62c16ABFe1B4b91610B")
    console.log(prova.toString());*/

    /*ipo = await IPO.deploy(
        "0x09f909a25d04d690dfb9b1a01ed2d129e8969ee8",
         "0xd1831487df03af92a30603cd6926d0a8f3798df9",
        CURRENT_BLOCK,
        CURRENT_BLOCK+12000,
        55,
        bep20Amount(31620),
        DEV_POWER_ADDRESS
    );

    await ipo.deployed();
    console.log("IPO deployed to:", ipo.address);
    await new Promise(r => setTimeout(() => r(), 10000));*/

    // Verify
    await hre.run("verify:verify", {
        address: "0x6a866FFFa5345E68aB3ca5A88dE1C9CD64b60eEB", //ipo.address,
        constructorArguments: [
            "0x09f909a25d04d690dfb9b1a01ed2d129e8969ee8",
            "0xd1831487df03af92a30603cd6926d0a8f3798df9",
            13595594,
            13595594+12000,
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
