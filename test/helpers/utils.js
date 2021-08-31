const { BigNumber } = require("@ethersproject/bignumber");
const { BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER, DAY_IN_SECONDS, HOUR_IN_SECONDS } = require("./constants.js");
const {ethers} = require("hardhat");

let timestampNHours = function (nHours) {
    return new Date().setTime(nHours * HOUR_IN_SECONDS);
}

let timestampNDays = function (nDays) {
    return new Date().setTime(nDays * DAY_IN_SECONDS);
}

let timestampNow = async function () {
    return (await ethers.provider.getBlock(await ethers.provider.getBlockNumber())).timestamp;
    //return Math.floor(new Date().getTime()/1000);
}

let bep20Amount = function (amount) {
    return BigNumber.from(amount).mul(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER);
}

module.exports = {
    timestampNHours,
    timestampNDays,
    timestampNow,
    bep20Amount,
};