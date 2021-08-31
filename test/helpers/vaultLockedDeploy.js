const ethers = require("hardhat").ethers;
const { timestampNDays } = require("./utils.js");
const {
    deployGlobal,
    deployBnb,
    deployTokenAddresses,
    deployPathFinderMock,
    deployGlobalMasterChefMock,
    deployRouterMock,
    deployVaultLocked,
} = require("./singleDeploys.js");

let nativeToken;
let weth;
let globalMasterChefMock;
let tokenAddresses;
let routerMock;
let pathFinderMock;
let vaultLocked;

let deploy = async function () {
    [owner, user1, ...addrs] = await ethers.getSigners();
    nativeToken = await deployGlobal();
    weth = await deployBnb();
    tokenAddresses = await deployTokenAddresses();
    pathFinderMock = await deployPathFinderMock();
    routerMock = await deployRouterMock();

    await tokenAddresses.addToken(tokenAddresses.BNB(), weth.address);
    await tokenAddresses.addToken(tokenAddresses.GLOBAL(), nativeToken.address);

    globalMasterChefMock = await deployGlobalMasterChefMock(nativeToken.address);

    vaultLocked = await deployVaultLocked(
        nativeToken.address,
        weth.address,
        globalMasterChefMock.address,
        timestampNDays(0)
    );
};

let getNativeToken = function () { return nativeToken }
let getBnb = function () { return weth }
let getGlobalMasterChefMock = function () { return globalMasterChefMock }
let getVaultLocked = function () { return vaultLocked }

module.exports = {
    deploy,
    getNativeToken,
    getBnb,
    getGlobalMasterChefMock,
    getVaultLocked,
};