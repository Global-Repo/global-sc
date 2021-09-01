const ethers = require("hardhat").ethers;
const {
    deployGlobal,
    deployBnb,
    deployVaultDistribution,
} = require("./singleDeploys.js");

let nativeToken;
let weth;
let vaultDistribution;

let deploy = async function () {
    [owner, treasury, vaultVested, user1, user2, user3, user4, beneficiary1, beneficiary2, beneficiary3, depositary1, depositary2, ...addrs] = await ethers.getSigners();
    weth = await deployBnb();
    nativeToken = await deployGlobal();
    vaultDistribution = await deployVaultDistribution(weth.address, nativeToken.address);
};

let getNativeToken = function () { return nativeToken }
let getBnb = function () { return weth }
let getVaultDistribution = function () { return vaultDistribution }

module.exports = {
    deploy,
    getNativeToken,
    getBnb,
    getVaultDistribution,
};