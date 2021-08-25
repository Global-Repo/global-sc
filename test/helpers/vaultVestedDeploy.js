const ethers = require("hardhat").ethers;
const { timestampNDays } = require("./utils.js");
const {
    deployGlobal,
    deployBnb,
    deployTokenAddresses,
    deployPathFinderMock,
    deployMasterChef,
    deployRouterMock,
    deployVaultVested,
    deployVaultLocked,
} = require("./singleDeploys.js");

let nativeToken;
let weth;
let globalMasterChef;
let tokenAddresses;
let routerMock;
let pathFinderMock;
let vaultVested;
let vaultLocked;

let deploy = async function () {
    [owner, user1, user2, depositary1, depositary2, ...addrs] = await ethers.getSigners();
    nativeToken = await deployGlobal();
    weth = await deployBnb();
    tokenAddresses = await deployTokenAddresses();
    pathFinderMock = await deployPathFinderMock();
    routerMock = await deployRouterMock();

    await tokenAddresses.addToken(tokenAddresses.BNB(), weth.address);
    await tokenAddresses.addToken(tokenAddresses.GLOBAL(), nativeToken.address);

    globalMasterChef = await deployMasterChef(
        nativeToken.address,
        routerMock.address,
        tokenAddresses.address,
        pathFinderMock.address
    );

    vaultLocked = await deployVaultLocked(
        nativeToken.address,
        weth.address,
        globalMasterChef.address,
        timestampNDays(0)
    );

    vaultVested = await deployVaultVested(
        nativeToken.address,
        weth.address,
        globalMasterChef.address,
        vaultLocked.address
    );
};

let getNativeToken = function () { return nativeToken }
let getBnb = function () { return weth }
let getGlobalMasterChef = function () { return globalMasterChef }
let getRouterMock = function () { return routerMock }
let getVaultVested = function () { return vaultVested }
let getVaultLocked = function () { return vaultLocked }

module.exports = {
    deploy,
    getNativeToken,
    getBnb,
    getGlobalMasterChef,
    getRouterMock,
    getVaultVested,
    getVaultLocked,
};