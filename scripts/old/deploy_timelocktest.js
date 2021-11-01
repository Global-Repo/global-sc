const hre = require("hardhat");
const { BigNumber } = require("@ethersproject/bignumber");
require("@nomiclabs/hardhat-ethers");
const {ethers} = require("hardhat");
const {
    deployGlobal,
    deployFactory,
    deployRouter,
    deployTokenAddresses,
    deployPathFinder,
    deployMintNotifier,
    deploySmartChefFactory,
    deployVaultLocked,
} = require("../test/helpers/singleDeploys.js");
const { timestampNHours, bep20Amount } = require("../test/helpers/utils.js");

let globalToken; //
let factory;
let router;
let tokenAddresses;
let pathFinder;
let masterChefInternal;
let masterChef;
let smartChefFactory;
let mintNotifier;
let vaultLocked;

let wethAddress;
let busdAddress;
let cakeAddress;

let CURRENT_BLOCK;
let masterChefStartBlock

// Addresses
let DEPLOYER_ADDRESS = null;
let TREASURY_ADDRESS = null;
let DEV_ADDRESS = null;
let DEV_POWER_ADDRESS = null;

const TOKEN_DECIMALS = 18;
const BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER = BigNumber.from(10).pow(TOKEN_DECIMALS);

function encodeParameters(types, values) {
    const abi = new ethers.utils.AbiCoder();
    return abi.encode(types, values);
}

async function main() {
    [owner, ...addrs] = await hre.ethers.getSigners();

    const Token = await ethers.getContractFactory("BEP20");
    const token = await Token.attach("0x72529F552CFe51b7C221B3517034f45B3EFCCb62");
    //console.log(token.contract);
    /*const Timelock = await ethers.getContractFactory("Timelock");
    const timelock = await Timelock.attach("0x0f5f4C277BF7332d5536EF90e20f7C75570aF41A");*/


    /*let data = encodeParameters(['uint256','uint8'], [10,20]);
    //console.log(data);
    let timestampNow = (await ethers.provider.getBlock(await ethers.provider.getBlockNumber())).timestamp;*/

    //let txHash = await timelock.queueTransaction(token.address, 0, "mint(uint256)", data, timestampNow+120);
    //console.log(txHash.toString());
    //keccak256(abi.encode(target, value, signature, data, eta));

    //await timelock.executeTransaction(token.address, 0, "mint(uint256)", data, 1634340971);

    const Multisig = await ethers.getContractFactory("MultiSigWallet");
    const multisig = await Multisig.attach("0x5d1FAaF5dD8f042443E5B99a08B5BFBE0410a32A");

    const transferEncoded = token.contract.mint.getData(1000);
    const transferEncoded2 = abi.encodePacked(mint.getData(1000));
    //console.log(transferEncoded);abi.encodePacked(
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
