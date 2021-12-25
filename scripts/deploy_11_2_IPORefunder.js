const hre = require("hardhat");
require("@nomiclabs/hardhat-ethers");
const { BigNumber } = require("@ethersproject/bignumber");

let ipoRefunder;

async function main() {
    console.log("Starting deploy refunder");

    [deployer] = await hre.ethers.getSigners();

    const IPORefunder = await ethers.getContractFactory("IPORefunder");
    ipoRefunder = await IPORefunder.deploy("0x1f993896a6e00BF0c2a5Fe6a9d6ACB991FD955dA", "0x09f909a25d04d690dfb9b1a01ed2d129e8969ee8");


    console.log("IPO Refunder deployed to:", ipoRefunder.address);
    await new Promise(r => setTimeout(() => r(), 10000));

    await hre.run("verify:verify", {
        address: ipoRefunder.address,
        constructorArguments: [
            "0x1f993896a6e00BF0c2a5Fe6a9d6ACB991FD955dA",
            "0x09f909a25d04d690dfb9b1a01ed2d129e8969ee8"
        ],
    });


    console.log("Rewarder deployed");
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
