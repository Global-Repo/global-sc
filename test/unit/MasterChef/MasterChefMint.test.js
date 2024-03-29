const ethers = require("hardhat").ethers;
const { expect } = require("chai");
const { BigNumber } = require("@ethersproject/bignumber");

const TOKEN_DECIMALS = 18;
const BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER = BigNumber.from(10).pow(TOKEN_DECIMALS);
const NATIVE_TOKEN_PER_BLOCK = BigNumber.from(40).mul(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER);
const BIG_ZERO = BigNumber.from(0);

let startBlock = null;

let nativeToken;
let factory;
let router;
let tokenA;
let tokenB;
let weth;
let masterChef;
let masterChefInternal;
let tokenAddresses;
let pathFinder;
let mintNotifier;
let minterVested;

beforeEach(async function () {
  [owner, devs, vault, lockedVault, addrVested, ...addrs] = await ethers.getSigners();

  const CURRENT_BLOCK = await ethers.provider.getBlockNumber();
  startBlock = CURRENT_BLOCK + 1;

  const NativeToken = await ethers.getContractFactory("NativeToken");
  nativeToken = await NativeToken.deploy();
  await nativeToken.deployed();

  const TokenA = await ethers.getContractFactory("BEP20");
  tokenA = await TokenA.deploy('tokenA', 'AA');
  await tokenA.deployed();

  const TokenB = await ethers.getContractFactory("BEP20");
  tokenB = await TokenB.deploy('tokenB', 'BB');
  await tokenB.deployed();

  const Factory = await ethers.getContractFactory("Factory");
  factory = await Factory.deploy(owner.address);
  await factory.deployed();

  const Weth = await ethers.getContractFactory("BEP20");
  weth = await Weth.deploy('Wrapped BNB', 'WBNB');
  await weth.deployed();

  const Router = await ethers.getContractFactory("Router");
  router = await Router.deploy(factory.address, weth.address);
  await router.deployed();

  const TokenAddresses = await ethers.getContractFactory("TokenAddresses");
  tokenAddresses = await TokenAddresses.deploy();
  await tokenAddresses.deployed();

  const PathFinder = await ethers.getContractFactory("PathFinder");
  pathFinder = await PathFinder.deploy(tokenAddresses.address);
  await pathFinder.deployed();

  const MasterChefInternal = await ethers.getContractFactory("MasterChefInternal");
  masterChefInternal = await MasterChefInternal.deploy(tokenAddresses.address, pathFinder.address);
  await masterChefInternal.deployed();

  const MasterChef = await ethers.getContractFactory("MasterChef");
  masterChef = await MasterChef.deploy(
      masterChefInternal.address,
      nativeToken.address,
      NATIVE_TOKEN_PER_BLOCK,
      startBlock,
      router.address,
      tokenAddresses.address,
      pathFinder.address
  );
  await masterChef.deployed();

  const MintNotifier = await ethers.getContractFactory("MintNotifier");
  mintNotifier = await MintNotifier.deploy();
  await mintNotifier.deployed();

  await masterChef.setMintNotifier(mintNotifier.address);

  await pathFinder.transferOwnership(masterChef.address);


  // Set up scenarios
  const INITIAL_SUPPLY = BigNumber.from(100).mul(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER);

  await nativeToken.mint(INITIAL_SUPPLY);
  await tokenA.mint(INITIAL_SUPPLY);
  await tokenB.mint(INITIAL_SUPPLY);
  await tokenA.approve(router.address, INITIAL_SUPPLY.toHexString());
  await tokenB.approve(router.address, INITIAL_SUPPLY.toHexString());

  await nativeToken.openTrading();
  await nativeToken.transferOwnership(masterChef.address);

  const MinterVested = await ethers.getContractFactory("MinterVested");
  minterVested = await MinterVested.deploy(masterChef.address,nativeToken.address);
  await minterVested.deployed();
  await masterChef.setMinter(minterVested.address, true);
});

describe("MasterChef: Mint", function () {
  xit("As an owner I am not able to mint tokens", async function () {
    await expect(
      masterChef.mintNativeTokens(BigNumber.from(2).mul(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER), owner.address)
    ).to.revertedWith('[f] OnlyMinter: caller is not the minter.');
  });

  xit("As a minter I am able to mint tokens", async function () {
    expect(await nativeToken.totalSupply()).to.equal(BIG_ZERO);

    const amountToMint = BigNumber.from(2).mul(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER);

    await masterChef.setMinter(vault.address, true);
    await masterChef.connect(vault).mintNativeTokens(amountToMint, vault.address);

    // Ensures Masterchef minted something.
    const mintedSupply = await nativeToken.totalSupply();

    expect(mintedSupply.gt(amountToMint)).to.true;
  });

  xit("When native tokens are minted the MintNotifier should be notified", async function () {
    expect(await nativeToken.totalSupply()).to.equal(BIG_ZERO);

    const amountToMint = BigNumber.from(3).mul(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER);

    await masterChef.setMinter(vault.address, true);
    expect(await masterChef.connect(vault).mintNativeTokens(amountToMint,vault.address))
        .to.emit(mintNotifier, 'GlobalsMinted')
        .withArgs(vault.address,vault.address, amountToMint);
  });

  xit("When minting tokens, there is an extra mint amount for devs team", async function () {
    expect(await nativeToken.totalSupply()).to.equal(BIG_ZERO);

    const amountToMint = BigNumber.from(2).mul(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER);

    await masterChef.setMinter(vault.address, true);
    //await masterChef.setDevAddress(devs.address);
    await masterChef.setTreasury(devs.address);
    await masterChef.setTreasuryLP(devs.address);
    await masterChef.connect(vault).mintNativeTokens(amountToMint, vault.address);

    // Ensures Masterchef minted an extra 10% for devs.
    const expectedAmountMintedForDevs = amountToMint.mul(10).div(100);
    const mintedSupply = await nativeToken.totalSupply();

    // 1) Supply is 110% of minted amount.
    expect(mintedSupply).to.equal(amountToMint.add(expectedAmountMintedForDevs));

    // 2) Devs address has 10% of minted tokens.
    expect(await nativeToken.balanceOf(devs.address)).to.equal(expectedAmountMintedForDevs);
  });

  xit("Mint for 0 tokens", async function () {
    expect(await nativeToken.totalSupply()).to.equal(BIG_ZERO);

    await masterChef.setMinter(vault.address, true);
    await masterChef.connect(vault).mintNativeTokens(BIG_ZERO, vault.address);

    expect(await nativeToken.totalSupply()).to.equal(BIG_ZERO);
  });
  it("As a minter contract I should be able to mint and send to someone", async function () {
      expect(await nativeToken.balanceOf(addrVested.address)).to.equal(BIG_ZERO);
     await minterVested.callMintNativeTokens(BigNumber.from(3).mul(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER), addrVested.address);
     expect(await nativeToken.balanceOf(addrVested.address)).to.equal(BigNumber.from(3).mul(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER));
  });
});