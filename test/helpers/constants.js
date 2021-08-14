const { BigNumber } = require("@ethersproject/bignumber");

// TODO: move to utils
let timestampNDays = function (nDays) {
    return new Date().setTime(nDays * DAY_IN_SECONDS);
}

const TOKEN_DECIMALS = 18;
const BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER = BigNumber.from(10).pow(TOKEN_DECIMALS);
const NATIVE_TOKEN_PER_BLOCK = BigNumber.from(40).mul(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER);
const DAY_IN_SECONDS = 86400;
const TIMESTAMP_3_DAYS = timestampNDays(3);
const TIMESTAMP_4_DAYS = timestampNDays(4);

module.exports = {
    TOKEN_DECIMALS,
    BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER,
    NATIVE_TOKEN_PER_BLOCK,
    TIMESTAMP_3_DAYS,
    TIMESTAMP_4_DAYS,
};