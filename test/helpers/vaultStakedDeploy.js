const ethers = require("hardhat").ethers;
const {
    deployGlobal,
    deployBnb,
    deployTokenAddresses,
    deployPathFinderMock,
    deployGlobalMasterChefMock,
    deployRouterMock,
    deployVaultStaked,
} = require("./singleDeploys.js");

let nativeToken;
let weth;
let globalMasterChefMock;
let tokenAddresses;
let routerMock;
let pathFinderMock;
let vaultStaked;

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

    vaultStaked = await deployVaultStaked(nativeToken.address, weth.address, globalMasterChefMock.address);
};

let getNativeToken = function () { return nativeToken }
let getBnb = function () { return weth }
let getGlobalMasterChefMock = function () { return globalMasterChefMock }
let getVaultStaked = function () { return vaultStaked }

module.exports = {
    deploy,
    getNativeToken,
    getBnb,
    getGlobalMasterChefMock,
    getVaultStaked,
};