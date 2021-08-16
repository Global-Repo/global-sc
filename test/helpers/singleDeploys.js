const { NATIVE_TOKEN_PER_BLOCK } = require("./constants.js");

let deployedGlobalAddress;

let deployCake = async function () {
    const CakeToken = await ethers.getContractFactory("BEP20");
    const cakeToken = await CakeToken.deploy('CakeToken', 'CAKE');
    await cakeToken.deployed();
    return cakeToken;
};

let deployGlobal = async function () {
    const NativeToken = await ethers.getContractFactory("NativeToken");
    const nativeToken = await NativeToken.deploy();
    await nativeToken.deployed();
    deployedGlobalAddress = nativeToken.address;
    return nativeToken;
};

let deployBnb = async function () {
    const Weth = await ethers.getContractFactory("BEP20");
    const weth = await Weth.deploy('Wrapped BNB', 'WBNB');
    await weth.deployed();
    return weth;
};

let deployBusd = async function () {
    const Busd = await ethers.getContractFactory("BEP20");
    const busd = await Busd.deploy('Binance USD', 'BUSD');
    await busd.deployed();
    return busd;
};

let deployFactory = async function (feeSetter) {
    const Factory = await ethers.getContractFactory("Factory");
    const factory = await Factory.deploy(feeSetter);
    await factory.deployed();
    return factory;
};

let deployRouter = async function (factory, weth) {
    const Router = await ethers.getContractFactory("Router");
    const router = await Router.deploy(factory, weth);
    await router.deployed();
    return router;
};

let deployTokenAddresses = async function () {
    const TokenAddresses = await ethers.getContractFactory("TokenAddresses");
    const tokenAddresses = await TokenAddresses.deploy();
    await tokenAddresses.deployed();
    return tokenAddresses;
};

let deployPathFinderMock = async function () {
    const PathFinderMock = await ethers.getContractFactory("PathFinderMock");
    const pathFinderMock = await PathFinderMock.deploy();
    await pathFinderMock.deployed();
    return pathFinderMock;
};

let deployMasterChef = async function (global, vaultLocked, router, tokenAddresses, pathFinder) {
    const CURRENT_BLOCK = await ethers.provider.getBlockNumber();
    const startBlock = CURRENT_BLOCK + 1;

    /*if (deployedGlobalAddress === undefined) {
        deployedGlobalAddress = await deployGlobal();
    }*/

    const MasterChef = await ethers.getContractFactory("MasterChef");
    const mc = await MasterChef.deploy(
        global,
        NATIVE_TOKEN_PER_BLOCK,
        startBlock,
        vaultLocked,
        router,
        tokenAddresses,
        pathFinder
    );
    await mc.deployed();
    return mc;
};

let deployCakeMasterChefMock = async function (cake) {
    const CakeMasterChefMock = await ethers.getContractFactory("CakeMasterChefMock");
    const cakeMasterChefMock = await CakeMasterChefMock.deploy(cake);
    await cakeMasterChefMock.deployed();
    return cakeMasterChefMock;
};

let deployRouterMock = async function () {
    const RouterMock = await ethers.getContractFactory("RouterMock");
    const routerMock = await RouterMock.deploy();
    await routerMock.deployed();
    return routerMock;
};

let deployVaultDistribution = async function (bnb, global, devAddress) {
    const VaultDistribution = await ethers.getContractFactory("VaultDistribution");
    const vaultDistribution = await VaultDistribution.deploy(bnb, global, devAddress);
    await vaultDistribution.deployed();
    return vaultDistribution;
};

let deployVaultVested = async function (
    global,
    bnb,
    globalMasterChef,
    treasury,
    vaultLocked,
    tokenAddresses,
    router,
    pathFinder,
) {
    const VaultVested = await ethers.getContractFactory("VaultVested");
    const vaultVested = await VaultVested.deploy(
        global,
        bnb,
        globalMasterChef,
        treasury,
        vaultLocked,
        tokenAddresses,
        router,
        pathFinder,
    );
    await vaultVested.deployed();
    return vaultVested;
};

let deployVaultCake = async function (
    cake,
    global,
    cakeMasterChef,
    treasury,
    tokenAddresses,
    router,
    pathFinder,
    vaultDistribution,
    vaultVested
) {
    const VaultCake = await ethers.getContractFactory("VaultCake");
    const vaultCake = await VaultCake.deploy(
        cake,
        global,
        cakeMasterChef,
        treasury,
        tokenAddresses,
        router,
        pathFinder,
        vaultDistribution,
        vaultVested
    );
    await vaultCake.deployed();
    return vaultCake;
};

module.exports = {
    deployCake,
    deployGlobal,
    deployBnb,
    deployBusd,
    deployFactory,
    deployRouter,
    deployTokenAddresses,
    deployPathFinderMock,
    deployMasterChef,
    deployCakeMasterChefMock,
    deployRouterMock,
    deployVaultDistribution,
    deployVaultCake,
    deployVaultVested,
};