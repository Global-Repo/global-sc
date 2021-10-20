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
    deployCakeMasterChefLPMock,
    deployCakeMasterChefMock,
    deployRouterMock,
    deployVaultDistribution,
    deployVaultVested,
    deployVaultCake,
    deployVaultCakeWBNBLP,
} = require("./singleDeploys.js");

let cakeToken;
let nativeToken;
let factory;
let weth;
let router;
let globalMasterChef;
let cakeMasterChefMock;
let cakeMasterChefLPMock;
let tokenAddresses;
let routerMock;
let pathFinderMock;
let vaultDistribution;
let vaultCakeWBNBLP;
let busd;
let vaultVested;
let vaultCake;
let lpToken;

let deploy = async function () {
    [owner, treasury, vaultLocked, user1, user2, user3, user4, ...addrs] = await ethers.getSigners();

    const CakeWbnbLP = await ethers.getContractFactory("BEP20");
    lpToken = await CakeWbnbLP.deploy('CakeWBNBLP', 'LP');
    await lpToken.deployed();

    cakeToken = await deployCake();
    nativeToken = await deployGlobal();
    weth = await deployBnb();
    busd = await deployBusd();
    factory = await deployFactory(owner.address);
    router = await deployRouterMock(factory.address, weth.address);
    tokenAddresses = await deployTokenAddresses();
    pathFinderMock = await deployPathFinderMock();
    cakeMasterChefMock = await deployCakeMasterChefMock(lpToken.address, cakeToken.address);
    cakeMasterChefLPMock = await deployCakeMasterChefLPMock(lpToken.address, cakeToken.address);
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
    await tokenAddresses.addToken(tokenAddresses.CAKE_WBNB_LP(), lpToken.address);

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

    vaultCakeWBNBLP = await deployVaultCakeWBNBLP(
        0,
        lpToken.address,
        nativeToken.address,
        cakeToken.address,
        weth.address,
        cakeMasterChefLPMock.address,
        routerMock.address,
        treasury.address,
        tokenAddresses.address,
        routerMock.address,
        pathFinderMock.address,
        vaultDistribution.address,
        vaultVested.address,
        vaultCake.address
    );
};

let getNativeToken = function () { return nativeToken }
let getCakeToken = function () { return cakeToken }
let getBnb = function () { return weth }
let getGlobalMasterChef = function () { return globalMasterChef }
let getCakeMasterChefLPMock = function () { return cakeMasterChefLPMock }
let getRouterMock = function () { return routerMock }
let getVaultDistribution = function () { return vaultDistribution }
let getVaultVested = function () { return vaultVested }
let getVaultCake = function () { return vaultCake }
let getVaultCakeWBNBLP = function () { return vaultCakeWBNBLP }
let getBusd = function () { return busd }
let getLPToken = function () { return lpToken }

module.exports = {
    deploy,
    getCakeToken,
    getNativeToken,
    getBnb,
    getGlobalMasterChef,
    getCakeMasterChefLPMock,
    getRouterMock,
    getVaultDistribution,
    getVaultVested,
    getVaultCake,
    getVaultCakeWBNBLP,
    getBusd,
    getLPToken,
};