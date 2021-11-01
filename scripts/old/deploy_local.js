const hre = require("hardhat");
const {
    deployGlobal,
    deployFactory,
    deployRouter,
    deployTokenAddresses,
    deployPathFinder,
    deployMintNotifier,
    deployMasterChef,
    deploySmartChefFactory,
    deployVaultDistribution,
    deployVaultCake,
    deployVaultVested,
    deployVaultLocked,
    deployVaultStaked,
    deployVaultStakedToGlobal,
} = require("../test/helpers/singleDeploys.js");
const { timestampNHours, timestampNDays, bep20Amount } = require("../test/helpers/utils.js");

const { BigNumber } = require("@ethersproject/bignumber");
require("@nomiclabs/hardhat-ethers");
const {ethers} = require("hardhat");

const TOKEN_DECIMALS = 18;
const BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER = BigNumber.from(10).pow(TOKEN_DECIMALS);

//MAINNET
//BUSD 0xe9e7cea3dedca5984780bafc599bd69add087d56
//WBNB 0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c

//TESTNET
//WETH 0x094616f0bdfb0b526bd735bf66eca0ad254ca81f


// Existent addresses
const bnbAddress = null;
const usdtAddress = null;
let busdAddress = null;
let wethAddress = "0x094616f0bdfb0b526bd735bf66eca0ad254ca81f"; // existent WBNB
let cakeAddress = null;
const cakeWbnbLPAddress = null;
const bunnyAddress = null;
let cakeMasterChefAddress = null;

// Setup
let feeSetterAddress = null;
let masterChefStartBlock = null;
let vaultBunnyPoolId = null; // Bunny pool id where bunny stakes tokens
const CAKE_ROUTER_ADDRESS = null;
const NATIVE_TOKEN_PER_BLOCK = BigNumber.from(40).mul(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER);
const DEV_ADDRESS = "0xae1671Faa94A7Cc296D3cb0c3619e35600de384C";
const OPERATIONS_ADDRESS = "0xae1671Faa94A7Cc296D3cb0c3619e35600de384C";
const VAULT_DISTRIBUTION_MIN_BNB_TO_DISTRIBUTE = bep20Amount(1); // 1 BNB
const VAULT_DISTRIBUTION_DISTRIBUTE_PERCENTAGE = 10000; // 100%
const VAULT_DISTRIBUTION_DISTRIBUTE_INTERVAL = timestampNHours(12); // 12h
const VAULT_VESTED_MIN_BNB_TO_DISTRIBUTE = bep20Amount(1); // 1 BNB
const VAULT_VESTED_PENALTY_FEES_INTERVAL = timestampNDays(99); // 99 days
const VAULT_VESTED_PENALTY_FEES_FEE_PERCENTAGE = 100; // 1%
const VAULT_LOCKED_MIN_BNB_TO_DISTRIBUTE = bep20Amount(1); // 1 BNB
const VAULT_LOCKED_MIN_GLOBAL_TO_DISTRIBUTE = bep20Amount(1); // 1 BNB
const VAULT_LOCKED_DISTRIBUTE_GLOBAL_INTERVAL = timestampNHours(12); // 12h, Hours to distribute Globals from last distribution event.

// Deployed contracts
let globalToken;
let factory;
let router;
let tokenAddresses;
let pathFinder;
let mintNotifier;
let masterChef;
let smartChefFactory;
let vaultDistribution;
let vaultVested;
let vaultLocked;
let vaultStaked;
let vaultStakedToGlobal;
let vaultCake;
let vaultCakeWbnbLP;
let vaultBunny;

let setUpVaultDistribution = async function (owner) {
    console.log("-- Vault distribution set up start");

    // Vault distribution depositories
    await vaultDistribution.connect(owner).setDepositary(vaultCake.address, true);
    console.log("Vault CAKE added as depositary");
    //await vaultDistribution.connect(owner).setDepositary(vaultBunny.address, true);
    //console.log("Vault BUNNY added as depositary");
    //await vaultDistribution.connect(owner).setDepositary(vaultCakeWbnbLP.address, true);
    //console.log("Vault CAKE-WBNB-LP added as depositary");

    // Vault distribution as rewarder
    await vaultVested.connect(owner).setRewarder(vaultDistribution.address, true);
    console.log("Vault distribution added as vault vested rewarder");
    await vaultLocked.connect(owner).setRewarder(vaultDistribution.address, true);
    console.log("Vault distribution added as vault loked rewarder");
    await vaultStaked.connect(owner).setRewarder(vaultDistribution.address, true);
    console.log("Vault distribution added as vault staked rewarder");
    await vaultStakedToGlobal.connect(owner).setRewarder(vaultDistribution.address, true);
    console.log("Vault distribution added as vault staked to global rewarder");

    // Vault distribution beneficiaries
    await vaultDistribution.connect(owner).addBeneficiary(vaultVested.address);
    console.log("Vault vested added as beneficiary");
    await vaultDistribution.connect(owner).addBeneficiary(vaultLocked.address);
    console.log("Vault locked added as beneficiary");
    await vaultDistribution.connect(owner).addBeneficiary(vaultStaked.address);
    console.log("Vault staked added as beneficiary");
    await vaultDistribution.connect(owner).addBeneficiary(vaultStakedToGlobal.address);
    console.log("Vault staked to global added as beneficiary");

    // Vault distribution config
    await vaultDistribution.connect(owner).setMinTokenAmountToDistribute(VAULT_DISTRIBUTION_MIN_BNB_TO_DISTRIBUTE);
    console.log("Min BNB to distribute set to: ", VAULT_DISTRIBUTION_MIN_BNB_TO_DISTRIBUTE.toString());
    await vaultDistribution.connect(owner).setDistributionPercentage(VAULT_DISTRIBUTION_DISTRIBUTE_PERCENTAGE);
    console.log("Distribute percentage set to: ", VAULT_DISTRIBUTION_DISTRIBUTE_PERCENTAGE.toString());
    await vaultDistribution.connect(owner).setDistributionInterval(VAULT_DISTRIBUTION_DISTRIBUTE_INTERVAL);
    console.log("Distribution interval set to: ", VAULT_DISTRIBUTION_DISTRIBUTE_INTERVAL.toString());

    console.log("-- Vault distribution set up done");
};

let setUpVaultVested = async function (owner) {
    console.log("-- Vault vested set up start");

    await vaultVested.connect(owner).setMinTokenAmountToDistribute(VAULT_VESTED_MIN_BNB_TO_DISTRIBUTE);
    console.log("Min BNB to distribute set to: ", VAULT_VESTED_MIN_BNB_TO_DISTRIBUTE.toString());

    await vaultVested.connect(owner).setPenaltyFees(VAULT_VESTED_PENALTY_FEES_FEE_PERCENTAGE, VAULT_VESTED_PENALTY_FEES_INTERVAL);
    console.log("Penalty fees fee percentage set to: ", VAULT_VESTED_PENALTY_FEES_FEE_PERCENTAGE.toString());
    console.log("Penalty fees interval set to: ", VAULT_VESTED_PENALTY_FEES_INTERVAL.toString());

    console.log("-- Vault vested set up done");
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

async function main() {
    [owner, ...addrs] = await hre.ethers.getSigners();

    const CURRENT_BLOCK = await ethers.provider.getBlockNumber();
    console.log("Current block is:", CURRENT_BLOCK);

    // Setup
    feeSetterAddress = owner.address;
    masterChefStartBlock = CURRENT_BLOCK + 1;
    vaultBunnyPoolId = 0; //

    //
    const Weth = await hre.ethers.getContractFactory("BEP20");
    const weth = await Weth.deploy("Wrapped BNB", "WBNB");
    await weth.deployed();
    wethAddress = weth.address;
    console.log("Weth token deployed to:", wethAddress);
    const Cake = await hre.ethers.getContractFactory("BEP20");
    const cake = await Cake.deploy("Cake", "CAKE");
    await cake.deployed();
    cakeAddress = cake.address;
    console.log("Cake token (for test) deployed to:", cakeAddress);
    const Busd = await hre.ethers.getContractFactory("BEP20");
    const busd = await Busd.deploy("Binance USD", "BUSD");
    await busd.deployed();
    busdAddress = busd.address;
    console.log("BUSD token (for test) deployed to:", busdAddress);

    // Deploys
    globalToken = await deployGlobal();
    console.log("Global token deployed to:", globalToken.address);

    factory = await deployFactory(feeSetterAddress);
    console.log("Factory deployed to:", factory.address);

    router = await deployRouter(factory.address, wethAddress);
    console.log("Router deployed to:", router.address);

    tokenAddresses = await deployTokenAddresses();
    console.log("TokenAddresses deployed to:", tokenAddresses.address);

    await tokenAddresses.addToken(tokenAddresses.GLOBAL(), globalToken.address);
    console.log("Added Global to TokenAddresses with address:", globalToken.address);
    await tokenAddresses.addToken(tokenAddresses.WBNB(), wethAddress);
    console.log("Added WBNB to TokenAddresses with address:", wethAddress);
    await tokenAddresses.addToken(tokenAddresses.BUSD(), busdAddress);
    console.log("Added BUSD to TokenAddresses with address:", busdAddress);
    await tokenAddresses.addToken(tokenAddresses.CAKE(), cakeAddress);
    console.log("Added CAKE to TokenAddresses with address:", cakeAddress);
    //await tokenAddresses.addToken(tokenAddresses.CAKE_WBNB_LP(), cakeWbnbLPAddress);
    //console.log("Added CAKE-WBNB-LP to TokenAddresses with address:", cakeWbnbLPAddress);
    //await tokenAddresses.addToken(tokenAddresses.BUNNY(), bunnyAddress);
    //console.log("Added BUNNY to TokenAddresses with address:", bunnyAddress);

    pathFinder = await deployPathFinder(tokenAddresses.address);
    console.log("PathFinder deployed to:", pathFinder.address);

    masterChef = await deployMasterChef(globalToken.address,router.address,tokenAddresses.address,pathFinder.address);
    console.log("Masterchef deployed to:", masterChef.address);
    console.log("Globals per block: ", NATIVE_TOKEN_PER_BLOCK.toString());
    console.log("Start block", CURRENT_BLOCK + 1);
    //
    cakeMasterChefAddress = masterChef.address;

    smartChefFactory = await deploySmartChefFactory();

    await pathFinder.transferOwnership(masterChef.address);
    await globalToken.transferOwnership(masterChef.address);
    mintNotifier = await deployMintNotifier();
    await masterChef.setMintNotifier(mintNotifier.address);

    vaultDistribution = await deployVaultDistribution(wethAddress, globalToken.address);
    console.log("Vault distribution deployed to:", vaultDistribution.address);

    vaultLocked = await deployVaultLocked(globalToken.address, wethAddress, masterChef.address, VAULT_LOCKED_DISTRIBUTE_GLOBAL_INTERVAL);
    console.log("Vault locked deployed to:", vaultLocked.address);

    vaultVested = await deployVaultVested(globalToken.address, wethAddress, masterChef.address, vaultLocked.address);
    console.log("Vault vested deployed to:", vaultVested.address);

    vaultStaked = await deployVaultStaked(globalToken.address, wethAddress, masterChef.address);
    console.log("Vault staked deployed to:", vaultStaked.address);

    vaultStakedToGlobal = await deployVaultStakedToGlobal(globalToken.address, wethAddress, masterChef.address, router.address);
    console.log("Vault staked to global deployed to:", vaultStakedToGlobal.address);

    vaultCake = await deployVaultCake(
        cakeAddress,
        globalToken.address,
        cakeMasterChefAddress,
        OPERATIONS_ADDRESS,
        tokenAddresses.address,
        router.address,
        pathFinder.address,
        vaultDistribution.address,
        vaultVested.address
    );
    console.log("Vault CAKE deployed to:", vaultCake.address);

    /*
    const VaultBunny = await hre.ethers.getContractFactory("VaultBunny");
    vaultBunny = await VaultBunny.deploy(
        bunnyAddress,
        globalToken.address,
        wethAddress,
        vaultBunnyPoolId,
        OPERATIONS_ADDRESS,
        tokenAddresses.address,
        router.address,
        pathFinder.address,
        //
    );
    await vaultBunny.deployed();
    console.log("Vault BUNNY deployed to:", vaultBunny.address);
    */

    /*
    const VaultCakeWbnbLP = await hre.ethers.getContractFactory("VaultCakeWBNBLP");
    vaultCakeWbnbLP = await VaultCakeWbnbLP.deploy(
        cakeWbnbLPAddress,
        globalToken.address,
        cakeMasterChefAddress,
        CAKE_ROUTER_ADDRESS,
        OPERATIONS_ADDRESS,
        tokenAddresses.address,
        router.address,
        pathFinder.address,
        //
    );
    await vaultCakeWbnbLP.deployed();
    console.log("Vault CAKE-WBNB-LP deployed to:", vaultCakeWbnbLP.address);
    */







    //
/*
    // Set ups
    await pathFinder.transferOwnership(masterChef.address);
    console.log("Masterchef is now the PathFinder's owner.");

    await globalToken.transferOwnership(masterChef.address);
    console.log("Masterchef is now the Global token's owner.");
*/
    await setUpVaultDistribution(owner);
    await setUpVaultVested(owner);
    await setUpVaultLocked(owner);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
