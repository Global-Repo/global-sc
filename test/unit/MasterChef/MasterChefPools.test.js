const ethers = require("hardhat").ethers;
const { expect } = require("chai");
const { BigNumber } = require("@ethersproject/bignumber");

const TOKEN_DECIMALS = 18;
const BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER = BigNumber.from(10).pow(TOKEN_DECIMALS);
const NATIVE_TOKEN_PER_BLOCK = BigNumber.from(40).mul(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER);
const DAY_IN_SECONDS = 86400;

let startBlock = null;

let nativeToken;
let factory;
let router;
let tokenA;
let tokenB;
let tokenARoute;
let tokenBRoute;
let weth;
let masterChef;

beforeEach(async function () {
  [owner, addr1, lockedVault, ...addrs] = await ethers.getSigners();

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

  // TODO: should be same contract as mainet or BEP20 is okay?
  // TODO: https://bscscan.com/address/0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c#code
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

  const MasterChef = await ethers.getContractFactory("MasterChef");
  masterChef = await MasterChef.deploy(
      nativeToken.address,
      NATIVE_TOKEN_PER_BLOCK,
      startBlock,
      lockedVault.address,
      router.address,
      tokenAddresses.address,
      pathFinder.address
  );
  await masterChef.deployed();

  await pathFinder.transferOwnership(masterChef.address);

  // Set up scenarios
  const INITIAL_SUPPLY = BigNumber.from(1000000).mul(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER);
  const INITIAL_SUPPLY_ADDR1 = BigNumber.from(100).mul(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER);
  const INITIAL_SUPPLY_OWNER = BigNumber.from(999900).mul(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER);

  await tokenA.mint(INITIAL_SUPPLY);
  await weth.mint(INITIAL_SUPPLY);
  await nativeToken.mint(INITIAL_SUPPLY);

  await nativeToken.transferOwnership(masterChef.address);

  tokenA.transfer(addr1.address,INITIAL_SUPPLY_ADDR1);
  weth.transfer(addr1.address,INITIAL_SUPPLY_ADDR1);

  await tokenA.approve(router.address, INITIAL_SUPPLY_OWNER.toHexString());
  await weth.approve(router.address, INITIAL_SUPPLY_OWNER.toHexString());

  await tokenA.connect(addr1).approve(router.address, INITIAL_SUPPLY_ADDR1.toHexString());
  await weth.connect(addr1).approve(router.address, INITIAL_SUPPLY_ADDR1.toHexString());

  tokenAddresses.addToken(tokenAddresses.BNB(), weth.address);
});

describe("MasterChef: Pools", function () {
  xit("Should to add a new liquidity provider (LP) pool", async function () {
    let date = new Date();
    const deadline = date.setTime(date.getTime() + 2 * 86400000); // +2 days

    await router.addLiquidity(
        tokenA.address,
        weth.address,
        BigNumber.from(10).mul(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER),
        BigNumber.from(10).mul(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER),
        BigNumber.from(1).mul(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER),
        BigNumber.from(1).mul(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER),
        owner.address,
        deadline
    );

    const pairAddress = await factory.getPair(tokenA.address, weth.address);

    await masterChef.addPool(
        100,
        pairAddress,
        DAY_IN_SECONDS * 3,
        false,
        DAY_IN_SECONDS * 3,
        50,
        50,
        100,
        100
    );

    const poolInfo = await masterChef.poolInfo(1);

    expect(await masterChef.poolLength()).to.equal(2);
    expect(poolInfo.allocPoint).to.equal(NATIVE_TOKEN_PER_BLOCK);
    expect(poolInfo.lpToken).to.equal(pairAddress);
    expect(poolInfo.harvestInterval).to.equal(259200);
    expect(poolInfo.maxWithdrawalInterval).to.equal(259200);
    expect(poolInfo.withDrawalFeeOfLpsBurn).to.equal(50);
    expect(poolInfo.withDrawalFeeOfLpsTeam).to.equal(50);
    expect(poolInfo.performanceFeesOfNativeTokensBurn).to.equal(100);
    expect(poolInfo.performanceFeesOfNativeTokensToLockedVault).to.equal(100);
  });

  xit("Should to update pool info properly", async function () {
    // Test set method
  });
});

describe("MasterChef: Multiplier", function () {
  xit("Should to return an expected multiplier for given blocks range", async function () {
    // Test getMultiplier
  });
});

describe("MasterChef: Deposit", function () {
  it("As a user I should to deposit LP in a pool", async function () {
    //Create pool
    let date = new Date();
    const deadline = date.setTime(date.getTime() + 2 * 86400000); // +2 days

    /*console.log("BYEBYE");
    console.log((await tokenA.allowance(addr1.address, router.address)).toString());
    console.log((await weth.allowance(addr1.address, router.address)).toString());*/

    /*console.log("addr1.address");
    console.log(addr1.address);
    console.log("router.address");
    console.log(router.address);
    console.log("masterChef.address");
    console.log(masterChef.address);*/
    /*console.log("tokenA.address");
    console.log(tokenA.address);
    console.log("weth.address");
    console.log(weth.address);*/

    //TODO pendent canviar per addliquidityETH
    const result = await router.connect(addr1).addLiquidity(
        tokenA.address,
        weth.address,
        BigNumber.from(2).mul(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER),
        BigNumber.from(2).mul(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER),
        BigNumber.from(1).mul(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER),
        BigNumber.from(1).mul(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER),
        addr1.address,
        deadline
    );

    const pairAddress = await factory.getPair(tokenA.address, weth.address);
    const pairContract = await ethers.getContractFactory("Pair");
    const pair = await pairContract.attach(pairAddress);

    /*console.log("pairAddress.address");
    console.log(pairAddress.address);*/

    await masterChef.addPool(
        100,
        pairAddress,
        0,
        true,
        DAY_IN_SECONDS * 3,
        0,
        0,
        0,
        0
    );

    // Test deposit
    //console.log("BALANCE DEL PAIR");
    let balance = await pair.balanceOf(addr1.address);
    //console.log(balance.toString());

    await pair.connect(addr1).approve(masterChef.address, balance);

    //console.log((await pair.allowance(addr1.address, masterChef.address)).toString());
    //Addr1 fa dipòsit del 50% dels seus LPs a la pool 1.
    expect(await masterChef.connect(addr1).deposit(1,balance.div(2))).to.emit(masterChef, 'Deposit')
        .withArgs(addr1.address,
            1,
            balance.div(2));

    //console.log(await ethers.provider.getBlockNumber());

    //advanceBlock();
    //const blockNumAfter = await ethers.provider.getBlockNumber();
    //const blockAfter = await ethers.provider.getBlock(blockNumAfter);
    //console.log(await ethers.provider.getBlockNumber());
    expect(await nativeToken.balanceOf(addr1.address)).to.be.equal(0);
    //console.log((await nativeToken.balanceOf(addr1.address)).toString());
    //Un block més tard, Addr1 fa dipòsit de 0 tokens (= harvest).
    expect(await masterChef.connect(addr1).deposit(1,0)).to.emit(masterChef, 'Deposit')
        .withArgs(addr1.address,
            1,
            0);
    //await ethers.provider.send("evm_mine");
    //console.log((await nativeToken.balanceOf(addr1.address)).toString());
    //console.log((await masterChef.pendingNativeToken(1,addr1.address)).toString());
    //- Addr1  ha de rebre 40 tokens.
    //console.log((await masterChef.pendingNativeToken(1,addr1.address)).toString());
    //console.log((await nativeToken.balanceOf(addr1.address)).toString());
    expect(await nativeToken.balanceOf(addr1.address)).to.be.within(NATIVE_TOKEN_PER_BLOCK.mul(9900).div(10000),NATIVE_TOKEN_PER_BLOCK)

    //- Addr1 ha de tenir els LPs encara depositats.
    expect(((await masterChef.userInfo(1,addr1.address)).amount).toString()).to.equal(balance.div(2));

    //Addr1 fa dipòsit dels LPs a la pool 0:
    // - No pot.
    await expect(masterChef.connect(addr1).deposit(0,10)).to.be.revertedWith("deposit GLOBAL by staking");

    //Addr1 fa dipòsit dels LPs a la pool 2:
    // - No pot.
    await expect(masterChef.connect(addr1).deposit(2,10)).to.be.revertedWith("This pool does not exist yet");

    //Fem setPool i afegim un harvest lock-up de 1 hora.
    await masterChef.setPool(1,100,
        3600,
        true,
        DAY_IN_SECONDS * 3,
        0,
        0,
        0,
        0
    );

    expect(await masterChef.connect(addr1).deposit(1,0)).to.emit(masterChef, 'Deposit')
        .withArgs(addr1.address,
            1,
            0);

    const nativeTokenAmountBeforeLockup = await nativeToken.balanceOf(addr1.address);
    await ethers.provider.send("evm_mine");
    //Addr1 fa dipòsit 0 un block més tard, que és un claim rewards:
    //- L'usuari té una quantitat de rewards pendents de rebre però locked. // emit RewardLockedUp(msg.sender, _pid, pending);
    //console.log("ALERTA");
    expect(await masterChef.connect(addr1).deposit(1,0)).to.emit(masterChef, 'Deposit')
        .withArgs(addr1.address,
            1,
            0).and.to.emit(masterChef, 'RewardLockedUp');

    //- L'usuari NO reb cap token de rewards.
    expect(await nativeToken.balanceOf(addr1.address)).to.equal(nativeTokenAmountBeforeLockup);

    //- L'usuari encara té els seus LPs a dins.
    expect(((await masterChef.userInfo(1,addr1.address)).amount).toString()).to.equal(balance.div(2));

    //- L'usuari té una quantitat de rewards pendents de rebre però locked. // emit RewardLockedUp(msg.sender, _pid, pending);
    expect(await masterChef.pendingNativeToken(1,addr1.address)).to.be.within(NATIVE_TOKEN_PER_BLOCK.mul(2).mul(9900).div(10000),NATIVE_TOKEN_PER_BLOCK.mul(2));


    await ethers.provider.send('evm_increaseTime', [3610]);

    const pendingNativeTokensACobrar = await masterChef.pendingNativeToken(1,addr1.address);
    const originalNativeTokens = await nativeToken.balanceOf(addr1.address);
    //Addr1 fa dipòsit 0 una hora més tard, que és un claim rewards:
    expect(await masterChef.connect(addr1).deposit(1,0)).to.emit(masterChef, 'Deposit')
        .withArgs(addr1.address,1,0);

    //- L'usuari reb tots els tokens de rewards pendents.
    expect(await nativeToken.balanceOf(addr1.address)).to.be.within(pendingNativeTokensACobrar.add(originalNativeTokens),pendingNativeTokensACobrar.add(originalNativeTokens).add(NATIVE_TOKEN_PER_BLOCK));

    //- L'usuari encara té els seus LPs a dins.
    expect(((await masterChef.userInfo(1,addr1.address)).amount).toString()).to.equal(balance.div(2));

    await ethers.provider.send('evm_increaseTime', [7210]);

    //Addr1 fa emergency withdraw del pid 0 i 2 dos hores més tard:
    // - No pot.
    expect(await masterChef.emergencyWithdraw(0)).to.not.emit(masterChef, 'EmergencyWithdraw');;
    expect(await masterChef.emergencyWithdraw(2)).to.not.emit(masterChef, 'EmergencyWithdraw');;

    const lpsBeforeEmergencyWithdraw = (await masterChef.userInfo(1,addr1.address)).amount;
    //Addr1 fa emergency withdraw del pid 1 dos hores més tard:
    expect(await masterChef.connect(addr1).emergencyWithdraw(1)).to.emit(masterChef, 'EmergencyWithdraw')
        .withArgs(addr1.address,1,lpsBeforeEmergencyWithdraw,lpsBeforeEmergencyWithdraw);
    //- Addr1 reb els LPs que tenia depositats complets i se li posen totes les variables a 0.
    expect(await pair.balanceOf(addr1.address)).to.equal(balance);
    expect((await masterChef.userInfo(1,addr1.address)).amount).to.equal(0);

    //Addr1 fa emergency withdraw del pid 1 dos hores més tard:
    // - No pot, no passa res (no té LPs).
    expect(await masterChef.connect(addr1).emergencyWithdraw(1)).to.not.emit(masterChef, 'EmergencyWithdraw');

  });
});