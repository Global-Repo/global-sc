const { BigNumber } = require("@ethersproject/bignumber");
const { BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER, DAY_IN_SECONDS } = require("./constants.js");

let timestampNDays = function (nDays) {
    return new Date().setTime(nDays * DAY_IN_SECONDS);
}

let bep20Amount = function (amount) {
    return BigNumber.from(amount).mul(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER);
}

module.exports = {
    timestampNDays,
    bep20Amount,
};