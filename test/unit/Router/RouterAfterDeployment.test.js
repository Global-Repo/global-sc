const ethers = require("hardhat").ethers;
const { expect } = require("chai");
const { BigNumber } = require("@ethersproject/bignumber");

const TOKEN_DECIMALS = 18;
const BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER = BigNumber.from(10).pow(TOKEN_DECIMALS);
const NATIVE_TOKEN_PER_BLOCK = BigNumber.from(40).mul(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER);
const INITIAL_SUPPLY = BigNumber.from(100).mul(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER);

let startBlock;
let cakeToken;
let nativeToken;
let factory;
let weth;
let router;


let tokenA;
let tokenB;
let tokenC;
let tokenNotAdded;



beforeEach(async function () {
    [owner, lockedVault, keeper, addr3, ...addrs] = await ethers.getSigners();

    const CURRENT_BLOCK = await ethers.provider.getBlockNumber();
    startBlock = CURRENT_BLOCK + 1;

    //
    // set all elements
    //
    const NativeToken = await ethers.getContractFactory("NativeToken");
    nativeToken = await NativeToken.deploy();
    await nativeToken.deployed();

    const Weth = await ethers.getContractFactory("BEP20");
    weth = await Weth.deploy('Wrapped BNB', 'WBNB');
    await weth.deployed();

    const Factory = await ethers.getContractFactory("Factory");
    factory = await Factory.deploy(owner.address);
    await factory.deployed();

    const Router = await ethers.getContractFactory("Router");
    router = await Router.deploy(factory.address, weth.address);
    await router.deployed();


    //
    // set tokens to create factory pairs
    //
    const CakeToken = await ethers.getContractFactory("BEP20");
    cakeToken = await CakeToken.deploy('CakeToken', 'CAKE');
    await cakeToken.deployed();

    const TokenA = await ethers.getContractFactory("BEP20");
    tokenA = await TokenA.deploy('tokenA', 'AA');
    await tokenA.deployed();

    const TokenB = await ethers.getContractFactory("BEP20");
    tokenB = await TokenB.deploy('tokenB', 'BB');
    await tokenB.deployed();

    const TokenC = await ethers.getContractFactory("BEP20");
    tokenC = await TokenC.deploy('tokenC', 'CC');
    await tokenC.deployed();

    const TokenNotAdded = await ethers.getContractFactory("BEP20");
    tokenNotAdded = await TokenNotAdded.deploy('tokenC', 'CC');
    await tokenNotAdded.deployed();


    //
    // Set up scenarios
    //
    const INITIAL_SUPPLY = BigNumber.from(100).mul(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER);
    expect(await tokenA.totalSupply()).to.equal(0);
    expect(await tokenB.totalSupply()).to.equal(0);
    expect(await tokenC.totalSupply()).to.equal(0);

    await tokenA.mint(INITIAL_SUPPLY);
    await tokenB.mint(INITIAL_SUPPLY);
    await tokenC.mint(INITIAL_SUPPLY);
    //await tokenNotAdded.mint(INITIAL_SUPPLY);
    await tokenA.approve(router.address, INITIAL_SUPPLY.toHexString());
    await tokenB.approve(router.address, INITIAL_SUPPLY.toHexString());
    await tokenC.approve(router.address, INITIAL_SUPPLY.toHexString());
    //await tokenNotAdded.approve(router.address, INITIAL_SUPPLY.toHexString());

    await expect(factory.createPair(tokenA.address, tokenB.address)).to.emit(factory, 'PairCreated');
    await expect(factory.createPair(tokenB.address, tokenC.address)).to.emit(factory, 'PairCreated');
});

describe("Router: Basic Set-up", function () {

    it("Check total supplied tokens before creating factory pairs", async function () {
        expect(await tokenA.totalSupply()).to.equal(INITIAL_SUPPLY);
        expect(await tokenB.totalSupply()).to.equal(INITIAL_SUPPLY);
        expect(await tokenC.totalSupply()).to.equal(INITIAL_SUPPLY);
    });

});

describe("Router: Add liquidity to a new pair", function () {

    it("Add liquidity to a Pair", async function () {
        let date = new Date();
        const deadline = date.setTime(date.getTime() + 2 * 86400000); // +2 days

        await expect(router.addLiquidity(
            tokenA.address,
            tokenB.address,
            BigNumber.from(10).mul(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER),
            BigNumber.from(10).mul(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER),
            BigNumber.from(1).mul(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER),
            BigNumber.from(1).mul(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER),
            owner.address,
            deadline
        )).to.emit(router, 'AddedLiquidity')
            .withArgs(BigNumber.from(10).mul(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER),
                BigNumber.from(10).mul(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER),
                BigNumber.from(10).mul(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER).sub(1000));



        const pairAddress = await factory.getPair(tokenA.address, tokenB.address);

        console.log('hi')



        /*expect(await masterChef.poolLength()).to.equal(1);
        expect(poolInfo.allocPoint).to.equal(BigNumber.from(40).mul(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER));
        expect(poolInfo.lpToken).to.equal(pairAddress);
        expect(poolInfo.harvestInterval).to.equal(259200);
        expect(poolInfo.maxWithdrawalInterval).to.equal(259200);
        expect(poolInfo.withDrawalFeeOfLpsBurn).to.equal(50);
        expect(poolInfo.withDrawalFeeOfLpsTeam).to.equal(50);
        expect(poolInfo.performanceFeesOfNativeTokensBurn).to.equal(100);
        expect(poolInfo.performanceFeesOfNativeTokensToLockedVault).to.equal(100);
        */

        //check balances

    });

    it("Add liquidity to a non-existent Pair. Router should create it auto and perform normally.", async function () {
        let date = new Date();
        const deadline = date.setTime(date.getTime() + 2 * 86400000); // +2 days

        await router.addLiquidity(
            tokenA.address,
            tokenC.address,
            BigNumber.from(10).mul(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER),
            BigNumber.from(10).mul(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER),
            BigNumber.from(1).mul(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER),
            BigNumber.from(1).mul(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER),
            owner.address,
            deadline
        );

        //find the LP pair created
        console.log('Pair data, and token liquidity');
        const pairAddress = await factory.getPair(tokenA.address, tokenC.address);
        const pairContract = await ethers.getContractFactory("Pair");
        const pair = await pairContract.attach(pairAddress);
        console.log('pair address', pairAddress);

        //find balance owner
        const balance_owner = await pair.balanceOf(owner.address);
        console.log('balance_owner', balance_owner);

        //find balance random user
        const balance_random = await pair.balanceOf(addr3.address);
        console.log('balance_random', balance_random);

        //check pair reserves
        console.log('get reserves from the pair we just added liquidity to');
        const {0: reserves0, 1:reserves1, 2:reserves_timestamp} = await pair.getReserves();
        console.log('reserves0', reserves0.toString());
        console.log('reserves1', reserves1.toString());
        console.log('reserves_timestamp', reserves_timestamp);


        /*
        CHECK PAIR 2, no liquidity
         */
        const pairAddress2 = await factory.getPair(tokenA.address, tokenNotAdded.address);
        const pairContract2 = await ethers.getContractFactory("Pair");
        const pair2 = await pairContract2.attach(pairAddress2);
        console.log('pair2 address should be 0x0, because it has not been added from the factory. pair address is:', pairAddress2);
        //find balance owner
        /*const balance_owner2 = await pair2.balanceOf(owner.address);
        console.log('balance_owner2', balance_owner2);*/



        /*const a= await tokenA.balanceOf(pairAddress);
        console.log(a.toString());

        expect(await tokenA.balanceOf(pairAddress)).to.equal(BigNumber.from(1).mul(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER));
        expect(await tokenB.balanceOf(pairAddress)).to.equal(BigNumber.from(2).mul(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER));

        // Owner has LP pair tokens back
        /*const pairContract = await ethers.getContractFactory("Pair");
        const pair = await pairContract.attach(pairAddress);
        const balance = await pair.balanceOf(owner.address);

        expect(balance.toString()).to.not.equal(0);*/


    });

    it("Add liquidity with an outdated datetime stamp.", async function () {
        //test datetime stamp; 'PancakeRouter: EXPIRED'
    });

    it("Adding liquidity using a non approved token should break.", async function () {
        //test adding loquidity using a non approved token, check error 'TransferHelper: TRANSFER_FROM_FAILED'
    });

    it("Test amountAMin and amountBMin", async function () {
        //in _addLiquidity, check for messages 'PancakeRouter: INSUFFICIENT_B_AMOUNT', 'PancakeRouter: INSUFFICIENT_A_AMOUNT'
    });

    it("Change pair.devfeeto address and check that fees are sent the correct way", async function () {
    });

    it("Change factory fees to apply for swap and devefeenum and devefeedenum and check that fees are correctly calculated", async function () {
    });

    it("perform different liquidity adds and withdraws and check that everything works fine", async function () {
    });

});