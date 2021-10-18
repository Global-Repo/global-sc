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
let masterChefInternal;

var afegirPool = async function (token0, token1, liquidity, allocPointMCpool=1000,
                                 _harvestInterval = DAY_IN_SECONDS * 4,
                                 _maxWithdrawalInterval= DAY_IN_SECONDS * 3,
                                 _withDrawalFeeOfLps = 40,
                                 _performanceFeesOfNativeTokens = 100)
{
  let date = new Date();
  const deadline = date.setTime(date.getTime() + 2 * 86400000); // +2 days

  //Router create liquidity pool Router A-B
  await router.addLiquidity(
      token0.address,
      token1.address,
      liquidity,
      liquidity,
      BigNumber.from(liquidity).div(10),
      BigNumber.from(liquidity).div(10),
      owner.address,
      deadline
  );
  let pairaddr = await factory.getPair(token0.address, token1.address);
  const pairtkAweth = await (await ethers.getContractFactory("Pair")).attach(pairaddr) ;
  let owner_initial_balancepair = await pairtkAweth.balanceOf(owner.address);

  //MC add pool A-B
  await masterChef.addPool(
      allocPointMCpool,
      pairaddr,
      _harvestInterval,
      _maxWithdrawalInterval,
      _withDrawalFeeOfLps,
      _withDrawalFeeOfLps,
      _performanceFeesOfNativeTokens,
      _performanceFeesOfNativeTokens
  );
}

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

  await pathFinder.transferOwnership(masterChefInternal.address);

  // Set up scenarios
  const INITIAL_SUPPLY = BigNumber.from(1000000).mul(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER);
  const INITIAL_SUPPLY_ADDR1 = BigNumber.from(100).mul(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER);
  const INITIAL_SUPPLY_OWNER = BigNumber.from(999900).mul(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER);

  await tokenA.mint(INITIAL_SUPPLY);
  await tokenB.mint(INITIAL_SUPPLY);
  await weth.mint(INITIAL_SUPPLY);
  await nativeToken.mint(INITIAL_SUPPLY);

  await nativeToken.openTrading();
  await nativeToken.transferOwnership(masterChef.address);

  tokenA.transfer(addr1.address,INITIAL_SUPPLY_ADDR1);
  weth.transfer(addr1.address,INITIAL_SUPPLY_ADDR1);

  await tokenA.approve(router.address, INITIAL_SUPPLY_OWNER.toHexString());
  await tokenB.approve(router.address, INITIAL_SUPPLY_OWNER.toHexString());
  await weth.approve(router.address, INITIAL_SUPPLY_OWNER.toHexString());
  await nativeToken.approve(router.address, INITIAL_SUPPLY_OWNER.toHexString());

  await tokenA.connect(addr1).approve(router.address, INITIAL_SUPPLY_ADDR1.toHexString());
  await weth.connect(addr1).approve(router.address, INITIAL_SUPPLY_ADDR1.toHexString());

  await tokenAddresses.addToken(tokenAddresses.BNB(), weth.address);
  await tokenAddresses.addToken(tokenAddresses.GLOBAL(), nativeToken.address);
});

describe("MasterChef: Pools", function () {
  it("Non duplicated modifier in addPool", async function () {
    let date = new Date();
    const deadline = date.setTime(date.getTime() + 2 * 3600); // +2 hours

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

    await masterChef.addPool(100, pairAddress, DAY_IN_SECONDS * 3, DAY_IN_SECONDS * 3, 50, 50, 100, 100);
    await expect(masterChef.addPool(100, pairAddress, DAY_IN_SECONDS * 3, DAY_IN_SECONDS * 3, 50, 50, 100, 100))
        .to.be.revertedWith("nonDuplicated: duplicated");
  });

  it("Should to add a new liquidity provider (LP) pool", async function () {
    let date = new Date();
    const deadline = date.setTime(date.getTime() + 2 * 3600); // +2 hours

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
        DAY_IN_SECONDS * 3,
        50,
        50,
        100,
        100
    );

    const poolInfo = await masterChef.poolInfo(1);

    expect(await masterChef.poolLength()).to.equal(2);
    expect(poolInfo.allocPoint).to.equal(100);
    expect(poolInfo.lpToken).to.equal(pairAddress);
    expect(poolInfo.harvestInterval).to.equal(259200);
    expect(poolInfo.maxWithdrawalInterval).to.equal(259200);
    expect(poolInfo.withDrawalFeeOfLpsBurn).to.equal(50);
    expect(poolInfo.withDrawalFeeOfLpsTeam).to.equal(50);
    expect(poolInfo.performanceFeesOfNativeTokensBurn).to.equal(100);
    expect(poolInfo.performanceFeesOfNativeTokensToLockedVault).to.equal(100);
  });


  it("Should to update pool info properly (setpool)", async function () {
    let date = new Date();
    const deadline = date.setTime(date.getTime() + 2 * 86400000); // +2 days
    //Pool vars
    let allocPointMCpool=1000;
    let harvestInterval = DAY_IN_SECONDS * 4;
    let maxWithdrawalInterval= DAY_IN_SECONDS * 3;
    let withDrawalFeeOfLps = 40;
    let performanceFees = 100;

    await afegirPool(weth,
        tokenA,
        BigNumber.from(1).mul(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER),
        allocPointMCpool,
        harvestInterval,
        maxWithdrawalInterval,
        withDrawalFeeOfLps,
        performanceFees);

    await afegirPool(tokenB,
        tokenA,
        BigNumber.from(1).mul(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER),
        allocPointMCpool,
        harvestInterval,
        maxWithdrawalInterval,
        withDrawalFeeOfLps,
        performanceFees);

    const pair1Address = await factory.getPair(tokenA.address, weth.address);
    const pair1Contract = await ethers.getContractFactory("Pair");
    const pair1 = await pair1Contract.attach(pair1Address);
    const pair2Address = await factory.getPair(tokenA.address, tokenB.address);
    const pair2Contract = await ethers.getContractFactory("Pair");
    const pair2 = await pair2Contract.attach(pair2Address);

    expect(await masterChef.poolLength()).to.equal(3);
    const poolInfo = await masterChef.poolInfo(1);
    expect(poolInfo.allocPoint).to.equal(allocPointMCpool);
    expect(poolInfo.lpToken).to.equal(pair1.address);
    expect(poolInfo.harvestInterval).to.equal(harvestInterval);
    expect(poolInfo.maxWithdrawalInterval).to.equal(maxWithdrawalInterval);
    expect(poolInfo.withDrawalFeeOfLpsBurn).to.equal(withDrawalFeeOfLps);
    expect(poolInfo.withDrawalFeeOfLpsTeam).to.equal(withDrawalFeeOfLps);
    expect(poolInfo.performanceFeesOfNativeTokensBurn).to.equal(performanceFees);
    expect(poolInfo.performanceFeesOfNativeTokensToLockedVault).to.equal(performanceFees);
    const poolInfo2 = await masterChef.poolInfo(2);
    expect(poolInfo2.allocPoint).to.equal(allocPointMCpool);
    expect(poolInfo2.lpToken).to.equal(pair2.address);
    expect(poolInfo2.harvestInterval).to.equal(harvestInterval);
    expect(poolInfo2.maxWithdrawalInterval).to.equal(maxWithdrawalInterval);
    expect(poolInfo2.withDrawalFeeOfLpsBurn).to.equal(withDrawalFeeOfLps);
    expect(poolInfo2.withDrawalFeeOfLpsTeam).to.equal(withDrawalFeeOfLps);
    expect(poolInfo2.performanceFeesOfNativeTokensBurn).to.equal(performanceFees);
    expect(poolInfo2.performanceFeesOfNativeTokensToLockedVault).to.equal(performanceFees);

    let allocPointMCpool2 =1001;
    let harvestInterval2  = DAY_IN_SECONDS * 5;
    let maxWithdrawalInterval2 = DAY_IN_SECONDS * 4;
    let withDrawalFeeOfLps2  = 50;
    let performanceFees2  = 0;
    await masterChef.setPool(1,
        allocPointMCpool2,
        harvestInterval2,
        maxWithdrawalInterval2,
        withDrawalFeeOfLps2,
        withDrawalFeeOfLps2,
        performanceFees2,
        performanceFees2
    );
    const poolInfoNew = await masterChef.poolInfo(1);
    expect(poolInfoNew.allocPoint).to.equal(allocPointMCpool2);
    expect(poolInfoNew.lpToken).to.equal(pair1.address);
    expect(poolInfoNew.harvestInterval).to.equal(harvestInterval2);
    expect(poolInfoNew.maxWithdrawalInterval).to.equal(maxWithdrawalInterval2);
    expect(poolInfoNew.withDrawalFeeOfLpsBurn).to.equal(withDrawalFeeOfLps2);
    expect(poolInfoNew.withDrawalFeeOfLpsTeam).to.equal(withDrawalFeeOfLps2);
    expect(poolInfoNew.performanceFeesOfNativeTokensBurn).to.equal(performanceFees2);
    expect(poolInfoNew.performanceFeesOfNativeTokensToLockedVault).to.equal(performanceFees2);
    const poolInfo2new = await masterChef.poolInfo(2);
    expect(poolInfo2new.allocPoint).to.equal(allocPointMCpool);
    expect(poolInfo2new.lpToken).to.equal(pair2.address);
    expect(poolInfo2new.harvestInterval).to.equal(harvestInterval);
    expect(poolInfo2new.maxWithdrawalInterval).to.equal(maxWithdrawalInterval);
    expect(poolInfo2new.withDrawalFeeOfLpsBurn).to.equal(withDrawalFeeOfLps);
    expect(poolInfo2new.withDrawalFeeOfLpsTeam).to.equal(withDrawalFeeOfLps);
    expect(poolInfo2new.performanceFeesOfNativeTokensBurn).to.equal(performanceFees);
    expect(poolInfo2new.performanceFeesOfNativeTokensToLockedVault).to.equal(performanceFees);
    const poolInfo0 = await masterChef.poolInfo(0);
    expect(poolInfo0.allocPoint).to.equal(0);
    expect(poolInfo0.lpToken).to.equal(nativeToken.address);
    expect(poolInfo0.harvestInterval).to.equal(0);
    expect(poolInfo0.maxWithdrawalInterval).to.equal(0);
    expect(poolInfo0.withDrawalFeeOfLpsBurn).to.equal(0);
    expect(poolInfo0.withDrawalFeeOfLpsTeam).to.equal(0);
    expect(poolInfo0.performanceFeesOfNativeTokensBurn).to.equal(0);
    expect(poolInfo0.performanceFeesOfNativeTokensToLockedVault).to.equal(0);
  });


  xit("Should to return an expected multiplier for given blocks range", async function () {
    // Test getMultiplier
  });

  it("Should be able to add a pool (check requires). Checks CheckRouterTokens as well.", async function () {

    let date = new Date();
    const deadline = date.setTime(date.getTime() + 2 * 3600); // +2 hours

    // Test addPool
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

    //original
    //await expect(masterChef.addPool(100, pairAddress, 0, true, DAY_IN_SECONDS * 3,
    //    0, 0, 0, 0
    //)).to.be.revertedWith("[f] Add: invalid harvest interval");

    //  require(_harvestInterval <= MAX_INTERVAL, "[f] Add: invalid harvest interval");
    await expect(masterChef.addPool(100, pairAddress, (await masterChef.MAX_INTERVAL())+1, DAY_IN_SECONDS * 3,
        0, 0, 0, 0
    )).to.be.revertedWith("[f] Add: invalid harvest interval");

    //require(_maxWithdrawalInterval <= MAX_INTERVAL, "[f] Add: invalid withdrawal interval. Owner, there is a limit! Check your numbers.");
    await expect(masterChef.addPool(100, pairAddress, 0, (await masterChef.MAX_INTERVAL())+1,
        0, 0, 0, 0
    )).to.be.revertedWith("[f] Add: invalid withdrawal interval. Owner, there is a limit! Check your numbers.");

    //require(_withDrawalFeeOfLpsTeam.add(_withDrawalFeeOfLpsBurn) <= MAX_FEE_LPS, "[f] Add: invalid withdrawal fees. Owner, you are trying to charge way too much! Check your numbers.");
    await expect(masterChef.addPool(100, pairAddress, 0, DAY_IN_SECONDS * 3,
        (await masterChef.MAX_FEE_LPS())/2, (await masterChef.MAX_FEE_LPS())/2+1, 0, 0
    )).to.be.revertedWith("[f] Add: invalid withdrawal fees. Owner, you are trying to charge way too much! Check your numbers.");

    //require(_performanceFeesOfNativeTokensBurn.add(_performanceFeesOfNativeTokensToLockedVault) <= MAX_FEE_PERFORMANCE, "[f] Add: invalid performance fees. Owner, you are trying to charge way too much! Check your numbers.");
    await expect(masterChef.addPool(100, pairAddress, 0, DAY_IN_SECONDS * 3,
        0, 0, (await masterChef.MAX_FEE_PERFORMANCE())/2, (await masterChef.MAX_FEE_PERFORMANCE())/2+1
    )).to.be.revertedWith("[f] Add: invalid performance fees. Owner, you are trying to charge way too much! Check your numbers.");

    const INITIAL_SUPPLY_ADDR1 = BigNumber.from(100).mul(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER);
    const INITIAL_SUPPLY_OWNER = BigNumber.from(999900).mul(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER);

    nativeToken.transfer(addr1.address,INITIAL_SUPPLY_ADDR1);
    nativeToken.approve(router.address, INITIAL_SUPPLY_OWNER.toHexString());
    nativeToken.connect(addr1).approve(router.address, INITIAL_SUPPLY_ADDR1.toHexString());

    await router.addLiquidity(
        tokenA.address,
        nativeToken.address,
        BigNumber.from(10).mul(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER),
        BigNumber.from(10).mul(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER),
        BigNumber.from(1).mul(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER),
        BigNumber.from(1).mul(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER),
        owner.address,
        deadline
    );
    const pairAddress2 = await factory.getPair(tokenA.address, nativeToken.address);

    //require(CheckTokensRoutes(_lpToken), "[f] Add: token/s not connected to WBNB");
    await expect(masterChef.addPool(100, pairAddress2, 0, DAY_IN_SECONDS * 3,
        0, 0, 0, 0
    )).to.be.revertedWith("[f] Add: token/s not connected to WBNB");

    //now addr1 adds another pool in Router with path to weth
    await router.connect(addr1).addLiquidity(
        tokenA.address,
        weth.address,
        BigNumber.from(1).mul(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER),
        BigNumber.from(1).mul(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER),
        BigNumber.from(1).mul(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER),
        BigNumber.from(1).mul(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER),
        owner.address,
        deadline
    );
    const pairAddress3 = await factory.getPair(tokenA.address, weth.address);
    const pairContract3 = await ethers.getContractFactory("Pair");
    const pair3 = await pairContract3.attach(pairAddress3);

    //afegim la nova pool de weth a tokena
    await masterChef.connect(owner).addPool(
        100,
        pair3.address,
        0,
        DAY_IN_SECONDS * 3,
        0,
        0,
        0,
        0
    );
    expect (await masterChef.poolLength()).to.equal(2);

    //ara amb la nove pool hauriem de tenir path fins a weth
    await masterChef.addPool(100, pairAddress2, 0, DAY_IN_SECONDS * 3,
        0, 0, 0, 0
    );
    expect (await masterChef.poolLength()).to.equal(3);

  });

  it("Should be able to edit a pool (check requires)", async function () {

    let date = new Date();
    const deadline = date.setTime(date.getTime() + 2 * 3600); // +2 hours

    // Test addPool
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
    await masterChef.addPool(
        100,
        pairAddress,
        0,
        DAY_IN_SECONDS * 3,
        0,
        0,
        0,
        0
    );

    //require(_harvestInterval <= MAX_INTERVAL, "[f] Set: invalid harvest interval");
    await expect(masterChef.setPool(1, 100, (await masterChef.MAX_INTERVAL())+1, DAY_IN_SECONDS * 3,
        0, 0, 0, 0
    )).to.be.revertedWith("[f] Set: invalid harvest interval");

    //require(_maxWithdrawalInterval <= MAX_INTERVAL, "[f] Set: invalid withdrawal interval. Owner, there is a limit! Check your numbers.");
    await expect(masterChef.setPool(1, 100, 0, (await masterChef.MAX_INTERVAL())+1,
        0, 0, 0, 0
    )).to.be.revertedWith("[f] Set: invalid withdrawal interval. Owner, there is a limit! Check your numbers.");

    //require(_withDrawalFeeOfLpsTeam.add(_withDrawalFeeOfLpsBurn) <= MAX_FEE_LPS, "[f] Set: invalid withdrawal fees. Owner, you are trying to charge way too much! Check your numbers.");
    await expect(masterChef.setPool(1, 100, 0, DAY_IN_SECONDS * 3,
        (await masterChef.MAX_FEE_LPS())/2, (await masterChef.MAX_FEE_LPS())/2+1, 0, 0
    )).to.be.revertedWith("[f] Set: invalid withdrawal fees. Owner, you are trying to charge way too much! Check your numbers.");

    //require(_performanceFeesOfNativeTokensBurn.add(_performanceFeesOfNativeTokensToLockedVault) <= MAX_FEE_PERFORMANCE, "[f] Set: invalid performance fees. Owner, you are trying to charge way too much! Check your numbers.");
    await expect(masterChef.setPool(1, 100, 0, DAY_IN_SECONDS * 3,
        0, 0, (await masterChef.MAX_FEE_PERFORMANCE())/2, (await masterChef.MAX_FEE_PERFORMANCE())/2+1
    )).to.be.revertedWith("[f] Set: invalid performance fees. Owner, you are trying to charge way too much! Check your numbers.");
  });

  it("Various tests", async function () {

    let date = new Date();
    const deadline = date.setTime(date.getTime() + 2 * 3600); // +2 hours

    // Test addPool
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
    //que només el owner pugui afegir pools
    await expect(masterChef.connect(addr1).addPool(
        100,
        pairAddress,
        0,
        DAY_IN_SECONDS * 3,
        0,
        0,
        0,
        0
    )).to.be.revertedWith("Ownable: caller is not the owner");

    //QUI ÉS EL DEVPOWER?
    expect (await masterChef.transferDevPower(addr1.address));
    expect(await masterChef.GetDevPowerAddress()).to.equal(addr1.address);
    //console.log((await masterChef.GetDevPowerAddress()).toString());

    expect (await masterChef.connect(addr1).isSAFU()).to.equal(true);
    //Que la variable safu es pot modificar pel devpower.
    expect (await masterChef.connect(addr1).setSAFU(false));
    expect (await masterChef.connect(addr1).isSAFU()).to.equal(false);
    //comprovar que el nou devpower té poders i el que hi havia abans NO.
    await expect(masterChef.setSAFU(true)).to.be.revertedWith("DevPower: caller is not the dev with powers");;
    expect (await masterChef.connect(addr1).isSAFU()).to.equal(false);

    //Que la variable safu es pot modificar pel devpower.
    //TODO

  });
});



describe("MasterChef: Deposit", function () {

  it("Create 2 LP pools in Router, set up poold in MAsterchef and test with deposits from different users/qtys", async function () {
    let date = new Date();
    const deadline = date.setTime(date.getTime() + 2 * 86400000); // +2 days

    await tokenA.connect(addr1).approve(router.address, 10000000000);
    await tokenB.connect(addr1).approve(router.address, 10000000000);
    await weth.connect(addr1).approve(router.address, 10000000000);
    await tokenA.connect(owner).mint(1000000);
    await tokenB.connect(owner).mint(1000000);
    await weth.connect(owner).mint(1000000);
    await tokenA.connect(owner).transfer(addr1.address, 1000000 );
    await tokenB.connect(owner).transfer(addr1.address, 1000000 );
    await weth.connect(owner).transfer(addr1.address, 1000000 );
    let addr1_initial_weth_balance = await weth.balanceOf(addr1.address);
    let addr1_initial_b_balance = await tokenB.balanceOf(addr1.address);
    let addr1_initial_a_balance = await tokenA.balanceOf(addr1.address);
    console.log('addr1_initial_native_balance',addr1_initial_weth_balance.toString());
    console.log('addr1_initial_b_balance'     ,addr1_initial_b_balance.toString());
    console.log('addr1_initial_a_balance'     ,addr1_initial_a_balance.toString());

    //create pool between tokenA and weth
    await router.connect(addr1).addLiquidity(
        tokenB.address,
        weth.address,
        100000,
        100000,
        100,
        100,
        addr1.address,
        deadline
    );
    const pairAddressA = await factory.getPair(tokenB.address, weth.address);
    const pairContractA = await ethers.getContractFactory("Pair");
    const pairA = await pairContractA.attach(pairAddressA);
    await pairA.connect(addr1).approve(router.address, 10000000000);
    let addr1_pairA_balance = await pairA.balanceOf(addr1.address);
    console.log('addr1_pairA_balance', addr1_pairA_balance.toString());

    await router.connect(addr1).addLiquidity(
        tokenA.address,
        weth.address,
        100000,
        100000,
        100,
        100,
        addr1.address,
        deadline
    );
    const pairAddressB = await factory.getPair(tokenA.address, weth.address);
    const pairContractB = await ethers.getContractFactory("Pair");
    const pairB = await pairContractB.attach(pairAddressB);
    await pairB.connect(addr1).approve(router.address, 10000000000);
    let addr1_pairB_balance = await pairB.balanceOf(addr1.address);
    console.log('addr1_pairB_balance', addr1_pairB_balance.toString());

    //add pools to masterchef
    await masterChef.addPool(
        100,
        pairA.address,
        0,
        DAY_IN_SECONDS * 3,
        0,
        0,
        0,
        0
    );
    await masterChef.addPool(
        100,
        pairB.address,
        0,
        DAY_IN_SECONDS * 3,
        0,
        0,
        0,
        0
    );
    console.log((await masterChef.poolLength()).toString());

    //get masterchefs approve
    await pairA.connect(addr1).approve(masterChef.address, 10000000);
    await pairB.connect(addr1).approve(masterChef.address, 10000000);
    // Addr1 fa dipòsit del 50% dels seus LPs a la pool 1.
    expect(await masterChef.connect(addr1).deposit(1,999)).to.emit(masterChef, 'Deposit')
        .withArgs(addr1.address,1,999);
    expect(await masterChef.connect(addr1).deposit(2,9999)).to.emit(masterChef, 'Deposit')
        .withArgs(addr1.address,2,9999);
    //el owner no te pairs, then gets reverted
    await expect(masterChef.connect(owner).deposit(1,999)).to.be.revertedWith('SafeMath: subtraction overflow');
    //lets add more LPs, this gets reverted because we don't have that many
    await expect(masterChef.connect(addr1).deposit(1,9999999)).to.be.revertedWith('SafeMath: subtraction overflow');
  });

  it("Deposit + emergencywithdraw after _maxWithdrawalInterval (no fees apply) ", async function () {
    //addr1 deposits token and weth in the router, and gets LPs
    let date = new Date();
    const deadline = date.setTime(date.getTime() + 2 * 86400000); // +2 days

    //addr1 creates pool between tokenA and weth, approve balance pair from masterchef
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
    let addr1_initial_balancepair = await pair.balanceOf(addr1.address);
    console.log('addr1 balancepair', addr1_initial_balancepair.toString());
    await pair.connect(addr1).approve(masterChef.address, addr1_initial_balancepair.mul(2));

    //owner adds pool in masterchef
    await masterChef.connect(owner).addPool(
        100,
        pair.address,
        DAY_IN_SECONDS,       //harvestinterval, cada quant pots fer claim rewards. Si no ha passat el harvest interval no pots fer claim
        DAY_IN_SECONDS * 3,   //abans de tres dies cobraras fees sobre el diposit, a partir de 3 dies cobres fees sobre els rewards
        40, //a: sobre 10000
        40, //b: sobre 10000
        40, //aquestes fees son sobre els rewards per fer el native token burn si fa més de DAY_IN_SECONDS * 3
        40  //aquestes fees son sobre els rewards obtinguts si fa més de DAY_IN_SECONDS * 3
    );

    // add LPS to pool 1
    // Addr1 fa dipòsit de 100000 LPs a la pool 1.
    expect(await masterChef.connect(addr1).deposit(1,100000)).to.emit(masterChef, 'Deposit')
        .withArgs(addr1.address,
            1,
            100000);
    addr1_balancepair = await pair.balanceOf(addr1.address);
    console.log('addr1 balancepair after deposit 100000 LPs into pool', addr1_balancepair.toString());
    console.log('Lps depositats a masterchef per addr1', ((await masterChef.userInfo(1,addr1.address)).amount).toString());

    //passen (DAY_IN_SECONDS*3)+1 s, i el addr1 vol retirar la pasta
    await ethers.provider.send('evm_increaseTime', [(DAY_IN_SECONDS * 3)+1]);
    expect(await masterChef.connect(addr1).emergencyWithdraw(1)).to.emit(masterChef, 'EmergencyWithdraw')
        .withArgs(addr1.address,1,100000,100000);

    // Addr1 removes all LPS without fees using the emergency withdraw, all good!
    addr1_balancepair = await pair.balanceOf(addr1.address);
    console.log('addr1 balancepair after emergencywithdraw dels 100000 LPs de la pool:', addr1_balancepair.toString());
    console.log('Lps depositats a masterchef per addr1 despres del withdraw de 100000LPs:', ((await masterChef.userInfo(1,addr1.address)).amount).toString());

    expect(await pair.balanceOf(addr1.address)).to.equal(addr1_initial_balancepair);
    expect((await masterChef.userInfo(1,addr1.address)).amount).to.equal(0);
    expect((await masterChef.userInfo(1,addr1.address)).rewardDebt).to.equal(0);
    expect((await masterChef.userInfo(1,addr1.address)).rewardLockedUp).to.equal(0);
    expect((await masterChef.userInfo(1,addr1.address)).nextHarvestUntil).to.equal(0);
    expect((await masterChef.userInfo(1,addr1.address)).withdrawalOrPerformanceFees).to.equal(0);
  });


  it("Deposit + emergencywithdraw before _maxWithdrawalInterval with SAFU false (no fees apply) ", async function () {
    //addr1 deposits token and weth in the router, and gets LPs
    let date = new Date();
    const deadline = date.setTime(date.getTime() + 2 * 86400000); // +2 days

    //addr1 creates pool between tokenA and weth, approve balance pair from masterchef
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
    let addr1_initial_balancepair = await pair.balanceOf(addr1.address);
    console.log('addr1 balancepair', addr1_initial_balancepair.toString());
    await pair.connect(addr1).approve(masterChef.address, addr1_initial_balancepair.mul(2));

    //owner adds pool in masterchef
    await masterChef.connect(owner).addPool(
        100,
        pair.address,
        DAY_IN_SECONDS,
        DAY_IN_SECONDS * 3,
        40,
        40,
        40,
        40
    );

    // add LPS to pool 1
    // Addr1 fa dipòsit de 100000 LPs a la pool 1.
    expect(await masterChef.connect(addr1).deposit(1,100000)).to.emit(masterChef, 'Deposit')
        .withArgs(addr1.address,
            1,
            100000);
    addr1_balancepair = await pair.balanceOf(addr1.address);
    console.log('addr1 balancepair after deposit 100000 LPs into pool', addr1_balancepair.toString());
    console.log('Lps depositats a masterchef per addr1', ((await masterChef.userInfo(1,addr1.address)).amount).toString());

    //Owner sets safu to false, everyone should be able to remove everything without paying fees
    masterChef.setSAFU(false);
    expect(await masterChef.connect(addr1).emergencyWithdraw(1)).to.emit(masterChef, 'EmergencyWithdraw')
        .withArgs(addr1.address,1,100000,100000);

    // Addr1 removes all LPS without fees using the emergency withdraw, all good!
    addr1_balancepair = await pair.balanceOf(addr1.address);
    console.log('addr1 balancepair after emergencywithdraw dels 100000 LPs de la pool:', addr1_balancepair.toString());
    console.log('Lps depositats a masterchef per addr1 despres del withdraw de 100000LPs:', ((await masterChef.userInfo(1,addr1.address)).amount).toString());
    expect(await pair.balanceOf(addr1.address)).to.equal(addr1_initial_balancepair);
    expect(await pair.balanceOf(addr1.address)).to.equal(addr1_initial_balancepair);
    expect((await masterChef.userInfo(1,addr1.address)).amount).to.equal(0);
    expect((await masterChef.userInfo(1,addr1.address)).rewardDebt).to.equal(0);
    expect((await masterChef.userInfo(1,addr1.address)).rewardLockedUp).to.equal(0);
    expect((await masterChef.userInfo(1,addr1.address)).nextHarvestUntil).to.equal(0);
    expect((await masterChef.userInfo(1,addr1.address)).withdrawalOrPerformanceFees).to.equal(0);
  });


  it("Deposit + emergencywithdraw before _maxWithdrawalInterval (fees apply) ", async function () {
    //addr1 deposits token and weth in the router, and gets LPs
    let date = new Date();
    const deadline = date.setTime(date.getTime() + 2 * 86400000); // +2 days

    //addr1 creates pool between tokenA and weth, approve balance pair from masterchef
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
    let addr1_initial_balancepair = await pair.balanceOf(addr1.address);
    console.log('addr1 balancepair', addr1_initial_balancepair.toString());
    await pair.connect(addr1).approve(masterChef.address, addr1_initial_balancepair.mul(2));

    //owner adds pool in masterchef
    let LPfees = 40; // 0.4% withdraw fee over the withdrawal if withdrawn before
    await masterChef.connect(owner).addPool(
        100,
        pair.address,
        DAY_IN_SECONDS,
        DAY_IN_SECONDS * 3,
        LPfees,
        LPfees,
        0,   // we are not going to use any of these fees, we are only checking the LPs deposit fees
        0    // we are not going to use any of these fees
    );

    await afegirPool(weth,
        nativeToken,
        BigNumber.from(1).mul(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER),
        100,
        DAY_IN_SECONDS * 4,
        DAY_IN_SECONDS * 3,
        0,
        0);

    // add LPS to pool 1
    // Addr1 fa dipòsit de 100000 LPs a la pool 1.
    let addr1_lp_pool_deposit = 1000000;
    expect(await masterChef.connect(addr1).deposit(1,addr1_lp_pool_deposit)).to.emit(masterChef, 'Deposit')
        .withArgs(addr1.address,
            1,
            addr1_lp_pool_deposit);
    addr1_balancepair = await pair.balanceOf(addr1.address);
    console.log('addr1 balancepair after deposit 1000000 LPs into pool:', addr1_balancepair.toString());
    console.log('Lps depositats a masterchef per addr1:', ((await masterChef.userInfo(1,addr1.address)).amount).toString());


    //After deposit, addr1 tries to remove the LPs. But we need to apply some fees since the _harvestInterval has not passed yet...
    let addr1lp_fees = BigNumber.from(addr1_lp_pool_deposit).mul(LPfees).mul(2).div(10000);
    let addr1lp_balance_minus_fees = BigNumber.from(addr1_lp_pool_deposit).sub(addr1lp_fees);

    //expect(await masterChef.connect(addr1).emergencyWithdraw(1)).to.emit(masterChef, 'EmergencyWithdraw');
    expect(await masterChef.connect(addr1).emergencyWithdraw(1)).to.emit(masterChef, 'EmergencyWithdraw')
        .withArgs(addr1.address, 1, addr1_lp_pool_deposit, addr1lp_balance_minus_fees);
    console.log("addr1_lp_pool_deposit: ", addr1_lp_pool_deposit);
    console.log("addr1lp_balance_minus_fees: ", addr1lp_balance_minus_fees.toString());
    console.log("LPsOfTreasury: ", (await pair.balanceOf(owner.address)).toString());

    // Addr1 removes the LPs inside the pool with the emergency withdraw.
    // Since fees in the MC were 40, 40, we apply a 0.8% fees over the total deposited

    addr1_balancepair = await pair.balanceOf(addr1.address);
    console.log('addr1 balancepair after emergencywithdraw dels 1000000 LPs de la pool:', addr1_balancepair.toString());
    console.log('Lps deposited in MC per addr1 after withdraw of 1000000 LPs:', ((await masterChef.userInfo(1,addr1.address)).amount).toString());
    expect(await pair.balanceOf(addr1.address)).to.equal( addr1_initial_balancepair.sub( addr1lp_fees ) );
    expect((await masterChef.userInfo(1,addr1.address)).amount).to.equal(0);
    expect((await masterChef.userInfo(1,addr1.address)).rewardDebt).to.equal(0);
    expect((await masterChef.userInfo(1,addr1.address)).rewardLockedUp).to.equal(0);
    expect((await masterChef.userInfo(1,addr1.address)).nextHarvestUntil).to.equal(0);
    expect((await masterChef.userInfo(1,addr1.address)).withdrawalOrPerformanceFees).to.equal(0);


  });


  it("get LPs from router, create pool MC, deposit LPs, emergency withdraw before deadline (fees set to 0).", async function () {
    //addr1 deposits token and weth in the router, and gets LPs
    let date = new Date();
    const deadline = date.setTime(date.getTime() + 2 * 86400000); // +2 days

    //addr1 creates pool between tokenA and weth, approve balance pair from masterchef
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
    let addr1_initial_balancepair = await pair.balanceOf(addr1.address);
    console.log('addr1 balancepair', addr1_initial_balancepair.toString());
    await pair.connect(addr1).approve(masterChef.address, addr1_initial_balancepair.mul(2));

    //owner adds pool in masterchef
    let LPfees = 0; // 0.4% withdraw fee over the withdrawal if withdrawn before
    await masterChef.connect(owner).addPool(
        100,
        pair.address,
        DAY_IN_SECONDS,
        DAY_IN_SECONDS * 3,
        LPfees,
        LPfees,
        0,   // we are not going to use any of these fees, we are only checking the LPs deposit fees
        0    // we are not going to use any of these fees
    );

    // add LPS to pool 1
    // Addr1 fa dipòsit de 100000 LPs a la pool 1.
    let addr1_lp_pool_deposit = 1000000;
    expect(await masterChef.connect(addr1).deposit(1,addr1_lp_pool_deposit)).to.emit(masterChef, 'Deposit')
        .withArgs(addr1.address,
            1,
            addr1_lp_pool_deposit);
    addr1_balancepair = await pair.balanceOf(addr1.address);
    console.log('addr1 balancepair after deposit 100000 LPs into pool', addr1_balancepair.toString());
    console.log('Lps depositats a masterchef per addr1', ((await masterChef.userInfo(1,addr1.address)).amount).toString());

    //After deposit, addr1 tries to remove the LPs. But we need to apply some fees since the _harvestInterval has not passed yet...
    let addr1lp_fees = BigNumber.from(addr1_lp_pool_deposit).mul(LPfees).mul(2).div(10000);
    let addr1lp_balance_minus_fees = BigNumber.from(addr1_lp_pool_deposit).sub(addr1lp_fees);
    expect(await masterChef.connect(addr1).emergencyWithdraw(1)).to.emit(masterChef, 'EmergencyWithdraw')
        .withArgs(addr1.address,1,addr1lp_balance_minus_fees,addr1lp_balance_minus_fees);

    // Addr1 removes the LPs inside the pool with the emergency withdraw.
    // Since fees in the MC were 40, 40, we apply a 0.8% fees over the total deposited
    addr1_balancepair = await pair.balanceOf(addr1.address);
    console.log('addr1 balancepair after emergencywithdraw dels 100000 LPs de la pool:', addr1_balancepair.toString());
    console.log('Lps deposited in MC per addr1 after withdraw of 100000LPs:', ((await masterChef.userInfo(1,addr1.address)).amount).toString());
    expect(await pair.balanceOf(addr1.address)).to.equal( addr1_initial_balancepair.sub( addr1lp_fees ) );
    expect((await masterChef.userInfo(1,addr1.address)).amount).to.equal(0);
    expect((await masterChef.userInfo(1,addr1.address)).rewardDebt).to.equal(0);
    expect((await masterChef.userInfo(1,addr1.address)).rewardLockedUp).to.equal(0);
    expect((await masterChef.userInfo(1,addr1.address)).nextHarvestUntil).to.equal(0);
    expect((await masterChef.userInfo(1,addr1.address)).withdrawalOrPerformanceFees).to.equal(0);
  });









  it("As a user I should be able to deposit LP in a pool + withdraw", async function () {
    let date = new Date();
    const deadline = date.setTime(date.getTime() + 2 * 86400000); // +2 days

    //create pool between tokenA and weth
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

    //add pool in masterchef
    await masterChef.connect(owner).addPool(
        100,
        pairAddress,
        0,    //harvestinterval, cada quant pots fer claim rewards. Si no ha passat el harvest interval no pots fer claim
        DAY_IN_SECONDS * 3,   //abans de tres dies cobraras fees sobre el diposit, a partir de 3 dies cobres fees sobre els rewards
        0, //a: sobre 10000
        0, //b: sobre 10000
        0, //aquestes fees son sobre els rewards per fer el native token burn si fa més de DAY_IN_SECONDS * 3
        0  //aquestes fees son sobre els rewards obtinguts si fa més de DAY_IN_SECONDS * 3
    );
    let balancepair = await pair.balanceOf(addr1.address);
    console.log('addr1 balancepair', balancepair.toString());
    await pair.connect(addr1).approve(masterChef.address, balancepair);

    //
    // Addr1 fa dipòsit del 50% dels seus LPs a la pool 1.
    //
    expect(await masterChef.connect(addr1).deposit(1,balancepair.div(2))).to.emit(masterChef, 'Deposit')
        .withArgs(addr1.address,
            1,
            balancepair.div(2));

    //addr1 té els lps dipositats
    expect(((await masterChef.userInfo(1,addr1.address)).amount).toString()).to.equal(balancepair.div(2));
    balancepair = await pair.balanceOf(addr1.address);
    console.log('Lps addr1 balancepair', balancepair.toString());
    console.log('Lps depositats a masterchef per addr1', ((await masterChef.userInfo(1,addr1.address)).amount).toString());

    //TODO HERE.
  });


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
    await masterChef.setPool(1,
        100,
        3600,
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


    //Addr1 fa emergency withdraw del pid 0 i 2,3 dos hores més tard:
    // - No pot.
    expect(await masterChef.emergencyWithdraw(0)).to.not.emit(masterChef, 'EmergencyWithdraw');
    expect(await masterChef.emergencyWithdraw(2)).to.not.emit(masterChef, 'EmergencyWithdraw');

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
    //expect(await masterChef.connect(addr1).emergencyWithdraw()).to.not.emit(masterChef, 'EmergencyWithdraw');
    //await masterChef.connect(addr1).emergencyWithdraw(0);

  });


  it("Should not let update pool with id 0. test MCC-02", async function () {
    //calling updatePool should usually increase the lastRewardBlock, as per line:
    //     >>pool.lastRewardBlock = block.number;
    // except for pool 0, which in this case returns in newly added if
    //     >>if (_pid == 0) return;
    let date = new Date();
    const deadline = date.setTime(date.getTime() + 2 * 3600); // +2 hours

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
        DAY_IN_SECONDS * 3,
        50,
        50,
        100,
        100
    );

    masterChef.updatePool(1);
    const blockinitial1 = (await masterChef.poolInfo(1)).lastRewardBlock;
    await ethers.provider.send("evm_mine");
    masterChef.updatePool(1);
    const blockfinal1 = (await masterChef.poolInfo(1)).lastRewardBlock;
    expect( Number(blockfinal1) ).to.be.greaterThan( Number(blockinitial1) );

    const blockinitial0 = (await masterChef.poolInfo(0)).lastRewardBlock;
    await ethers.provider.send("evm_mine");
    masterChef.updatePool(0);
    const blockfinal0 = (await masterChef.poolInfo(0)).lastRewardBlock;
    expect( Number(blockinitial0) ).to.be.equal( Number(blockfinal0) );
  });
});