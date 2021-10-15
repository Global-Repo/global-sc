const ethers = require("hardhat").ethers;
const {
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
} = require("./singleDeploys.js");

let cakeToken;
let nativeToken;
let factory;
let weth;
let router;
let globalMasterChef;
let cakeMasterChefMock;
let tokenAddresses;
let routerMock;
let pathFinderMock;
let vaultDistribution;
let vaultCake;
let busd;
let vaultVested;

let deploy = async function () {
    [owner, treasury, vaultLocked, user1, user2, user3, user4, ...addrs] = await ethers.getSigners();
    cakeToken = await deployCake();
    nativeToken = await deployGlobal();
    weth = await deployBnb();
    busd = await deployBusd();
    factory = await deployFactory(owner.address);
    router = await deployRouter(factory.address, weth.address);
    tokenAddresses = await deployTokenAddresses();
    pathFinderMock = await deployPathFinderMock();
    cakeMasterChefMock = await deployCakeMasterChefMock(cakeToken.address);
    routerMock = await deployRouterMock();
    vaultDistribution = await deployVaultDistribution(weth.address, nativeToken.address, owner.address);

    globalMasterChef = await deployMasterChef(
        nativeToken.address,
        router.address,
        tokenAddresses.address,
        pathFinderMock.address
    );

    await tokenAddresses.addToken(tokenAddresses.BNB(), weth.address);
    await tokenAddresses.addToken(tokenAddresses.WBNB(), weth.address);
    await tokenAddresses.addToken(tokenAddresses.GLOBAL(), nativeToken.address);
    await tokenAddresses.addToken(tokenAddresses.CAKE(), cakeToken.address);
    await tokenAddresses.addToken(tokenAddresses.BUSD(), busd.address);

    vaultVested = await deployVaultVested(
        nativeToken.address,
        weth.address,
        globalMasterChef.address,
        treasury.address,
        vaultLocked.address,
        tokenAddresses.address,
        routerMock.address,
        pathFinderMock.address,
    );

    vaultCake = await deployVaultCake(
        cakeToken.address,
        nativeToken.address,
        cakeMasterChefMock.address,
        treasury.address,
        tokenAddresses.address,
        routerMock.address,
        pathFinderMock.address,
        vaultDistribution.address,
        vaultVested.address
    );
};

let getNativeToken = function () { return nativeToken }
let getCakeToken = function () { return cakeToken }
let getBnb = function () { return weth }
let getGlobalMasterChef = function () { return globalMasterChef }
let getCakeMasterChefMock = function () { return cakeMasterChefMock }
let getRouterMock = function () { return routerMock }
let getVaultDistribution = function () { return vaultDistribution }
let getVaultVested = function () { return vaultVested }
let getVaultCake = function () { return vaultCake }
let getBusd = function () { return busd }

module.exports = {
    deploy,
    getCakeToken,
    getNativeToken,
    getBnb,
    getGlobalMasterChef,
    getCakeMasterChefMock,
    getRouterMock,
    getVaultDistribution,
    getVaultVested,
    getVaultCake,
    getBusd,
};