const ethers = require("hardhat").ethers;
const { expect } = require("chai");
const { BigNumber } = require("@ethersproject/bignumber");
const {timestampNDays, timestampNow} = require("../../helpers/utils");

const TOKEN_DECIMALS = 18;
const BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER = BigNumber.from(10).pow(TOKEN_DECIMALS);
const INITIAL_SUPPLY = BigNumber.from(100).mul(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER);
const INITIAL_SUPPLY_ADDR1 = BigNumber.from(10).mul(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER);
const NATIVE_TOKEN_PER_BLOCK = BigNumber.from(40).mul(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER);
const DAY_IN_SECONDS = 86400;

let startBlock = null;

let nativeToken;
let presale;
let weth;

beforeEach(async function () {
  [owner, addr1, lockedVault, ...addrs] = await ethers.getSigners();

  const CURRENT_BLOCK = await ethers.provider.getBlockNumber();
  startBlock = CURRENT_BLOCK + 1;

  const NativeToken = await ethers.getContractFactory("NativeToken");
  nativeToken = await NativeToken.deploy();
  await nativeToken.deployed();

  const Weth = await ethers.getContractFactory("BEP20");
  weth = await Weth.deploy('Wrapped BNB', 'WBNB');
  await weth.deployed();

  const Presale = await ethers.getContractFactory("Presale");
  presale = await Presale.deploy(nativeToken.address, (await timestampNow()+await timestampNDays(2)), (await timestampNow()+await timestampNDays(9)));
  await presale.deployed();

  await weth.mint(INITIAL_SUPPLY);
  await weth.transfer(addr1.address,INITIAL_SUPPLY_ADDR1);

  await nativeToken.transferOwnership(presale.address);
});

describe("Presale", function () {
  it("Everything should go OK on presale", async function () {
    console.log(await weth.balanceOf(addr1.address));
    await weth.connect(addr1).transfer(presale.address,BigNumber.from(3).mul(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER));
    console.log(await weth.balanceOf(addr1.address));

    //nativeToken.connect(addr1.address).transfer
    //expect(await presale.poolLength()).to.equal(1);
  });

  it("Everything should go OK on presale", async function () {
    const newWhite = (await timestampNow()+await timestampNDays(3));
    await presale.changeWhitelistBegins(newWhite);
    const newPublic = (await timestampNow()+await timestampNDays(10));
    await presale.changePublicBegins(newPublic);
  });
});