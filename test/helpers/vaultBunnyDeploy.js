const ethers = require("hardhat").ethers;
const {
    deployGlobal,
    deployBnb,
    deployBusd,
    deployFactory,
    deployRouter,
    deployTokenAddresses,
    deployPathFinderMock,
    deployMasterChef,
    deployRouterMock,
    deployVaultDistribution,
    deployVaultVested,
    deployVaultBunny,
    deployBunny,
    deployBunnyPoolMock,
} = require("./singleDeploys.js");

let cakeToken;
let nativeToken;
let factory;
let weth;
let router;
let globalMasterChef;
let tokenAddresses;
let routerMock;
let pathFinderMock;
let vaultDistribution;
let busd;
let vaultVested;
let vaultBunny;
let bunny;
let bunnyPoolMock;

let deploy = async function () {
    [owner, treasury, vaultLocked, user1, user2, ...addrs] = await ethers.getSigners();
    bunny = await deployBunny();
    bunnyPoolMock = await deployBunnyPoolMock(bunny.address);
    nativeToken = await deployGlobal();
    weth = await deployBnb();
    busd = await deployBusd();
    factory = await deployFactory(owner.address);
    router = await deployRouter(factory.address, weth.address);
    tokenAddresses = await deployTokenAddresses();
    pathFinderMock = await deployPathFinderMock();
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
    await tokenAddresses.addToken(tokenAddresses.BUSD(), busd.address);
    await tokenAddresses.addToken(tokenAddresses.BUNNY(), bunny.address);

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

    vaultBunny = await deployVaultBunny(
        bunny.address,
        nativeToken.address,
        weth.address,
        bunnyPoolMock.address,
        treasury.address,
        tokenAddresses.address,
        routerMock.address,
        pathFinderMock.address,
        vaultDistribution.address,
        vaultVested.address,
        routerMock.address
    );
};

let getNativeToken = function () { return nativeToken }
let getBnb = function () { return weth }
let getBusd = function () { return busd }
let getVaultDistribution = function () { return vaultDistribution }
let getVaultVested = function () { return vaultVested }
let getVaultBunny = function () { return vaultBunny }
let getBunny = function () { return bunny }
let getGlobalMasterChef = function () { return globalMasterChef }
let getBunnyPoolMock = function () { return bunnyPoolMock }
let getRouterMock = function () { return routerMock }

module.exports = {
    deploy,
    getVaultBunny,
    getNativeToken,
    getBnb,
    getBusd,
    getBunny,
    getVaultDistribution,
    getVaultVested,
    getGlobalMasterChef,
    getBunnyPoolMock,
    getRouterMock,
};