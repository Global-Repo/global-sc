const ethers = require("hardhat").ethers;
const {
    deployGlobal,
    deployBnb,
    deployTokenAddresses,
    deployPathFinderMock,
    deployMasterChef,
    deployRouterMock,
    deployVaultVested,
} = require("./singleDeploys.js");

let nativeToken;
let weth;
let minter;
let tokenAddresses;
let routerMock;
let pathFinderMock;
let vaultVested;

let deploy = async function () {
    [owner, treasury, vaultLocked, user1, user2, user3, user4, ...addrs] = await ethers.getSigners();
    nativeToken = await deployGlobal();
    weth = await deployBnb();
    tokenAddresses = await deployTokenAddresses();
    pathFinderMock = await deployPathFinderMock();
    routerMock = await deployRouterMock();

    await tokenAddresses.addToken(tokenAddresses.BNB(), weth.address);
    await tokenAddresses.addToken(tokenAddresses.GLOBAL(), nativeToken.address);

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
        treasury.address,
        vaultLocked.address,
        tokenAddresses.address,
        routerMock.address,
        pathFinderMock.address,
    );
};

let getNativeToken = function () { return nativeToken }
let getBnb = function () { return weth }
let getMinter = function () { return minter }
let getRouterMock = function () { return routerMock }
let getVaultDistribution = function () { return vaultDistribution }
let getVaultVested = function () { return vaultVested }

module.exports = {
    deploy,
    getNativeToken,
    getBnb,
    getMinter,
    getRouterMock,
    getVaultDistribution,
    getVaultVested,
};