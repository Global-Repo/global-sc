const ethers = require("hardhat").ethers;
const {
    deployGlobal,
    deployBnb,
    deployTokenAddresses,
    deployPathFinderMock,
    deployGlobalMasterChefMock,
    deployRouterMock,
    deployVaultStakedToGlobal,
} = require("./singleDeploys.js");

let nativeToken;
let weth;
let globalMasterChefMock;
let tokenAddresses;
let routerMock;
let pathFinderMock;
let vaultStakedToGlobal;

let deploy = async function () {
    [owner, user1, user2, ...addrs] = await ethers.getSigners();
    nativeToken = await deployGlobal();
    weth = await deployBnb();
    tokenAddresses = await deployTokenAddresses();
    pathFinderMock = await deployPathFinderMock();
    routerMock = await deployRouterMock();

    await tokenAddresses.addToken(tokenAddresses.BNB(), weth.address);
    await tokenAddresses.addToken(tokenAddresses.GLOBAL(), nativeToken.address);

    globalMasterChefMock = await deployGlobalMasterChefMock(nativeToken.address);

    vaultStakedToGlobal = await deployVaultStakedToGlobal(
        nativeToken.address,
        weth.address,
        globalMasterChefMock.address,
        routerMock.address
    );
};

let getNativeToken = function () { return nativeToken }
let getBnb = function () { return weth }
let getGlobalMasterChefMock = function () { return globalMasterChefMock }
let getRouterMock = function () { return routerMock }
let getVaultStakedToGlobal = function () { return vaultStakedToGlobal }

module.exports = {
    deploy,
    getNativeToken,
    getBnb,
    getGlobalMasterChefMock,
    getRouterMock,
    getVaultStakedToGlobal,
};