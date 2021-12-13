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
        "0xe532A78c3d838AfD51a41f4F827b506d3e7265A0",
         "0xAAC81c0c950058256cf3D8ab7A7eedCDBdd18677",
        CURRENT_BLOCK+400,
        CURRENT_BLOCK+1200,
        bep20Amount(100),
        bep20Amount(200),
        DEV_POWER_ADDRESS
    );

    await ipo.deployed();
    console.log("IPO deployed to:", ipo.address);
    await new Promise(r => setTimeout(() => r(), 10000));

    // Verify
    await hre.run("verify:verify", {
        address: ipo.address,
        constructorArguments: [
            "0xe532A78c3d838AfD51a41f4F827b506d3e7265A0",
            "0xAAC81c0c950058256cf3D8ab7A7eedCDBdd18677",
            CURRENT_BLOCK+400,
            CURRENT_BLOCK+1200,
            bep20Amount(100),
            bep20Amount(200),
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
