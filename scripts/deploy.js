const hre = require("hardhat");
const {
    deployGlobal,
    deployFactory,
    deployRouter,
    deployTokenAddresses,
    deployPathFinder,
    deployMintNotifier,
    deployMasterChef,
    deployVaultDistribution,
    deployVaultCake,
    deployVaultVested,
    deployVaultLocked,
    deployVaultStaked,
    deployVaultStakedToGlobal,
} = require("../test/helpers/singleDeploys.js");
const { timestampNHours, bep20Amount } = require("../test/helpers/utils.js");

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
const busdAddress = null;
const wethAddress = null; // TODO: es un bep 20 nostre o existent?
const cakeAddress = null;
const cakeBnbLPAddress = null;
const bunnyAddress = null;
const cakeMasterChefAddress = null;

// Setup
let feeSetterAddress = null;
let masterChefStartBlock = null;
let vaultLockedRewardInterval = null; // Hours to distribute Globals from last distribution event.
let vaultBunnyPoolId = null; // Bunny pool id where bunny stakes tokens
const CAKE_ROUTER_ADDRESS = null;
const NATIVE_TOKEN_PER_BLOCK = BigNumber.from(40).mul(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER);
const DEV_ADDRESS = "0xae1671Faa94A7Cc296D3cb0c3619e35600de384C";
const OPERATIONS_ADDRESS = "0xae1671Faa94A7Cc296D3cb0c3619e35600de384C";

// Deployed contracts
let globalToken;
let factory;
let router;
let tokenAddresses;
let pathFinder;
let mintNotifier;
let masterChef;
let vaultDistribution;
let vaultVested;
let vaultLocked;
let vaultStaked;
let vaultStakedToGlobal;
let vaultCake;
let vaultCakeBnbLP;
let vaultBunny;

let setUpDistributionVault = async function (owner) {
    console.log("Vault distribution set up start");

    // Vault distributor depositories
    await vaultDistribution.connect(owner).setDepositary(vaultCake.address, true);
    console.log("Vault CAKE added as depositary");
    //await vaultDistribution.connect(owner).setDepositary(vaultBunny.address, true);
    //console.log("Vault BUNNY added as depositary");
    //await vaultDistribution.connect(owner).setDepositary(vaultCakeBnbLP.address, true);
    //console.log("Vault CAKE-BNB-LP added as depositary");

    // Vault distributor beneficiaries
    await vaultDistribution.connect(owner).addBeneficiary(vaultVested.address);
    console.log("Vault vested added as beneficiary");
    await vaultDistribution.connect(owner).addBeneficiary(vaultLocked.address);
    console.log("Vault locked added as beneficiary");
    await vaultDistribution.connect(owner).addBeneficiary(vaultStaked.address);
    console.log("Vault staked added as beneficiary");
    await vaultDistribution.connect(owner).addBeneficiary(vaultStakedToGlobal.address);
    console.log("Vault staked to global added as beneficiary");

    // TODO: approve del token BNB dels depositories al vault distribution
    const bnbContract = await ethers.getContractFactory("BEP20"); // TODO: bnb or weth? bnb is not bep20
    const bnb = await bnbContract.attach(bnbAddress);
    const APPROVE_AMOUNT = bep20Amount(1000000000000);

    await bnb.connect(vaultCake.address).approve(vaultDistribution.address, APPROVE_AMOUNT);
    console.log("Allowed vault cake transfer from vault distribution for amount of: ", APPROVE_AMOUNT.toString());
    //await bnb.connect(vaultBunny.address).approve(vaultDistribution.address, APPROVE_AMOUNT);
    //console.log("Allowed vault BUNNY transfer from vault distribution for amount of: ", APPROVE_AMOUNT.toString());
    //await bnb.connect(vaultCakeBnbLP.address).approve(vaultDistribution.address, APPROVE_AMOUNT);
    //console.log("Allowed vault CAKE-BNB-LP transfer from vault distribution for amount of: ", APPROVE_AMOUNT.toString());

    console.log("Vault distribution set up done");
};

async function main() {
    // 1) Deploy contracts
    // 2) Set up contracts
    // 3) Pools. mints (paralel a certic)

    [owner, addr1, addr2, ...addrs] = await hre.ethers.getSigners();

    const CURRENT_BLOCK = await ethers.provider.getBlockNumber();
    console.log("Current block is:", CURRENT_BLOCK);

    // Setup
    feeSetterAddress = owner.address;
    masterChefStartBlock = CURRENT_BLOCK + 1;
    vaultLockedRewardInterval = timestampNHours(12);
    vaultBunnyPoolId = 0; // TODO: buscar

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
    await tokenAddresses.addToken(tokenAddresses.BNB(), bnbAddress);
    console.log("Added BNB to TokenAddresses with address:", bnbAddress);
    await tokenAddresses.addToken(tokenAddresses.BUSD(), busdAddress);
    console.log("Added BUSD to TokenAddresses with address:", busdAddress);
    await tokenAddresses.addToken(tokenAddresses.CAKE(), cakeAddress);
    console.log("Added CAKE to TokenAddresses with address:", cakeAddress);
    await tokenAddresses.addToken(tokenAddresses.CAKE_BNB_LP(), cakeBnbLPAddress);
    console.log("Added CAKE-BNB-LP to TokenAddresses with address:", cakeBnbLPAddress);
    await tokenAddresses.addToken(tokenAddresses.BUNNY(), bunnyAddress);
    console.log("Added BUNNY to TokenAddresses with address:", bunnyAddress);

    pathFinder = await deployPathFinder(tokenAddresses.address);
    console.log("PathFinder deployed to:", pathFinder.address);

    masterChef = await deployMasterChef(globalToken.address,router.address,tokenAddresses.address,pathFinder.address);
    console.log("Masterchef deployed to:", masterChef.address);
    console.log("Globals per block: ", NATIVE_TOKEN_PER_BLOCK);
    console.log("Start block", CURRENT_BLOCK + 1);

    await pathFinder.transferOwnership(masterChef.address);
    await globalToken.transferOwnership(masterChef.address);
    mintNotifier = await deployMintNotifier();
    await masterChef.setMintNotifier(mintNotifier.address);

    vaultDistribution = await deployVaultDistribution(bnbAddress, globalToken.address);
    console.log("Vault distribution deployed to:", vaultDistribution.address);

    vaultLocked = await deployVaultLocked(globalToken.address, bnbAddress, masterChef.address, vaultLockedRewardInterval);
    console.log("Vault locked deployed to:", vaultLocked.address);

    vaultVested = await deployVaultVested(globalToken.address, bnbAddress, masterChef.address, vaultLocked.address);
    console.log("Vault vested deployed to:", vaultVested.address);

    vaultStaked = await deployVaultStaked(globalToken.address, bnbAddress, masterChef.address);
    console.log("Vault staked deployed to:", vaultStaked.address);

    vaultStakedToGlobal = await deployVaultStakedToGlobal(globalToken.address, bnbAddress, masterChef.address, router.address);
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
        // TODO: keeper per vested i distributor vaults
    );
    await vaultBunny.deployed();
    console.log("Vault BUNNY deployed to:", vaultBunny.address);
    */

    /*
    const VaultCakeBnbLP = await hre.ethers.getContractFactory("VaultCakeBNBLP");
    vaultCakeBnbLP = await VaultCakeBnbLP.deploy(
        cakeBnbLPAddress,
        globalToken.address,
        cakeMasterChefAddress,
        CAKE_ROUTER_ADDRESS,
        OPERATIONS_ADDRESS,
        tokenAddresses.address,
        router.address,
        pathFinder.address,
        // TODO: keeper per vested i distributor vaults
    );
    await vaultCakeBnbLP.deployed();
    console.log("Vault CAKE-BNB-LP deployed to:", vaultCakeBnbLP.address);
    */







    // TODO: mint x tokens and change token owner by masterchef address

    // Set ups
    await pathFinder.transferOwnership(masterChef.address);
    console.log("Masterchef is now the PathFinder's owner.");

    await globalToken.transferOwnership(masterChef.address);
    console.log("Masterchef is now the Global token's owner.");

    await setUpDistributionVault();
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
