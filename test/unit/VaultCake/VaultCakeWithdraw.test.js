const ethers = require("hardhat").ethers;
const { expect } = require("chai");
const { BigNumber } = require("@ethersproject/bignumber");

const TOKEN_DECIMALS = 18;
const BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER = BigNumber.from(10).pow(TOKEN_DECIMALS);
const NATIVE_TOKEN_PER_BLOCK = BigNumber.from(40).mul(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER);
const OWNER_INITIAL_CAKES = BigNumber.from(100).mul(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER);

let startBlock;

let cakeToken;
let nativeToken;
let factory;
let weth;
let router;
let minter;
let cakeMasterChefMock;
let vaultCake;

beforeEach(async function () {
  [owner, lockedVault, keeper, addr3, ...addrs] = await ethers.getSigners();

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

  const Router = await ethers.getContractFactory("Router");
  router = await Router.deploy(factory.address, weth.address);
  await router.deployed();

  const Minter = await ethers.getContractFactory("MasterChef");
  minter = await Minter.deploy(
      nativeToken.address,
      NATIVE_TOKEN_PER_BLOCK,
      startBlock,
      lockedVault.address,
      router.address
  );
  await minter.deployed();

  const CakeMasterChefMock = await ethers.getContractFactory("CakeMasterChefMock");
  cakeMasterChefMock = await CakeMasterChefMock.deploy(cakeToken.address);
  await cakeMasterChefMock.deployed();

  const VaultCake = await ethers.getContractFactory("VaultCake");
  vaultCake = await VaultCake.deploy(
      cakeToken.address,
      nativeToken.address,
      cakeMasterChefMock.address,
      keeper.address
  );
  await vaultCake.deployed();

  // Set up scenarios
  await nativeToken.transferOwnership(minter.address);
  await minter.setMinter(vaultCake.address, true);
  await vaultCake.setMinter(minter.address);

  // Mint 100 cake tokens to owner
  await cakeToken.mint(OWNER_INITIAL_CAKES);

  // Cake's owner now is cake MC
  await cakeToken.transferOwnership(cakeMasterChefMock.address);
});

describe("VaultCake: Withdraw", function () {
  it("Cannot withdraw without previous deposit", async function () {
    await expect(
      vaultCake.connect(addr3).withdraw(BigNumber.from(0).mul(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER))
    ).to.be.revertedWith("Whitelist: caller is not on the whitelist");
  });

  it("Withdraw: only retrieves deposited tokens, without rewards", async function () {
    const depositAmount = BigNumber.from(5).mul(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER);
    const withdrawAmount = BigNumber.from(1).mul(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER);
    const withdrawWithReward = OWNER_INITIAL_CAKES.sub(depositAmount).add(withdrawAmount);

    await cakeToken.approve(vaultCake.address, OWNER_INITIAL_CAKES);
    await vaultCake.deposit(depositAmount);
    // Needed to execute withdraw method.
    await vaultCake.setWhitelist(owner.address, true);

    expect(await vaultCake.withdraw(withdrawAmount))
        .to.emit(vaultCake, 'Withdrawn')
        .withArgs(owner.address, withdrawAmount, 0);

    expect(await cakeToken.balanceOf(owner.address)).to.equal(withdrawWithReward);
  });
});