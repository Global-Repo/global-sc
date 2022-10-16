const { ethers } = require("hardhat");
const {BigNumber} = require("@ethersproject/bignumber");

const TOKEN_DECIMALS_LITTLE = 9;
const BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER_LITTLE = BigNumber.from(10).pow(TOKEN_DECIMALS_LITTLE);
const INITIAL_SUPPLY = BigNumber.from(60000).mul(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER_LITTLE);

const TOKEN_DECIMALS_BIG = 18;
const BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER_BIG = BigNumber.from(10).pow(TOKEN_DECIMALS_BIG);
const INITIAL_SUPPLY_BIG = BigNumber.from(60000).mul(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER_BIG);

async function main() {

    const [deployer] = await ethers.getSigners();

    console.log('Deploying contracts. Deployer account: ' + deployer.address);

    //MAINNET
    console.log("[Disperse statistics for SwapReward]");
    const SWAPREWARD = await ethers.getContractFactory('SwapReward');
    let swapreward = await SWAPREWARD.attach("0x289D2C8D914e0a7EAf9991D0E848D4A8795f022d");

    console.log(swapreward.functions);

    console.log("Statistics successfully printed");
}


main()
    .then(() => process.exit())
    .catch(error => {
        console.error(error);
        process.exit(1);
    })

