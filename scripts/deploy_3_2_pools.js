const hre = require("hardhat");
require("@nomiclabs/hardhat-ethers");

const {
    BUSD_ADDRESS,
    ROUTER_ADDRESS,
    DEPLOYER_ADDRESS,
    GLOBAL_TOKEN_ADDRESS,
    MASTERCHEF_ADDRESS
} = require("./addresses");
const {bep20Amount} = require("../test/helpers/utils");

let bUSDToken;
let router;
let masterChef;
let nativeToken;

async function main() {
    console.log("Starting to add liquidity and add pools");

    [deployer] = await hre.ethers.getSigners();


    const BUSDToken = await ethers.getContractFactory("BEP20");
    bUSDToken = await BUSDToken.attach(BUSD_ADDRESS);

    const NativeToken = await ethers.getContractFactory("NativeToken");
    nativeToken = await NativeToken.attach(GLOBAL_TOKEN_ADDRESS);

    const Router = await ethers.getContractFactory("Router");
    router = await Router.attach(ROUTER_ADDRESS);

    const MasterChef = await ethers.getContractFactory("MasterChef");
    masterChef = await MasterChef.attach(MASTERCHEF_ADDRESS);

    await new Promise(r => setTimeout(() => r(), 10000));


    // POOL BUSD-WBNB
    await bUSDToken.approve(ROUTER_ADDRESS,bep20Amount(10000));
    await new Promise(r => setTimeout(() => r(), 10000));

    const tx1 = await router.addLiquidityETH(
        BUSD_ADDRESS,
        bep20Amount(3),
        bep20Amount(3),
        0,
        DEPLOYER_ADDRESS,
        (new Date()).setTime((new Date()).getTime()),
        { value: ethers.utils.parseEther("0.001") }
    );
    const result1 = await tx1.wait();
    let pairAddress1 = result1.events[1].topics[2];
    let pairAddress1Trim =pairAddress1.replace("000000000000000000000000","");
    console.log("Pair BUSD-WBNB created at address:",pairAddress1Trim);
    await masterChef.addPool(
        100,
        pairAddress1Trim,
        36000,
        345600,
        60,
        20,
        200,
        200
    );
    console.log("Pool BUSD-WBNB successfully created");

    await new Promise(r => setTimeout(() => r(), 10000));


    // POOL GLOBAL-WBNB
    await nativeToken.approve(ROUTER_ADDRESS,bep20Amount(10000));
    await new Promise(r => setTimeout(() => r(), 10000));

    const tx2 = await router.addLiquidityETH(
        GLOBAL_TOKEN_ADDRESS,
        bep20Amount(1),
        bep20Amount(1),
        0,
        DEPLOYER_ADDRESS,
        (new Date()).setTime((new Date()).getTime()),
        { value: ethers.utils.parseEther("0.001") }
    );
    const result2 = await tx2.wait();
    let pairAddress2 = result2.events[1].topics[2];
    let pairAddress2Trim =pairAddress2.replace("000000000000000000000000","");
    console.log("Pair GLOBAL-WBNB created at address:",pairAddress2Trim);
    await masterChef.addPool(
        2000,
        pairAddress2Trim,
        36000,
        345600,
        60,
        20,
        200,
        200
    );
    console.log("Pool GLOBAL-WBNB successfully created");

    await new Promise(r => setTimeout(() => r(), 10000));


    // POOL GLOBAL-BUSD
    const tx3 = await router.addLiquidity(
        GLOBAL_TOKEN_ADDRESS,
        BUSD_ADDRESS,
        bep20Amount(1),
        bep20Amount(3),
        0,
        0,
        DEPLOYER_ADDRESS,
        (new Date()).setTime((new Date()).getTime())
    );

    const result3 = await tx3.wait();
    let pairAddress3 = result3.events[1].topics[2];
    let pairAddress3Trim =pairAddress3.replace("000000000000000000000000","");
    console.log("Pair GLOBAL-BUSD created at address:",pairAddress3Trim);
    await masterChef.addPool(
        2000,
        pairAddress3Trim,
        36000,
        345600,
        60,
        20,
        200,
        200
    );
    console.log("Pool GLOBAL-BUSD successfully created");

    await new Promise(r => setTimeout(() => r(), 10000));

    console.log("Pools added");
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
.then(() => process.exit(0))
.catch((error) => {
    console.error(error);
    process.exit(1);
});