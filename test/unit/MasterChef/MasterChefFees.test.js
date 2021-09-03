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

var afegirPool = async function (token0, token1)
{
    let date = new Date();
    const deadline = date.setTime(date.getTime() + 2 * 86400000); // +2 days

    await router.addLiquidity(
        token0.address,
        token1.address,
        BigNumber.from(10).mul(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER),
        BigNumber.from(10).mul(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER),
        BigNumber.from(1).mul(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER),
        BigNumber.from(1).mul(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER),
        owner.address,
        deadline
    );

    //add pool A-B
    await masterChef.addPool(
        BigNumber.from(40).mul(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER),
        await factory.getPair(token0.address, token1.address),
        DAY_IN_SECONDS * 3,
        false,
        DAY_IN_SECONDS * 3,
        50,
        50,
        100,
        100
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

    //add Global token (NativeToken)
    await tokenAddresses.addToken("GLOBAL", nativeToken.address);

    const PathFinder = await ethers.getContractFactory("PathFinder");
    pathFinder = await PathFinder.deploy(tokenAddresses.address);
    await pathFinder.deployed();

    const MasterChef = await ethers.getContractFactory("MasterChef");
    masterChef = await MasterChef.deploy(
        nativeToken.address,
        NATIVE_TOKEN_PER_BLOCK,
        startBlock,
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

    await tokenB.mint(INITIAL_SUPPLY);
    await tokenA.mint(INITIAL_SUPPLY);
    await weth.mint(INITIAL_SUPPLY);
    await nativeToken.mint(INITIAL_SUPPLY);

    await nativeToken.transferOwnership(masterChef.address);

    await tokenA.transfer(addr1.address,INITIAL_SUPPLY_ADDR1);
    await tokenB.transfer(addr1.address,INITIAL_SUPPLY_ADDR1);
    await nativeToken.transfer(addr1.address,INITIAL_SUPPLY_ADDR1);
    await weth.transfer(addr1.address,INITIAL_SUPPLY_ADDR1);

    await tokenA.approve(router.address, INITIAL_SUPPLY_OWNER.toHexString());
    await tokenB.approve(router.address, INITIAL_SUPPLY_OWNER.toHexString());
    await weth.approve(router.address, INITIAL_SUPPLY_OWNER.toHexString());
    await nativeToken.approve(router.address, INITIAL_SUPPLY_OWNER.toHexString());

    await tokenA.connect(addr1).approve(router.address, INITIAL_SUPPLY_ADDR1.toHexString());
    await weth.connect(addr1).approve(router.address, INITIAL_SUPPLY_ADDR1.toHexString());
    await tokenB.connect(addr1).approve(router.address, INITIAL_SUPPLY_ADDR1.toHexString());
    await nativeToken.connect(addr1).approve(router.address, INITIAL_SUPPLY_ADDR1.toHexString());

    tokenAddresses.addToken(tokenAddresses.BNB(), weth.address);
});


describe("MasterChef: Deposit", function () {

    it("Deposit + emergencywithdraw before _maxWithdrawalInterval (fees apply) ", async function () {
        //addr1 deposits token and weth in the router, and gets LPs
        let date = new Date();
        const deadline = date.setTime(date.getTime() + 2 * 86400000); // +2 days

        console.log("Eth (or BNB) addr", weth.address);

        //addr1 creates pool between nativeToken and weth
        //await router.connect(addr1).addLiquidity(
        //    weth.address,
        //    nativeToken.address,
        //    100000,
        //    100000,
        //    1000,
        //    1000,
        //    addr1.address,
        //    deadline
        //);
        await afegirPool(weth,nativeToken);

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
        console.log('pair.address', pair.address);
        await pair.connect(addr1).approve(masterChef.address, addr1_initial_balancepair.mul(2));
        //owner adds pool in masterchef

        let LPfees = 40; // 0.4% withdraw fee over the withdrawal if withdrawn before
        await masterChef.connect(owner).addPool(
            100,
            pair.address,
            DAY_IN_SECONDS,
            true,
            DAY_IN_SECONDS * 3,
            LPfees,
            LPfees,
            0,   // we are not going to use any of these fees, we are only checking the LPs deposit fees
            0    // we are not going to use any of these fees
        );

        // add LPS to pool 1
        // Addr1 fa dipòsit de 100000 LPs a la pool 1 tokena a weth
        let addr1_lp_pool_deposit = 1000000;
        expect(await masterChef.connect(addr1).deposit(2,addr1_lp_pool_deposit)).to.emit(masterChef, 'Deposit')
            .withArgs(addr1.address,
                2,
                addr1_lp_pool_deposit);
        addr1_balancepair = await pair.balanceOf(addr1.address);
        console.log('addr1 balancepair after deposit 100000 LPs into pool_', addr1_balancepair.toString());
        console.log('Lps depositats a masterchef pool 2 per addr1:', ((await masterChef.userInfo(2,
            addr1.address)).amount).toString());


        //After deposit, addr1 tries to remove the LPs.
        // But we need to apply some fees since the _harvestInterval has not passed yet...
        let addr1lp_fees = BigNumber.from(addr1_lp_pool_deposit).mul(LPfees).mul(2).div(10000);
        let addr1lp_balance_minus_fees = BigNumber.from(addr1_lp_pool_deposit).sub(addr1lp_fees);
        expect(await masterChef.connect(addr1).emergencyWithdraw(2)).to.emit(masterChef, 'EmergencyWithdraw')
            .withArgs(addr1.address, 2, addr1_lp_pool_deposit, addr1lp_balance_minus_fees);

        /*
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
        */

    });


});