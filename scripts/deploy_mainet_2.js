const hre = require("hardhat");
const { BigNumber } = require("@ethersproject/bignumber");
require("@nomiclabs/hardhat-ethers");
const {ethers} = require("hardhat");
const {
    deployGlobal,
    deployFactory,
    deployRouter,
    deployTokenAddresses,
    deployPathFinder,
    deployMintNotifier,
    deploySmartChefFactory,
} = require("../test/helpers/singleDeploys.js");

let globalToken;
let factory;
let router;
let tokenAddresses;
let pathFinder;
let masterChefInternal;
let masterChef;
let smartChefFactory;
let mintNotifier;

const TOKEN_DECIMALS = 18;
const BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER = BigNumber.from(10).pow(TOKEN_DECIMALS);
const NATIVE_TOKEN_PER_BLOCK = BigNumber.from(40).mul(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER);

async function main() {
    [owner, ...addrs] = await hre.ethers.getSigners();

    const CURRENT_BLOCK = await ethers.provider.getBlockNumber();
    console.log("Current block is:", CURRENT_BLOCK);

    // Setup
    const wethAddress = "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c";
    const busdAddress = "0xe9e7cea3dedca5984780bafc599bd69add087d56";
    const cakeAddress = "0x0e09fabb73bd3ade0a17ecc321fd13a19e81ce82";

    const feeSetterAddress = owner.address;
    const masterChefStartBlock = CURRENT_BLOCK + 1;

    // Deploy
    // TODO native token only for mainet testing purposes
    globalToken = await deployGlobal();
    console.log("Global token deployed to:", globalToken.address);
    await globalToken.connect(owner).openTrading();
    console.log("Global token launched");
    await globalToken.connect(owner).mint(BigNumber.from(1000000).mul(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER));
    console.log("Minted 1000000 globals to owner:", owner.address);

    factory = await deployFactory(feeSetterAddress);
    console.log("Factory deployed to:", factory.address);

    router = await deployRouter(factory.address, wethAddress);
    console.log("Router deployed to:", router.address);

    tokenAddresses = await deployTokenAddresses();
    console.log("TokenAddresses deployed to:", tokenAddresses.address);

    await tokenAddresses.addToken(tokenAddresses.GLOBAL(), globalToken.address);
    console.log("Added Global to TokenAddresses with address:", globalToken.address);
    await tokenAddresses.addToken(tokenAddresses.BNB(), wethAddress);
    console.log("Added BNB to TokenAddresses with address:", wethAddress);
    await tokenAddresses.addToken(tokenAddresses.WBNB(), wethAddress);
    console.log("Added WBNB to TokenAddresses with address:", wethAddress);
    await tokenAddresses.addToken(tokenAddresses.BUSD(), busdAddress);
    console.log("Added BUSD to TokenAddresses with address:", busdAddress);
    await tokenAddresses.addToken(tokenAddresses.CAKE(), cakeAddress);
    console.log("Added CAKE to TokenAddresses with address:", cakeAddress);
    // TODO: add cakebnblp when vaults
    //await tokenAddresses.addToken(tokenAddresses.CAKE_WBNB_LP(), cakeWbnbLPAddress);
    //console.log("Added CAKE-WBNB-LP to TokenAddresses with address:", cakeWbnbLPAddress);

    pathFinder = await deployPathFinder(tokenAddresses.address);
    console.log("PathFinder deployed to:", pathFinder.address);

    const MasterChefInternal = await ethers.getContractFactory("MasterChefInternal");
    masterChefInternal = await MasterChefInternal.deploy(tokenAddresses.address, pathFinder.address);
    await masterChefInternal.deployed();
    console.log("Masterchef Internal deployed to:", masterChefInternal.address);

    const MasterChef = await ethers.getContractFactory("MasterChef");
    masterChef = await MasterChef.deploy(
        masterChefInternal.address,
        globalToken.address,
        NATIVE_TOKEN_PER_BLOCK,
        masterChefStartBlock,
        router.address,
        tokenAddresses.address,
        pathFinder.address
    );
    await masterChef.deployed();

    console.log("Masterchef deployed to:", masterChef.address);
    console.log("Globals per block: ", NATIVE_TOKEN_PER_BLOCK.toString());
    console.log("Start block", CURRENT_BLOCK + 1);

    smartChefFactory = await deploySmartChefFactory();
    console.log("SmartChefFactory deployed to:", smartChefFactory.address);

    await masterChefInternal.transferOwnership(masterChef.address);
    console.log("Masterchef internal ownership to masterchef:", masterChef.address);
    await pathFinder.transferOwnership(masterChefInternal.address);
    console.log("Path finder ownership to masterchef internal:", masterChefInternal.address);

    // TODO: this must not be executed on mainet until we are done with global stuff
    //await globalToken.transferOwnership(masterChef.address);
    //console.log("Global ownership to masterchef:", masterChef.address);

    mintNotifier = await deployMintNotifier();
    console.log("Deployed mint notifier: ", mintNotifier.address);
    await masterChef.setMintNotifier(mintNotifier.address);

    console.log("Current block is:", CURRENT_BLOCK);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
