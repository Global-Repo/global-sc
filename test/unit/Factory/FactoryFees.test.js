const ethers = require("hardhat").ethers;
const { expect } = require("chai");
const {BigNumber} = require("@ethersproject/bignumber");

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

const INITIAL_SUPPLY = BigNumber.from(100000000).mul(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER);
//const INITIAL_SUPPLY_ADDR1 = BigNumber.from(100000).mul(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER);
const INITIAL_SUPPLY_ADDR1 = BigNumber.from(1).mul(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER);
//const INITIAL_SUPPLY_OWNER = BigNumber.from(99900000).mul(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER);
const INITIAL_SUPPLY_OWNER = BigNumber.from(99999999).mul(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER);

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
    masterChefInternal = await MasterChefInternal.deploy(tokenAddresses.address);
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

    await tokenA.mint(INITIAL_SUPPLY);
    await tokenB.mint(INITIAL_SUPPLY);
    await weth.mint(INITIAL_SUPPLY);
    await nativeToken.mint(INITIAL_SUPPLY);

    await nativeToken.transferOwnership(masterChef.address);

    tokenA.transfer(addr1.address,INITIAL_SUPPLY_ADDR1);
    //weth.transfer(addr1.address,INITIAL_SUPPLY_ADDR1);

    await tokenA.approve(router.address, INITIAL_SUPPLY_OWNER.toHexString());
    await tokenB.approve(router.address, INITIAL_SUPPLY_OWNER.toHexString());
    await weth.approve(router.address, INITIAL_SUPPLY_OWNER.toHexString());
    await nativeToken.approve(router.address, INITIAL_SUPPLY_OWNER.toHexString());

    await tokenA.connect(addr1).approve(router.address, INITIAL_SUPPLY_ADDR1.toHexString());
    await tokenB.connect(addr1).approve(router.address, INITIAL_SUPPLY_ADDR1.toHexString());
    await weth.connect(addr1).approve(router.address, INITIAL_SUPPLY_ADDR1.toHexString());
    await nativeToken.connect(addr1).approve(router.address, INITIAL_SUPPLY_ADDR1.toHexString());

    await tokenAddresses.addToken(tokenAddresses.BNB(), weth.address);
    await tokenAddresses.addToken(tokenAddresses.GLOBAL(), nativeToken.address);
});

describe("Factory: Fees", function () {
    it("The dev fees cannot be set at 100% or above of the total fees", async function () {
        let date = new Date();
        const deadline = date.setTime(date.getTime() + 2 * 3600); // +2 hours

        await router.addLiquidity(
            tokenA.address,
            weth.address,
            INITIAL_SUPPLY_OWNER,
            INITIAL_SUPPLY_OWNER,
            INITIAL_SUPPLY_OWNER,
            INITIAL_SUPPLY_OWNER,
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

        console.log((await tokenA.balanceOf(addr1.address)).toString());
        console.log((await weth.balanceOf(addr1.address)).toString());

        await router.connect(addr1).swapExactTokensForTokensSupportingFeeOnTransferTokens(INITIAL_SUPPLY_ADDR1,0,[tokenA.address, weth.address],
            addr1.address,deadline);

        console.log((await tokenA.balanceOf(addr1.address)).toString());
        console.log((await weth.balanceOf(addr1.address)).toString());

        await router.connect(addr1).swapExactTokensForTokensSupportingFeeOnTransferTokens(weth.balanceOf(addr1.address),0,[weth.address, tokenA.address],
            addr1.address,deadline);

        console.log((await tokenA.balanceOf(addr1.address)).toString());
        console.log((await weth.balanceOf(addr1.address)).toString());
    });
});


