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
    console.log("Starting to add liquidity and add pools");

    [deployer] = await hre.ethers.getSigners();


    const BUSDToken = await ethers.getContractFactory("BEP20");
    bUSDToken = await BUSDToken.attach(BUSD_ADDRESS);

    const BTCToken = await ethers.getContractFactory("BEP20");
    bTCToken = await BTCToken.attach(BTC_ADDRESS);

    const ETHToken = await ethers.getContractFactory("BEP20");
    eTHToken = await ETHToken.attach(ETH_ADDRESS);

    const USDTToken = await ethers.getContractFactory("BEP20");
    uSDTToken = await USDTToken.attach(USDT_ADDRESS);

    const ADAToken = await ethers.getContractFactory("BEP20");
    aDAToken = await ADAToken.attach(ADA_ADDRESS);

    const NativeToken = await ethers.getContractFactory("NativeToken");
    nativeToken = await NativeToken.attach(GLOBAL_TOKEN_ADDRESS);

    const Router = await ethers.getContractFactory("Router");
    router = await Router.attach(ROUTER_ADDRESS);

    const MasterChef = await ethers.getContractFactory("MasterChef");
    masterChef = await MasterChef.attach(MASTERCHEF_ADDRESS);

    await new Promise(r => setTimeout(() => r(), 10000));

    /*
    // POOL BUSD-WBNB
    await bUSDToken.approve(ROUTER_ADDRESS,bep20Amount(10000));
    await new Promise(r => setTimeout(() => r(), 10000));

    const tx1 = await router.addLiquidityETH(
        BUSD_ADDRESS,
        bep20Amount(631),
        bep20Amount(631),
        1,
        DEPLOYER_ADDRESS,
        (new Date()).setTime((new Date()).getTime()),
        { value: ethers.utils.parseEther("1") }
    );
    const result1 = await tx1.wait();
    let pairAddress1 = result1.events[1].topics[2];
    let pairAddress1Trim =pairAddress1.replace("000000000000000000000000","");
    console.log("Pair BUSD-WBNB created at address:",pairAddress1Trim);
    await masterChef.addPool(
        100,
        pairAddress1Trim,
        604800,
        345600,
        65,
        15,
        100,
        100
    );
    console.log("Pool BUSD-WBNB successfully created");

    await new Promise(r => setTimeout(() => r(), 10000));


    // POOL GLOBAL-WBNB
    await nativeToken.approve(ROUTER_ADDRESS,bep20Amount(10000));
    await new Promise(r => setTimeout(() => r(), 10000));

    const tx2 = await router.addLiquidityETH(
        GLOBAL_TOKEN_ADDRESS,
        bep20Amount(4100),
        bep20Amount(4100),
        1,
        DEPLOYER_ADDRESS,
        (new Date()).setTime((new Date()).getTime()),
        { value: ethers.utils.parseEther("1") }
    );
    const result2 = await tx2.wait();
    let pairAddress2 = result2.events[1].topics[2];
    let pairAddress2Trim =pairAddress2.replace("000000000000000000000000","");
    console.log("Pair GLOBAL-WBNB created at address:",pairAddress2Trim);
    await masterChef.addPool(
        400,
        "0x09f909a25d04d690dfb9b1a01ed2d129e8969ee8",
        259200,
        345600,
        65,
        15,
        100,
        100
    );
    console.log("Pool GLOBAL-WBNB successfully created");

    await new Promise(r => setTimeout(() => r(), 10000));


    // POOL GLOBAL-BUSD
    const tx3 = await router.addLiquidity(
        GLOBAL_TOKEN_ADDRESS,
        BUSD_ADDRESS,
        bep20Amount(4100),
        bep20Amount(630),
        bep20Amount(4100),
        bep20Amount(630),
        DEPLOYER_ADDRESS,
        (new Date()).setTime((new Date()).getTime())
    );

    const result3 = await tx3.wait();
    let pairAddress3 = result3.events[1].topics[2];
    let pairAddress3Trim =pairAddress3.replace("000000000000000000000000","");
    await new Promise(r => setTimeout(() => r(), 10000));
    console.log("Pair GLOBAL-BUSD created at address:",pairAddress3Trim);
    await masterChef.addPool(
        250,
        pairAddress3Trim,
        259200,
        345600,
        65,
        15,
        100,
        100
    );
    console.log("Pool GLOBAL-BUSD successfully created");

    await new Promise(r => setTimeout(() => r(), 10000));


    // POOL BTC-WBNB
    await bTCToken.approve(ROUTER_ADDRESS,bep20Amount(10000));
    await new Promise(r => setTimeout(() => r(), 10000));

    const tx4 = await router.addLiquidityETH(
        BTC_ADDRESS,
        BigNumber.from(944000).mul(BigNumber.from(10).pow(10)),
        BigNumber.from(944000).mul(BigNumber.from(10).pow(10)),
        1,
        DEPLOYER_ADDRESS,
        (new Date()).setTime((new Date()).getTime()),
        { value: ethers.utils.parseEther("1") }
    );

    const result4 = await tx4.wait();
    let pairAddress4 = result4.events[1].topics[2];
    let pairAddress4Trim =pairAddress4.replace("000000000000000000000000","");
    console.log("Pair BTC-WBNB created at address:",pairAddress4Trim);
    await new Promise(r => setTimeout(() => r(), 10000));
    await masterChef.addPool(
        25,
        pairAddress4Trim,
        604800,
        345600,
        65,
        15,
        100,
        100
    );
    console.log("Pool BTC-WBNB successfully created");

    await new Promise(r => setTimeout(() => r(), 10000));


    // POOL ETH-WBNB
    await eTHToken.approve(ROUTER_ADDRESS,bep20Amount(10000));
    await new Promise(r => setTimeout(() => r(), 10000));

    const tx5 = await router.addLiquidityETH(
        ETH_ADDRESS,
        BigNumber.from(13344100).mul(BigNumber.from(10).pow(10)),
        BigNumber.from(13344100).mul(BigNumber.from(10).pow(10)),
        1,
        DEPLOYER_ADDRESS,
        (new Date()).setTime((new Date()).getTime()),
        { value: ethers.utils.parseEther("1") }
    );

    const result5 = await tx5.wait();
    let pairAddress5 = result5.events[1].topics[2];
    let pairAddress5Trim =pairAddress5.replace("000000000000000000000000","");
    console.log("Pair ETH-WBNB created at address:",pairAddress5Trim);
    await new Promise(r => setTimeout(() => r(), 10000));
    await masterChef.addPool(
        25,
        pairAddress5Trim,
        604800,
        345600,
        65,
        15,
        100,
        100
    );
    console.log("Pool ETH-WBNB successfully created");

    await new Promise(r => setTimeout(() => r(), 10000));


    // POOL BUSD-USDT
    await uSDTToken.approve(ROUTER_ADDRESS,bep20Amount(10000));
    await bUSDToken.approve(ROUTER_ADDRESS,bep20Amount(10000));
    const tx6 = await router.addLiquidity(
        BUSD_ADDRESS,
        USDT_ADDRESS,
        bep20Amount(628),
        bep20Amount(628),
        bep20Amount(628),
        bep20Amount(628),
        DEPLOYER_ADDRESS,
        (new Date()).setTime((new Date()).getTime())
    );

    const result6 = await tx6.wait();
    let pairAddress6 = result6.events[1].topics[2];
    let pairAddress6Trim =pairAddress6.replace("000000000000000000000000","");
    console.log("Pair BUSD-USDT created at address:",pairAddress6Trim);
    await new Promise(r => setTimeout(() => r(), 10000));
    await masterChef.addPool(
        20,
        pairAddress6Trim,
        604800,
        345600,
        65,
        15,
        100,
        100
    );
    console.log("Pool BUSD-USDT successfully created");

    await new Promise(r => setTimeout(() => r(), 10000));


    // POOL ETH-BTC
    const tx7 = await router.addLiquidity(
        ETH_ADDRESS,
        BTC_ADDRESS,
        BigNumber.from(13344100).mul(BigNumber.from(10).pow(10)),
        BigNumber.from(941000).mul(BigNumber.from(10).pow(10)),
        BigNumber.from(13344100).mul(BigNumber.from(10).pow(10)),
        BigNumber.from(941000).mul(BigNumber.from(10).pow(10)),
        DEPLOYER_ADDRESS,
        (new Date()).setTime((new Date()).getTime())
    );

    const result7 = await tx7.wait();
    let pairAddress7 = result7.events[1].topics[2];
    let pairAddress7Trim =pairAddress7.replace("000000000000000000000000","");
    console.log("Pair ETH-BTC created at address:",pairAddress7Trim);
    await new Promise(r => setTimeout(() => r(), 10000));
    await masterChef.addPool(
        15,
        pairAddress7Trim,
        604800,
        345600,
        65,
        15,
        100,
        100
    );
    console.log("Pool ETH-BTC successfully created");

    await new Promise(r => setTimeout(() => r(), 10000));


    // POOL ADA-BNB
    await aDAToken.approve(ROUTER_ADDRESS,bep20Amount(10000));
    await new Promise(r => setTimeout(() => r(), 10000));

    const tx8 = await router.addLiquidityETH(
        ADA_ADDRESS,
        bep20Amount(281),
        bep20Amount(281),
        1,
        DEPLOYER_ADDRESS,
        (new Date()).setTime((new Date()).getTime()),
        { value: ethers.utils.parseEther("1") }
    );

    const result8 = await tx8.wait();
    let pairAddress8 = result8.events[1].topics[2];
    let pairAddress8Trim =pairAddress8.replace("000000000000000000000000","");
    console.log("Pair ADA-BNB created at address:",pairAddress8Trim);
    await new Promise(r => setTimeout(() => r(), 10000));
    await masterChef.addPool(
        10,
        pairAddress8Trim,
        604800,
        345600,
        65,
        15,
        100,
        100
    );
    console.log("Pool ADA-BNB successfully created");


    // POOL GLB-CAKE
    await new Promise(r => setTimeout(() => r(), 10000));
    await masterChef.addPool(
        150,
        "0x209ea503ac05008b698065e4acb17a8e75397832",
        259200,
        345600,
        65,
        15,
        100,
        100
    );
    console.log("Pool GLB-CAKE successfully created");


    // POOL SOL-BNB
    await new Promise(r => setTimeout(() => r(), 10000));
    await masterChef.addPool(
        10,
        "0x411fe95f21c6d064285450faab45aace8ac82b96",
        604800,
        345600,
        65,
        15,
        100,
        100
    );
    console.log("Pool SOL-BNB successfully created");


    // POOL DOT-BNB
    await new Promise(r => setTimeout(() => r(), 10000));
    await masterChef.addPool(
        10,
        "0x3abfe9cf0e1760ce81c915e9c283c7f5d2c5599b",
        604800,
        345600,
        65,
        15,
        100,
        100
    );
    console.log("Pool DOT-BNB successfully created");


    // POOL FTM-BNB
    await new Promise(r => setTimeout(() => r(), 10000));
    await masterChef.addPool(
        10,
        "0xda174576dab2ed6364464e0ed774c7a7c61e3e23",
        604800,
        345600,
        65,
        15,
        100,
        100
    );
    console.log("Pool FTM-BNB successfully created");

    await new Promise(r => setTimeout(() => r(), 10000));


    // POOL USDC-BUSD
    await new Promise(r => setTimeout(() => r(), 10000));
    await masterChef.addPool(
        10,
        "0x812b386cb8f221b9131ba0c226ca7db892ead868",
        604800,
        345600,
        65,
        15,
        100,
        100
    );
    console.log("Pool USDC-BUSD successfully created");

    await new Promise(r => setTimeout(() => r(), 10000));


    // POOL LINK-BNB
    await new Promise(r => setTimeout(() => r(), 10000));
    await masterChef.addPool(
        10,
        "0xf8dbcd3a08e240ddfda194d56029b584edb5f33f",
        604800,
        345600,
        65,
        15,
        100,
        100
    );
    console.log("Pool LINK-BNB successfully created");

    await new Promise(r => setTimeout(() => r(), 10000));


    // POOL RPS-BNB
    await new Promise(r => setTimeout(() => r(), 10000));
    await masterChef.addPool(
        50,
        "0x138b00dde31704f453461bc45e1eb6dd7db03c2b",
        259200,
        345600,
        65,
        15,
        100,
        100
    );
    console.log("Pool RPS-BNB successfully created");

    await new Promise(r => setTimeout(() => r(), 10000));


    //16 POOL XRP-BNB
    await new Promise(r => setTimeout(() => r(), 10000));
    await masterChef.addPool(
        20,
        "0x8de679d0111c28da0aac99f4fa81e6e03d85dfd6",
        604800,
        345600,
        65,
        15,
        100,
        100
    );
    console.log("Pool XRP-BNB successfully created");

    await new Promise(r => setTimeout(() => r(), 10000));


    //17 POOL DOGE-BNB
    await new Promise(r => setTimeout(() => r(), 10000));
    await masterChef.addPool(
        20,
        "0x3c0ee677e69fc0738b29b0a6efb35bc73753d368",
        604800,
        345600,
        65,
        15,
        100,
        100
    );
    console.log("Pool DOGE-BNB successfully created");

    await new Promise(r => setTimeout(() => r(), 10000));


    //18 POOL GLB-USDT
    await new Promise(r => setTimeout(() => r(), 10000));
    await masterChef.addPool(
        50,
        "0xf144f075f5dc8c06f0fa89b666bbdb4041920d79",
        259200,
        345600,
        65,
        15,
        100,
        100
    );
    console.log("Pool GLB-USDT successfully created");

    await new Promise(r => setTimeout(() => r(), 10000)); */


    //19 POOL RGOLD-BNB
    await masterChef.addPool(
        30,
        "0xc511081857311621cd308ad8fdfa5c2ff5dd7b27",
        604800,
        345600,
        65,
        15,
        100,
        100
    );
    console.log("Pool RGOLD-BNB successfully created");

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