const { ethers } = require("hardhat");
const {
    /*BUSD_ADDRESS,
    GLBD_ADDRESS,
    DEPLOYER_ADDRESS,
    GLB_ADDRESS,
    SGLBD_ADDRESS*/
} = require("./addresses");
const {BigNumber} = require("@ethersproject/bignumber");

const TOKEN_DECIMALS_LITTLE = 9;
const BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER_LITTLE = BigNumber.from(10).pow(TOKEN_DECIMALS_LITTLE);
const INITIAL_SUPPLY = BigNumber.from(60000).mul(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER_LITTLE);

const TOKEN_DECIMALS_BIG = 18;
const BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER_BIG = BigNumber.from(10).pow(TOKEN_DECIMALS_BIG);
const INITIAL_SUPPLY_BIG = BigNumber.from(60000).mul(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER_BIG);

async function main() {

    const [deployer] = await ethers.getSigners();

    let harvestTime = 6480000; //2.5 mesos
    let ratio = 380;
    let timeoutPeriod = 10000;
    let maxDeposit = BigNumber.from(500000).mul(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER_BIG);
    let deploySWAPREWARD = true;
    let largeApproval = '1000000000000000000000000000000000000';

    console.log('Deploying contracts. Deployer account: ' + deployer.address);
    let swapReward;
    const SWAPREWARD = await ethers.getContractFactory('SwapReward');
    if (deploySWAPREWARD) {
        // Deploy SWAPREWARD
        console.log("[Deploying SWAPREWARD SC]");
        swapReward = await SWAPREWARD.deploy();
        console.log("[SWAPREWARD deployed]: " + swapReward.address);
        await new Promise(r => setTimeout(() => r(), timeoutPeriod));
        console.log("[Success]");

        try {
            console.log("VERIFYING SWAPREWARD: ", swapReward.address);
            //// Verify contract on bsc
            await hre.run("verify:verify", {
                address: swapReward.address,
                constructorArguments: [
                ],
            });
            console.log( "Verified SWAPREWARD: " + swapReward.address );
        } catch (err) {
            console.log(err.message);
        }
    } else {
        // Attach SWAPREWARD
        console.log("[Attaching SWAPREWARD SC]");
        swapReward = await SWAPREWARD.attach("0x289D2C8D914e0a7EAf9991D0E848D4A8795f022d");
        console.log("[SWAPREWARD attached]: " + swapReward.address);
    }


    console.log("DEPLOYMENT SUCCESSFULLY FINISHED");
}


main()
    .then(() => process.exit())
    .catch(error => {
        console.error(error);
        process.exit(1);
})

