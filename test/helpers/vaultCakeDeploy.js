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
} = require("./singleDeploys.js");

let cakeToken;
let nativeToken;
let factory;
let weth;
let router;
let minter;
let cakeMasterChefMock;
let tokenAddresses;
let routerMock;
let pathFinderMock;
let vaultDistribution;
let vaultCake;
let busd;

let deploy = async function () {
    [owner, treasury, vaultVested, user1, user2, user3, user4, ...addrs] = await ethers.getSigners();
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
    minter = await deployMasterChef(
        nativeToken.address,
        vaultVested.address,
        router.address,
        tokenAddresses.address,
        pathFinderMock.address
    );

    await tokenAddresses.addToken(tokenAddresses.BNB(), weth.address);
    await tokenAddresses.addToken(tokenAddresses.GLOBAL(), nativeToken.address);
    await tokenAddresses.addToken(tokenAddresses.CAKE(), cakeToken.address);
    await tokenAddresses.addToken(tokenAddresses.BUSD(), busd.address);

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
let getMinter = function () { return minter }
let getCakeMasterChefMock = function () { return cakeMasterChefMock }
let getRouterMock = function () { return routerMock }
let getVaultDistribution = function () { return vaultDistribution }
let getVaultCake = function () { return vaultCake }
let getBusd = function () { return busd }

module.exports = {
    deploy,
    getCakeToken,
    getNativeToken,
    getBnb,
    getMinter,
    getCakeMasterChefMock,
    getRouterMock,
    getVaultDistribution,
    getVaultCake,
    getBusd,
};