const hre = require("hardhat");
const { BigNumber } = require("@ethersproject/bignumber");
require("@nomiclabs/hardhat-ethers");
const {ethers} = require("hardhat");
const {
    deployVaultLocked,
    deployVaultDistribution,
    deployVaultVested,
    deployVaultStaked,
    deployVaultStakedToGlobal,
    deployVaultCake,
    deployVaultBunny,
} = require("../test/helpers/singleDeploys.js");
const { timestampNHours, timestampNDays, bep20Amount } = require("../test/helpers/utils.js");

let globalToken; //
let factory;
let router;
let routerPancake;
let tokenAddresses;
let pathFinder;
let masterChefInternal;
let masterChef;
let smartChefFactory;
let mintNotifier;
let vaultLocked;
let vaultDistribution;
let vaultVested15;
let vaultVested30;
let vaultVested50;
let vaultStaked;
let vaultStakedToGlobal;
let vaultCake15;
let vaultCake30;
let vaultCake50;
let vaultBunny30;
let cakeMasterChefAddress;

let wethAddress;
let busdAddress;
let cakeAddress;
let bunnyAddress;

let CURRENT_BLOCK;
let masterChefStartBlock
let bunnyPoolAddress

// Addresses
let DEPLOYER_ADDRESS = null;
let TREASURY_ADDRESS = null;
let TREASURY_LP_ADDRESS = null; // To send MC LP fees
let DEV_ADDRESS = null;
let DEV_POWER_ADDRESS = null;

const TOKEN_DECIMALS = 18;
const BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER = BigNumber.from(10).pow(TOKEN_DECIMALS);
const NATIVE_TOKEN_PER_BLOCK = BigNumber.from(125).mul(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER);
const VAULT_DISTRIBUTION_MIN_BNB_TO_DISTRIBUTE = bep20Amount(1); // 1 BNB
const VAULT_DISTRIBUTION_DISTRIBUTE_PERCENTAGE = 10000; // 100%
const VAULT_DISTRIBUTION_DISTRIBUTE_INTERVAL = timestampNHours(12); // 12h
const VAULT_VESTED_MIN_BNB_TO_DISTRIBUTE = bep20Amount(1); // 1 BNB
const VAULT_VESTED_PENALTY_FEES_INTERVAL = timestampNDays(99); // 99 days
const VAULT_VESTED_PENALTY_FEES_FEE_PERCENTAGE = 100; // 1%
const VAULT_LOCKED_MIN_BNB_TO_DISTRIBUTE = bep20Amount(1); // 1 BNB
const VAULT_LOCKED_MIN_GLOBAL_TO_DISTRIBUTE = bep20Amount(1); // 1 BNB
const VAULT_LOCKED_DISTRIBUTE_GLOBAL_INTERVAL = timestampNHours(12); // 12h, Hours to distribute Globals from last distribution event.


async function main() {
    [owner, ...addrs] = await hre.ethers.getSigners();

    CURRENT_BLOCK = await ethers.provider.getBlockNumber();
    console.log("Current block is:", CURRENT_BLOCK);

    // Setup
    //
    DEPLOYER_ADDRESS = owner.address;

    DEV_ADDRESS = owner.address;

    //
    TREASURY_ADDRESS = "0xfB0737Bb80DDd992f2A00A4C3bd88b1c63F86a63";
    TREASURY_LP_ADDRESS = "0xfB0737Bb80DDd992f2A00A4C3bd88b1c63F86a63";

    // Tokens
    globalToken = "0xC8d439D3B72280801d64eB371fe58Fede1a556ae";
    wethAddress = "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c";
    busdAddress = "0xe9e7cea3dedca5984780bafc599bd69add087d56";
    cakeAddress = "0x0e09fabb73bd3ade0a17ecc321fd13a19e81ce82";
    bunnyAddress = "0xc9849e6fdb743d08faee3e34dd2d1bc69ea11a51";

    // Dependencies already deployed
    router = "0x36a1847cdA738E3EAE6808d8AB92dC3dB5093e87";
    routerPancake = "0x10ed43c718714eb63d5aa57b78b54704e256024e";
    tokenAddresses = "0x39C4D6EfD66671e0Bc8027F5ef264888D010ecC1";
    pathFinder = "0x60f54FF377eaFdA0fA47eA3029afcaa259FefDD6";
    masterChef = "0xe0B197B14ff038a72cC7a41C436155A2a2F5c14C";
/*
    // Testnet addresses
    // Tokens
    globalToken = "0xe5eEb81e563aF8e92FBbeDD868500958f3D5f720";
    wethAddress = "0x094616f0bdfb0b526bd735bf66eca0ad254ca81f";
    busdAddress = "0xed24fc36d5ee211ea25a80239fb8c4cfd80f12ee";
    cakeAddress = "0xa0bb66f240a93849c24Fa43d5d8a791FC94eb21a";
    bunnyAddress = "0xc9849e6fdb743d08faee3e34dd2d1bc69ea11a51";

    // Dependencies already deployed
    router = "0x7eA058e2640f66D16c0ee7De1449edbfB6011214";
    tokenAddresses = "0x98fA7d9C31877e95B7896C04D8f9729803c3D69b";
    pathFinder = "0xFA58471aaE36f98536AF7a94EfD78e8b6fBF4234";
    masterChef = "0xD412d85B75410bE2d01C3503bE580274c27c3B69";
*/
    cakeMasterChefAddress = "0x73feaa1ee314f8c655e354234017be2193c9e24e";
    bunnyPoolAddress = "0xCADc8CB26c8C7cB46500E61171b5F27e9bd7889D";

    vaultDistribution = await deployVaultDistribution(wethAddress, globalToken);
    console.log("Vault distribution deployed to:", vaultDistribution.address);

    vaultLocked = await deployVaultLocked(
        globalToken,
        wethAddress,
        masterChef,
        VAULT_LOCKED_DISTRIBUTE_GLOBAL_INTERVAL
    );
    console.log("Vault locked deployed to:", vaultLocked.address);

    //vaultVested15 = await deployVaultVested(globalToken, wethAddress, masterChef, vaultLocked.address);
    //console.log("Vault vested 15 deployed to:", vaultVested15.address);

    vaultVested30 = await deployVaultVested(globalToken, wethAddress, masterChef, vaultLocked.address);
    console.log("Vault vested 30 deployed to:", vaultVested30.address);

    //vaultVested50 = await deployVaultVested(globalToken, wethAddress, masterChef, vaultLocked.address);
    //console.log("Vault vested 50 deployed to:", vaultVested50.address);

    vaultStaked = await deployVaultStaked(globalToken, wethAddress, masterChef);
    console.log("Vault staked deployed to:", vaultStaked.address);

    vaultStakedToGlobal = await deployVaultStakedToGlobal(globalToken, wethAddress, masterChef, router);
    console.log("Vault staked to global deployed to:", vaultStakedToGlobal.address);

    /*vaultCake15 = await deployVaultCake(
        cakeAddress,
        globalToken,
        cakeMasterChefAddress,
        TREASURY_ADDRESS,
        tokenAddresses,
        router,
        pathFinder,
        vaultDistribution.address,
        vaultVested15.address
    );
    console.log("Vault CAKE 15 deployed to:", vaultCake15.address);*/
    //

    vaultCake30 = await deployVaultCake(
        cakeAddress,
        globalToken,
        cakeMasterChefAddress,
        TREASURY_ADDRESS,
        tokenAddresses,
        router,
        pathFinder,
        vaultDistribution.address,
        vaultVested30.address
    );
    console.log("Vault CAKE 30 deployed to:", vaultCake30.address);

    /*vaultCake50 = await deployVaultCake(
        cakeAddress,
        globalToken,
        cakeMasterChefAddress,
        TREASURY_ADDRESS,
        tokenAddresses,
        router,
        pathFinder,
        vaultDistribution.address,
        vaultVested50.address
    );
    console.log("Vault CAKE 50 deployed to:", vaultCake50.address);*/

    /*vaultBunny30 = await deployVaultBunny(
        bunnyAddress,
        globalToken,
        wethAddress,
        bunnyPoolAddress,
        TREASURY_ADDRESS,
        tokenAddresses,
        router,
        pathFinder,
        vaultDistribution.address,
        vaultVested30.address,
        routerPancake
    );
    console.log("Vault bunny deployed to:", vaultBunny30.address);*/

    await setUpVaultDistribution(owner);
    //await setUpVaultVested15(owner);
    await setUpVaultVested30(owner);
    //await setUpVaultVested50(owner);
    //await setUpVaultCake15(owner);
    await setUpVaultCake30(owner);
    //await setUpVaultCake50(owner);


    await hre.run("verify:verify", {
        address: vaultDistribution.address,
        constructorArguments: [
            wethAddress,
            globalToken
        ],
    });
    await hre.run("verify:verify", {
        address: vaultLocked.address,
        constructorArguments: [
            globalToken,
            wethAddress,
            masterChef,
            VAULT_LOCKED_DISTRIBUTE_GLOBAL_INTERVAL
        ],
    });
    await hre.run("verify:verify", {
        address: vaultVested30.address,
        constructorArguments: [
            globalToken, wethAddress, masterChef, vaultLocked.address
        ],
    });
    await hre.run("verify:verify", {
        address: vaultStaked.address,
        constructorArguments: [
            globalToken, wethAddress, masterChef
        ],
    });
    await hre.run("verify:verify", {
        address: vaultStakedToGlobal.address,
        constructorArguments: [
            globalToken, wethAddress, masterChef, router
        ],
    });
    await hre.run("verify:verify", {
        address: vaultCake30.address,
        constructorArguments: [
            cakeAddress,
            globalToken,
            cakeMasterChefAddress,
            TREASURY_ADDRESS,
            tokenAddresses,
            router,
            pathFinder,
            vaultDistribution.address,
            vaultVested30.address
        ],
    });

    console.log("Current block is:", CURRENT_BLOCK);
}

let setUpVaultDistribution = async function (owner) {
    console.log("-- Vault distribution set up start");

    //

    // Vault distribution depositories
    //await vaultDistribution.connect(owner).setDepositary(vaultCake15.address, true);
    await vaultDistribution.connect(owner).setDepositary(vaultCake30.address, true);
    //await vaultDistribution.connect(owner).setDepositary(vaultCake50.address, true);
    console.log("Vaults CAKE 15,30,50 added as depositary");

    //await vaultDistribution.connect(owner).setDepositary(vaultBunny15.address, true);
    //await vaultDistribution.connect(owner).setDepositary(vaultBunny30.address, true);
    //await vaultDistribution.connect(owner).setDepositary(vaultBunny50.address, true);
    //console.log("Vaults BUNNY 15,30,50 added as depositary");

    // Vault distribution as rewarder
    //await vaultVested15.connect(owner).setRewarder(vaultDistribution.address, true);
    //console.log("Vault distribution added as vault vested 15 rewarder");
    await vaultVested30.connect(owner).setRewarder(vaultDistribution.address, true);
    console.log("Vault distribution added as vault vested 30 rewarder");
    //await vaultVested50.connect(owner).setRewarder(vaultDistribution.address, true);
    //console.log("Vault distribution added as vault vested 50 rewarder");
    await vaultLocked.connect(owner).setRewarder(vaultDistribution.address, true);
    console.log("Vault distribution added as vault loked rewarder");
    await vaultStaked.connect(owner).setRewarder(vaultDistribution.address, true);
    console.log("Vault distribution added as vault staked rewarder");
    await vaultStakedToGlobal.connect(owner).setRewarder(vaultDistribution.address, true);
    console.log("Vault distribution added as vault staked to global rewarder");

    // Vault distribution beneficiaries
    //await vaultDistribution.connect(owner).addBeneficiary(vaultVested15.address);
    //console.log("Vault vested 15 added as beneficiary");
    await vaultDistribution.connect(owner).addBeneficiary(vaultVested30.address);
    console.log("Vault vested 30 added as beneficiary");
    //await vaultDistribution.connect(owner).addBeneficiary(vaultVested50.address);
    //console.log("Vault vested 50 added as beneficiary");
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

let setUpVaultVested15 = async function (owner) {
    console.log("-- Vault vested 15 set up start");

    await vaultVested15.connect(owner).setMinTokenAmountToDistribute(VAULT_VESTED_MIN_BNB_TO_DISTRIBUTE);
    console.log("Min BNB to distribute set to: ", VAULT_VESTED_MIN_BNB_TO_DISTRIBUTE.toString());

    await vaultVested15.connect(owner).setPenaltyFees(6500, VAULT_VESTED_PENALTY_FEES_INTERVAL);
    console.log("Penalty fees fee percentage set to: ", VAULT_VESTED_PENALTY_FEES_FEE_PERCENTAGE.toString());
    console.log("Penalty fees interval set to: 65%");

    console.log("-- Vault vested set up done");
}

let setUpVaultVested30 = async function (owner) {
    console.log("-- Vault vested 30 set up start");

    //
    // Beneficiaries
    await vaultVested30.connect(owner).setDepositary(vaultCake30.address, true);
    console.log("Vaults CAKE 15,30,50 added as depositary");

    //
    const AttachedMasterchef = await ethers.getContractFactory("MasterChef");
    const attachedMasterchef = await AttachedMasterchef.attach(masterChef);
    await attachedMasterchef.connect(owner).addAddressToWhitelist(vaultCake30.address, true);
    console.log("Vaults vested 15,30,50 added in MasterChef whitelist");

    await vaultVested30.connect(owner).setMinTokenAmountToDistribute(VAULT_VESTED_MIN_BNB_TO_DISTRIBUTE);
    console.log("Min BNB to distribute set to: ", VAULT_VESTED_MIN_BNB_TO_DISTRIBUTE.toString());

    await vaultVested30.connect(owner).setPenaltyFees(7500, VAULT_VESTED_PENALTY_FEES_INTERVAL);
    console.log("Penalty fees fee percentage set to: ", VAULT_VESTED_PENALTY_FEES_FEE_PERCENTAGE.toString());
    console.log("Penalty fees interval set to: 75%");

    console.log("-- Vault vested 30 set up done");
}

let setUpVaultVested50 = async function (owner) {
    console.log("-- Vault vested 50 set up start");

    await vaultVested50.connect(owner).setMinTokenAmountToDistribute(VAULT_VESTED_MIN_BNB_TO_DISTRIBUTE);
    console.log("Min BNB to distribute set to: ", VAULT_VESTED_MIN_BNB_TO_DISTRIBUTE.toString());

    await vaultVested50.connect(owner).setPenaltyFees(8300, VAULT_VESTED_PENALTY_FEES_INTERVAL);
    console.log("Penalty fees fee percentage set to: ", VAULT_VESTED_PENALTY_FEES_FEE_PERCENTAGE.toString());
    console.log("Penalty fees interval set to: 83%");

    console.log("-- Vault vested 50 set up done");
}

let setUpVaultCake15 = async function (owner) {
    console.log("-- Vault cake set up start");

    await vaultCake15.connect(owner).setRewards(8500, 100, 600, 800, 2500);
    console.log("Rewards set to: toUser:8500, toOperations:100, toBuyGlobal:600, toBuyBNB:800, toMintGlobal:2500");

    console.log("-- Vault cake set up done");
}

let setUpVaultCake30 = async function (owner) {
    console.log("-- Vault cake set up start");

    await vaultCake30.connect(owner).setRewards(7000, 300, 1000, 1700, 5000);
    console.log("Rewards set to: toUser:7000, toOperations:300, toBuyGlobal:1000, toBuyBNB:1700, toMintGlobal:5000");

    console.log("-- Vault cake set up done");
}

let setUpVaultCake50 = async function (owner) {
    console.log("-- Vault cake set up start");

    await vaultCake50.connect(owner).setRewards(5000, 500, 1500, 3000, 7500);
    console.log("Rewards set to: toUser:5000, toOperations:500, toBuyGlobal:1500, toBuyBNB:3000, toMintGlobal:7500");

    console.log("-- Vault cake set up done");
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
