const ethers = require("hardhat").ethers;
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
let minter;
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

    vaultLocked = await deployVaultLocked(nativeToken.address, weth.address);

    minter = await deployMasterChef(
        nativeToken.address,
        vaultLocked.address,
        routerMock.address,
        tokenAddresses.address,
        pathFinderMock.address
    );

    vaultVested = await deployVaultVested(
        nativeToken.address,
        weth.address,
        minter.address,
        vaultLocked.address
    );
};

let getNativeToken = function () { return nativeToken }
let getBnb = function () { return weth }
let getMinter = function () { return minter }
let getRouterMock = function () { return routerMock }
let getVaultVested = function () { return vaultVested }
let getVaultLocked = function () { return vaultLocked }

module.exports = {
    deploy,
    getNativeToken,
    getBnb,
    getMinter,
    getRouterMock,
    getVaultVested,
    getVaultLocked,
};