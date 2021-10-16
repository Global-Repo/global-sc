const ethers = require("hardhat").ethers;
const { expect } = require("chai");
const { BigNumber } = require("@ethersproject/bignumber");

const PID = 999;
const TOKEN_DECIMALS = 18;
const BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER = BigNumber.from(10).pow(TOKEN_DECIMALS);
const NATIVE_TOKEN_PER_BLOCK = BigNumber.from(40).mul(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER);

let startBlock;

let cakeToken;
let nativeToken;
let factory;
let weth;
let router;
let minter;
let cakeMasterChefMock;
let tokenAddresses;
let routerMock;
let pathFinder;
let vaultCakeWBNBLP;
let masterChefInternal;
let cakeWbnbLP;

beforeEach(async function () {
  [owner, treasury, keeper, addr3, ...addrs] = await ethers.getSigners();

  const CURRENT_BLOCK = await ethers.provider.getBlockNumber();
  startBlock = CURRENT_BLOCK + 1;

  const CakeToken = await ethers.getContractFactory("BEP20");
  cakeToken = await CakeToken.deploy('CakeToken', 'CAKE');
  await cakeToken.deployed();

  const NativeToken = await ethers.getContractFactory("NativeToken");
  nativeToken = await NativeToken.deploy();
  await nativeToken.deployed();

  const Factory = await ethers.getContractFactory("Factory");
  factory = await Factory.deploy(owner.address);
  await factory.deployed();

  const Weth = await ethers.getContractFactory("BEP20");
  weth = await Weth.deploy('Wrapped BNB', 'WBNB');
  await weth.deployed();

  const CakeWbnbLP = await ethers.getContractFactory("BEP20");
  cakeWbnbLP = await CakeWbnbLP.deploy('CakeWbnbLP', 'LP');
  await cakeWbnbLP.deployed();

  const Router = await ethers.getContractFactory("Router");
  router = await Router.deploy(factory.address, weth.address);
  await router.deployed();

  const TokenAddresses = await ethers.getContractFactory("TokenAddresses");
  tokenAddresses = await TokenAddresses.deploy();
  await tokenAddresses.deployed();
  await tokenAddresses.addToken(tokenAddresses.CAKE_WBNB_LP(), cakeWbnbLP.address);
  await tokenAddresses.addToken(tokenAddresses.CAKE(), cakeToken.address);
  await tokenAddresses.addToken(tokenAddresses.GLOBAL(), nativeToken.address);
  await tokenAddresses.addToken(tokenAddresses.WBNB(), weth.address);

  const PathFinder = await ethers.getContractFactory("PathFinder");
  pathFinder = await PathFinder.deploy(tokenAddresses.address);
  await pathFinder.deployed();

  const MasterChefInternal = await ethers.getContractFactory("MasterChefInternal");
  masterChefInternal = await MasterChefInternal.deploy(tokenAddresses.address, pathFinder.address);
  await masterChefInternal.deployed();

  const Minter = await ethers.getContractFactory("MasterChef");
  minter = await Minter.deploy(
      masterChefInternal.address,
      nativeToken.address,
      NATIVE_TOKEN_PER_BLOCK,
      startBlock,
      router.address,
      tokenAddresses.address,
      pathFinder.address
  );
  await minter.deployed();
  await pathFinder.transferOwnership(minter.address);

  const CakeMasterChefMock = await ethers.getContractFactory("CakeMasterChefMock");
  cakeMasterChefMock = await CakeMasterChefMock.deploy(cakeToken.address);
  await cakeMasterChefMock.deployed();

  const RouterMock = await ethers.getContractFactory("RouterMock");
  routerMock = await RouterMock.deploy();
  await routerMock.deployed();

  const VaultCakeWBNBLP = await ethers.getContractFactory("VaultCakeWBNBLP");
  vaultCakeWBNBLP = await VaultCakeWBNBLP.deploy(
      PID,
      cakeWbnbLP.address,       //simulating LP BEP20 token
      nativeToken.address,
      cakeToken.address,
      cakeMasterChefMock.address,
      routerMock.address, //just for testing
      treasury.address,
      tokenAddresses.address,
      routerMock.address,
      pathFinder.address,
      keeper.address
  );
  await vaultCakeWBNBLP.deployed();

  // Set up scenarios
  await nativeToken.transferOwnership(minter.address);
});

describe("VaultCakeWBNBLP: After deployment", function () {
  it("Check Cake pool id (pid)", async function () {
    expect(await vaultCakeWBNBLP.pid()).to.equal(PID);
  });

  it("VCW-06 -- Wrong staking token information. should be CakeWBNBLP", async function () {
    expect(await vaultCakeWBNBLP.stakingToken()).to.equal(cakeWbnbLP.address);
  });

  it("VCW-07 -- Wrong rewards token information. Should be cakeToken", async function () {
    expect(await vaultCakeWBNBLP.rewardsToken()).to.equal(cakeToken.address);
  });

  it("VCW-04 Missing access restriction Test. Only owner can set minter.", async function () {
    await minter.setMinter(vaultCakeWBNBLP.address, true);
    await vaultCakeWBNBLP.setMinter(minter.address);
    await expect (vaultCakeWBNBLP.connect(addr3).setMinter(minter.address)).to.be.revertedWith("Ownable: caller is not the owner");
  });
});