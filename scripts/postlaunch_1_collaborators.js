const hre = require("hardhat");
require("@nomiclabs/hardhat-ethers");

const {
    GLOBAL_TOKEN_ADDRESS, MASTERCHEF_ADDRESS
} = require("./addresses");
const {ethers} = require("hardhat");

let masterChef;
let minterVested;

async function main() {
    console.log("Starting Minter Vested deploy");
    console.log("Ensure you have proper addresses set up into addresses.js for: MasterChef");

    [deployer] = await hre.ethers.getSigners();

    const MasterChef = await ethers.getContractFactory("MasterChef");
    masterChef = await MasterChef.attach(MASTERCHEF_ADDRESS);

    const MinterVested = await ethers.getContractFactory("MinterVested");
    minterVested = await MinterVested.deploy(MASTERCHEF_ADDRESS,GLOBAL_TOKEN_ADDRESS);
    await minterVested.deployed();
    console.log("Minter Vested deployed on address", minterVested.address);

    await new Promise(r => setTimeout(() => r(), 10000));

    await masterChef.setMinter(minterVested.address, true);


    console.log("Minter Vested deploy finished");
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });