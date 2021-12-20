const hre = require("hardhat");
require("@nomiclabs/hardhat-ethers");

const {
    BUSD_ADDRESS,
    BTC_ADDRESS,
    ETH_ADDRESS,
    USDT_ADDRESS,
    ADA_ADDRESS,
    ROUTER_ADDRESS,
    DEPLOYER_ADDRESS,
    GLOBAL_TOKEN_ADDRESS,
    MASTERCHEF_ADDRESS
} = require("./addresses");
const {bep20Amount} = require("../test/helpers/utils");
const {BigNumber} = require("@ethersproject/bignumber");

let bUSDToken;
let bTCToken;
let eTHToken;
let uSDTToken;
let aDAToken;
let router;
let masterChef;
let nativeToken;

async function main() {
    console.log("Starting to change multipliers to farms");

    [deployer] = await hre.ethers.getSigners();

    const MasterChef = await ethers.getContractFactory("MasterChef");
    masterChef = await MasterChef.attach(MASTERCHEF_ADDRESS);

    //let prova =await masterChef.poolInfo(19);

    await new Promise(r => setTimeout(() => r(), 10000));

    // 1 BUSD-BNB
    await masterChef.setPool(
        1,
        100,//prova[1],
        0,//prova[4],
        0,//prova[5],
        0,//prova[6],
        0,//prova[7],
        0,//prova[8],
        0//prova[9]
    );

    await new Promise(r => setTimeout(() => r(), 10000));

    // 2 GLB-BNB
    await masterChef.setPool(
        2,
        300,//prova[1],
        0,//prova[4],
        0,//prova[5],
        0,//prova[6],
        0,//prova[7],
        0,//prova[8],
        0//prova[9]
    );

    await new Promise(r => setTimeout(() => r(), 10000));

    // 3 GLB-BUSD
    await masterChef.setPool(
        3,
        400,//prova[1],
        0,//prova[4],
        0,//prova[5],
        0,//prova[6],
        0,//prova[7],
        0,//prova[8],
        0//prova[9]
    );

    await new Promise(r => setTimeout(() => r(), 10000));

    // 4 BTC-BNB
    await masterChef.setPool(
        4,
        12,//prova[1],
        0,//prova[4],
        0,//prova[5],
        0,//prova[6],
        0,//prova[7],
        0,//prova[8],
        0//prova[9]
    );

    await new Promise(r => setTimeout(() => r(), 10000));

    // 5 ETH-BNB
    await masterChef.setPool(
        5,
        12,//prova[1],
        0,//prova[4],
        0,//prova[5],
        0,//prova[6],
        0,//prova[7],
        0,//prova[8],
        0//prova[9]
    );

    await new Promise(r => setTimeout(() => r(), 10000));

    // 6 USDT-BUSD
    await masterChef.setPool(
        6,
        20,//prova[1],
        0,//prova[4],
        0,//prova[5],
        0,//prova[6],
        0,//prova[7],
        0,//prova[8],
        0//prova[9]
    );

    await new Promise(r => setTimeout(() => r(), 10000));

    // 7 ETH-BTC
    await masterChef.setPool(
        7,
        12,//prova[1],
        0,//prova[4],
        0,//prova[5],
        0,//prova[6],
        0,//prova[7],
        0,//prova[8],
        0//prova[9]
    );

    await new Promise(r => setTimeout(() => r(), 10000));

    // 8 ADA-BNB
    await masterChef.setPool(
        8,
        12,//prova[1],
        0,//prova[4],
        0,//prova[5],
        0,//prova[6],
        0,//prova[7],
        0,//prova[8],
        0//prova[9]
    );

    await new Promise(r => setTimeout(() => r(), 10000));

    // 9 GLB-CAKE
    await masterChef.setPool(
        9,
        12,//prova[1],
        0,//prova[4],
        0,//prova[5],
        0,//prova[6],
        0,//prova[7],
        0,//prova[8],
        0//prova[9]
    );

    await new Promise(r => setTimeout(() => r(), 10000));

    // 10 SOL-BNB
    await masterChef.setPool(
        10,
        12,//prova[1],
        0,//prova[4],
        0,//prova[5],
        0,//prova[6],
        0,//prova[7],
        0,//prova[8],
        0//prova[9]
    );

    await new Promise(r => setTimeout(() => r(), 10000));

    // 11 DOT-BNB
    await masterChef.setPool(
        11,
        12,//prova[1],
        0,//prova[4],
        0,//prova[5],
        0,//prova[6],
        0,//prova[7],
        0,//prova[8],
        0//prova[9]
    );

    await new Promise(r => setTimeout(() => r(), 10000));

    // 12 FTM-BNB
    await masterChef.setPool(
        12,
        12,//prova[1],
        0,//prova[4],
        0,//prova[5],
        0,//prova[6],
        0,//prova[7],
        0,//prova[8],
        0//prova[9]
    );

    await new Promise(r => setTimeout(() => r(), 10000));

    // 13 USDC-BUSD
    await masterChef.setPool(
        13,
        20,//prova[1],
        0,//prova[4],
        0,//prova[5],
        0,//prova[6],
        0,//prova[7],
        0,//prova[8],
        0//prova[9]
    );

    await new Promise(r => setTimeout(() => r(), 10000));

    // 14 LINK-BNB
    await masterChef.setPool(
        14,
        12,//prova[1],
        0,//prova[4],
        0,//prova[5],
        0,//prova[6],
        0,//prova[7],
        0,//prova[8],
        0//prova[9]
    );

    await new Promise(r => setTimeout(() => r(), 10000));

    // 15 RPS-BNB
    await masterChef.setPool(
        15,
        12,//prova[1],
        0,//prova[4],
        0,//prova[5],
        0,//prova[6],
        0,//prova[7],
        0,//prova[8],
        0//prova[9]
    );

    await new Promise(r => setTimeout(() => r(), 10000));

    // 16 XRP-BNB
    await masterChef.setPool(
        16,
        12,//prova[1],
        0,//prova[4],
        0,//prova[5],
        0,//prova[6],
        0,//prova[7],
        0,//prova[8],
        0//prova[9]
    );

    await new Promise(r => setTimeout(() => r(), 10000));

    // 17 DOGE-BNB
    await masterChef.setPool(
        17,
        12,//prova[1],
        0,//prova[4],
        0,//prova[5],
        0,//prova[6],
        0,//prova[7],
        0,//prova[8],
        0//prova[9]
    );

    await new Promise(r => setTimeout(() => r(), 10000));

    // 18 GLB-USDT
    await masterChef.setPool(
        18,
        12,//prova[1],
        0,//prova[4],
        0,//prova[5],
        0,//prova[6],
        0,//prova[7],
        0,//prova[8],
        0//prova[9]
    );

    await new Promise(r => setTimeout(() => r(), 10000));

    // 19 RGOLD-BNB
    await masterChef.setPool(
        19,
        12,//prova[1],
        0,//prova[4],
        0,//prova[5],
        0,//prova[6],
        0,//prova[7],
        0,//prova[8],
        0//prova[9]
    );


    console.log("Farms modified");
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
.then(() => process.exit(0))
.catch((error) => {
    console.error(error);
    process.exit(1);
});