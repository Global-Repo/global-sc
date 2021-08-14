const { BigNumber } = require("@ethersproject/bignumber");

const TOKEN_DECIMALS = 18;
const BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER = BigNumber.from(10).pow(TOKEN_DECIMALS);
const DAY_IN_SECONDS = 86400;

const NATIVE_TOKEN_PER_BLOCK = BigNumber.from(40).mul(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER);

module.exports = {
    TOKEN_DECIMALS,
    BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER,
    NATIVE_TOKEN_PER_BLOCK,
    DAY_IN_SECONDS,
};