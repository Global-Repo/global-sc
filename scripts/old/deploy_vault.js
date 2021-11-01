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
    deployVaultCakeWBNBLP,
    deployVaultBunny,
} = require("../test/helpers/singleDeploys.js");
const { timestampNHours, timestampNDays, bep20Amount } = require("../test/helpers/utils.js");

let globalTokenAddress;
let factory;
let routerAddress;
let routerPancakeAddress;
let tokenAddressesAddress;
let pathFinderAddress;
let masterChefInternal;
let masterChefAddress;
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
let vaultCakeWBNBLP30;
let cakeMasterChefAddress;
let cakeRouterAddress;
let tokenAddresses;
let masterChef;

let wethAddress;
let busdAddress;
let cakeAddress;
let bunnyAddress;
let lpTokenAddress;

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
    globalTokenAddress = "0xC8d439D3B72280801d64eB371fe58Fede1a556ae";
    wethAddress = "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c";
    busdAddress = "0xe9e7cea3dedca5984780bafc599bd69add087d56";
    cakeAddress = "0x0e09fabb73bd3ade0a17ecc321fd13a19e81ce82";
    bunnyAddress = "0xc9849e6fdb743d08faee3e34dd2d1bc69ea11a51";
    lpTokenAddress = "0x0eD7e52944161450477ee417DE9Cd3a859b14fD0";

    // Dependencies already deployed
    routerAddress = "0x36a1847cdA738E3EAE6808d8AB92dC3dB5093e87";
    routerPancakeAddress = "0x10ed43c718714eb63d5aa57b78b54704e256024e";
    tokenAddressesAddress = "0x39C4D6EfD66671e0Bc8027F5ef264888D010ecC1";
    pathFinderAddress = "0x60f54FF377eaFdA0fA47eA3029afcaa259FefDD6";
    masterChefAddress = "0xe0B197B14ff038a72cC7a41C436155A2a2F5c14C";

    // Others
    cakeMasterChefAddress = "0x73feaa1ee314f8c655e354234017be2193c9e24e";
    bunnyPoolAddress = "0xCADc8CB26c8C7cB46500E61171b5F27e9bd7889D";
    cakeRouterAddress = "0x10ed43c718714eb63d5aa57b78b54704e256024e";

    // Vaults already deployed
    const vaultDistributionAddress = "0xD9e3435236b350C5910b03411d6939d065e4E15A";
    const vaultVested30Address = "0xE3D612452b8df0dA0088765E2096651c92E0E401";

    // Attach
    const TokenAddresses = await ethers.getContractFactory("TokenAddresses");
    tokenAddresses = await TokenAddresses.attach(tokenAddressesAddress);
    await tokenAddresses.addToken(tokenAddresses.CAKE_WBNB_LP(), lpTokenAddress);
    console.log("Added CAKE-WBNB-LP to TokenAddresses with address:", lpTokenAddress);

    const MasterChef = await ethers.getContractFactory("MasterChef");
    masterChef = await MasterChef.attach(masterChefAddress);

    const VaultDistribution = await ethers.getContractFactory("VaultDistribution");
    vaultDistribution = await VaultDistribution.attach(vaultDistributionAddress);

    const VaultVested30 = await ethers.getContractFactory("VaultVested");
    vaultVested30 = await VaultVested30.attach(vaultVested30Address);

    // Start
    vaultCake30 = await deployVaultCake(
        cakeAddress,
        globalTokenAddress,
        cakeMasterChefAddress,
        TREASURY_ADDRESS,
        tokenAddressesAddress,
        routerAddress,
        pathFinderAddress,
        vaultDistributionAddress,
        vaultVested30Address
    );
    console.log("Vault CAKE 30 deployed to:", vaultCake30.address);

    vaultCakeWBNBLP30 = await deployVaultCakeWBNBLP(
        251,
        lpTokenAddress,
        globalTokenAddress,
        cakeAddress,
        wethAddress,
        cakeMasterChefAddress,
        cakeRouterAddress,
        TREASURY_ADDRESS,
        tokenAddressesAddress,
        routerAddress,
        pathFinderAddress,
        vaultDistributionAddress,
        vaultVested30Address,
        vaultCake30.address
    );
    console.log("Vault CAKE-BNB-LP 30 deployed to:", vaultCakeWBNBLP30.address);

    await setUpVaultCake30(owner);
    await setUpVaultCakeBNBLP30(owner);

    await hre.run("verify:verify", {
        address: vaultCakeWBNBLP30.address,
        constructorArguments: [
            251,
            lpTokenAddress,
            globalTokenAddress,
            cakeAddress,
            wethAddress,
            cakeMasterChefAddress,
            cakeRouterAddress,
            TREASURY_ADDRESS,
            tokenAddressesAddress.address,
            routerAddress,
            pathFinderAddress,
            vaultDistributionAddress,
            vaultVested30Address,
            vaultCake30.address
        ],
    });

    console.log("Current block is:", CURRENT_BLOCK);
}

let setUpVaultCake30 = async function (owner) {
    console.log("-- Vault cake set up start");

    await vaultCake30.connect(owner).setRewards(7000, 300, 1000, 1700, 5000);
    console.log("Rewards set to: toUser:7000, toOperations:300, toBuyGlobal:1000, toBuyBNB:1700, toMintGlobal:5000");

    //
    //await vaultCake30.setWhitelist(vaultCakeWBNBLP30.address, true);
    //console.log("Vault is whitelisted in vault cake 30 for deposits");

    await masterChef.setMinter(vaultCake30.address, true);
    console.log("Vault is minter in masterchef");

    await vaultCake30.setMinter(masterChef.address);
    console.log("Minter for this vault is masterchef");

    await vaultDistribution.setDepositary(vaultCake30.address);
    console.log("Vault is now vault distribution depositary");

    await vaultVested30.setDepositary(vaultCake30.address);
    console.log("Vault is now vault vested 30 depositary");

    console.log("-- Vault cake set up done");
}

let setUpVaultCakeBNBLP30 = async function (owner) {
    console.log("-- Vault CAKE-BNB-LP set up start");

    await vaultCakeWBNBLP30.connect(owner).setRewards(7000, 300, 1000, 1700, 5000);
    console.log("Rewards set to: toUser:7000, toOperations:300, toBuyGlobal:1000, toBuyBNB:1700, toMintGlobal:5000");

    await masterChef.setMinter(vaultCakeWBNBLP30.address, true);
    console.log("Vault is minter in masterchef");

    await vaultCakeWBNBLP30.setMinter(masterChef.address);
    console.log("Minter for this vault is masterchef");

    await vaultDistribution.setDepositary(vaultCakeWBNBLP30.address);
    console.log("Vault is now vault distribution depositary");

    await vaultVested30.setDepositary(vaultCakeWBNBLP30.address);
    console.log("Vault is now vault vested 30 depositary");

    console.log("-- Vault CAKE-BNB-LP set up done");
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
