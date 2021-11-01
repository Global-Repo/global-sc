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
    deployVaultLocked,
} = require("../../test/helpers/singleDeploys.js");
const { timestampNHours, bep20Amount } = require("../../test/helpers/utils.js");

let globalToken;
let factory;
let router;
let tokenAddresses;
let pathFinder;
let masterChefInternal;
let masterChef;
let smartChefFactory;
let mintNotifier;
let vaultLocked;

let wethAddress;
let busdAddress;
let cakeAddress;
let lpTokenAddress;

let CURRENT_BLOCK;
let masterChefStartBlock

// Addresses
let DEPLOYER_ADDRESS = null;
let TREASURY_ADDRESS = null;
let TREASURY_LP_ADDRESS = null; // To send MC LP fees
let DEV_ADDRESS = null;
let DEV_POWER_ADDRESS = null;

const TOKEN_DECIMALS = 18;
const BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER = BigNumber.from(10).pow(TOKEN_DECIMALS);
const NATIVE_TOKEN_PER_BLOCK = BigNumber.from(125).mul(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER);
const VAULT_LOCKED_MIN_BNB_TO_DISTRIBUTE = bep20Amount(1); // 1 BNB
const VAULT_LOCKED_MIN_GLOBAL_TO_DISTRIBUTE = bep20Amount(5000); // 5000 GLB
const VAULT_LOCKED_DISTRIBUTE_GLOBAL_INTERVAL = timestampNHours(12); // 12h, Hours to distribute Globals from last distribution event.

async function main() {
    [owner, ...addrs] = await hre.ethers.getSigners();

    CURRENT_BLOCK = await ethers.provider.getBlockNumber();
    console.log("Current block is:", CURRENT_BLOCK);

    // Setup

    DEPLOYER_ADDRESS = owner.address;

    DEV_ADDRESS = owner.address;


    TREASURY_ADDRESS = "0xfB0737Bb80DDd992f2A00A4C3bd88b1c63F86a63";
    TREASURY_LP_ADDRESS = "0xfB0737Bb80DDd992f2A00A4C3bd88b1c63F86a63";

    wethAddress = "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c";
    busdAddress = "0xe9e7cea3dedca5984780bafc599bd69add087d56";
    cakeAddress = "0x0e09fabb73bd3ade0a17ecc321fd13a19e81ce82";
    lpTokenAddress = "0x0eD7e52944161450477ee417DE9Cd3a859b14fD0";

    const feeSetterAddress = DEV_ADDRESS;
    masterChefStartBlock = CURRENT_BLOCK + 1;

    // Deploy
    globalToken = await deployGlobal();
    console.log("Global token deployed to:", globalToken.address);
    await globalToken.connect(owner).openTrading();
    console.log("Global token launched");
    await globalToken.connect(owner).mint(BigNumber.from(1000000).mul(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER));
    console.log("Minted 1000000 globals to owner:", owner.address);

    //
    factory = await deployFactory(feeSetterAddress);
    console.log("Factory deployed to:", factory.address);

    await factory.setFeeTo(TREASURY_ADDRESS);
    console.log("FeeTo from factory set to treasury:", TREASURY_ADDRESS);

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
    await tokenAddresses.addToken(tokenAddresses.CAKE_WBNB_LP(), lpTokenAddress);
    console.log("Added CAKE-WBNB-LP to TokenAddresses with address:", lpTokenAddress);

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

    await masterChef.setTreasury(TREASURY_LP_ADDRESS);
    console.log("Start block", CURRENT_BLOCK + 1);

    smartChefFactory = await deploySmartChefFactory();
    console.log("SmartChefFactory deployed to:", smartChefFactory.address);

    await masterChefInternal.transferOwnership(masterChef.address);
    console.log("Masterchef internal ownership to masterchef:", masterChef.address);
    await pathFinder.transferOwnership(masterChefInternal.address);
    console.log("Path finder ownership to masterchef internal:", masterChefInternal.address);
    await masterChef.transferDevPower(DEV_POWER_ADDRESS);
    console.log("Masterchef dev power set to:", masterChefInternal.address);
    await masterChef.setLockedVaultAddress(vaultLocked.address);
    console.log("Masterchef set locked vault address to :", vaultLocked.address);

    //
    //await globalToken.transferOwnership(masterChef.address);
    //console.log("Global ownership to masterchef:", masterChef.address);

    vaultLocked = await deployVaultLocked(
        globalToken.address,
        wethAddress,
        masterChef.address,
        VAULT_LOCKED_DISTRIBUTE_GLOBAL_INTERVAL
    );
    console.log("VaultLocked deployed to :", vaultLocked.address);

    await setUpVaultLocked(owner);
    await setUpPools(owner);

    console.log("Current block is:", CURRENT_BLOCK);
}

let setUpVaultLocked = async function (owner) {
    console.log("-- Vault locked set up start");

    await vaultLocked.connect(owner).setMinTokenAmountToDistribute(VAULT_LOCKED_MIN_BNB_TO_DISTRIBUTE);
    console.log("Min BNB to distribute set to:", VAULT_LOCKED_MIN_BNB_TO_DISTRIBUTE.toString());

    await vaultLocked.connect(owner).setMinGlobalAmountToDistribute(VAULT_LOCKED_MIN_GLOBAL_TO_DISTRIBUTE);
    console.log("Min Global to distribute set to:", VAULT_LOCKED_MIN_GLOBAL_TO_DISTRIBUTE.toString());

    await vaultLocked.connect(owner).setRewardInterval(VAULT_LOCKED_DISTRIBUTE_GLOBAL_INTERVAL);
    console.log("Reward interval set to:", VAULT_LOCKED_DISTRIBUTE_GLOBAL_INTERVAL.toString());

    console.log("-- Vault locked set up done");
}

let setUpPools = async function (owner) {
    console.log("-- Pools set up start");

    //
    smartChefFactory.deployPool(
        globalToken.address,
        wethAddress.address,
        BigNumber.from(10).mul(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER),
        CURRENT_BLOCK,
        CURRENT_BLOCK + 28800 * 30,
        BigNumber.from(300).mul(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER),
        DEV_ADDRESS
    );
    console.log("SmartChef created for GLB - BNB on:", smartChefFactory.address);

    smartChefFactory.deployPool(
        globalToken.address,
        busdAddress.address,
        BigNumber.from(10).mul(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER),
        CURRENT_BLOCK,
        CURRENT_BLOCK + 28800 * 30,
        BigNumber.from(300).mul(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER),
        DEV_ADDRESS
    );
    console.log("SmartChef created for GLB - BUSD on:", smartChefFactory.address);

    smartChefFactory.deployPool(
        globalToken.address,
        cakeAddress.address,
        BigNumber.from(10).mul(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER),
        CURRENT_BLOCK,
        CURRENT_BLOCK + 28800 * 30,
        BigNumber.from(300).mul(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER),
        DEV_ADDRESS
    );
    console.log("SmartChef created for GLB - CAKE on:", smartChefFactory.address);

    console.log("-- Pools set up done");
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
