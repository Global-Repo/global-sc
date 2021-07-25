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

describe("Router: Add liquidity to a pair", function () {

    it("Can't add liquidity if we don't have liquidity", async function () {
        let date = new Date();
        const deadline = date.setTime(date.getTime() + 2 * 86400000); // +2 days

        await expect( router.connect(addr3).addLiquidity(
            tokenA.address,
            tokenC.address,
            BigNumber.from(10).mul(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER),
            BigNumber.from(10).mul(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER),
            BigNumber.from(1).mul(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER),
            BigNumber.from(1).mul(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER),
            owner.address,
            deadline
        )).to.revertedWith('TransferHelper: TRANSFER_FROM_FAILED');
    });

    it("Mint tokens, transfer them to a new address (full example) so we can add liquidity", async function () {
        //Owner already has some tokens (we minted them beforeeach functions)
        expect( await tokenA.connect(owner).balanceOf(owner.address) ).to.equal(INITIAL_SUPPLY);
        expect( await tokenC.connect(owner).balanceOf(owner.address) ).to.equal(INITIAL_SUPPLY);

        // We mint some more, by default since we are not using connect, we are minting to owner
        // note we can only mint from owner, therefore to send someone tokens we need to follow these steps shown
        const tkns_to_mint = BigNumber.from(10).mul(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER)
        await tokenA.connect(owner).mint( tkns_to_mint );
        await tokenC.connect(owner).mint( tkns_to_mint );
        expect( await tokenA.balanceOf(owner.address) ).to.equal(INITIAL_SUPPLY.add(tkns_to_mint));
        expect( await tokenC.balanceOf(owner.address) ).to.equal(INITIAL_SUPPLY.add(tkns_to_mint));

        //Now we transfer 'tkns_to_mint' qty to a new address
        //owner will have INITIAL_SUPPLY again, since he transferred tkns_to_mint to addr3
        //addr3 will have tkns_to_mint
        expect( await tokenA.balanceOf(addr3.address) ).to.equal(0);
        expect( await tokenC.balanceOf(addr3.address) ).to.equal(0);
        await tokenA.connect(owner).transfer(addr3.address, tkns_to_mint )
        await tokenC.connect(owner).transfer(addr3.address, tkns_to_mint )
        expect( await tokenA.balanceOf(owner.address) ).to.equal(INITIAL_SUPPLY);
        expect( await tokenC.balanceOf(owner.address) ).to.equal(INITIAL_SUPPLY);
        expect( await tokenA.balanceOf(addr3.address) ).to.equal(tkns_to_mint);
        expect( await tokenC.balanceOf(addr3.address) ).to.equal(tkns_to_mint);

        // print some data
        console.log(addr3.address);
        console.log(tkns_to_mint.toString());
        await tokenA.approve(router.address, INITIAL_SUPPLY.toHexString());
        await tokenC.approve(router.address, INITIAL_SUPPLY.toHexString());


        //finally, addr3 can add liquidity to the pool!
        //TODO. why can't I add liquidity from addr3?
        //TODO. why is this not working? What would we need to do to let addr3 call addLiquidity?
        let date = new Date();
        const deadline = date.setTime(date.getTime() + 2 * 86400000); // +2 days

        await expect( router.connect(addr3).addLiquidity(
            tokenA.address,
            tokenC.address,
            tkns_to_mint,
            tkns_to_mint,
            tkns_to_mint.div(10),
            tkns_to_mint.div(10),
            owner.address,
            deadline
        )).to.emit(router, 'AddedLiquidity')
            .withArgs(tkns_to_mint,
                tkns_to_mint,
                tkns_to_mint.sub(1000));
    });

    it("Add liquidity from owner, owner not having enough liquidity", async function () {
        //TODO, why does this work as well? If owner has not enough supply (which he shouldn't),
        // router should return an INSUFFICIENT_B_AMOUNT.
        // Instead, I'm getting a TransferHelper: TRANSFER_FROM_FAILED error. Why?


        let date = new Date();
        const deadline = date.setTime(date.getTime() + 2 * 86400000); // +2 days

        //the first returned value is the qty of tokensA
        //the second is qty tokensB
        //the third is liquidity, which is calculated by sqrt of two tokens minus minimum liquidity, which
        // is 1000 for the first deposit
        await expect( router.addLiquidity(
            tokenA.address,
            tokenB.address,
            INITIAL_SUPPLY.mul(100),
            INITIAL_SUPPLY.mul(100),
            INITIAL_SUPPLY.mul(100),
            INITIAL_SUPPLY.mul(100),
            owner.address,
            deadline
        )).to.emit(router, 'AddedLiquidity')
            .withArgs(INITIAL_SUPPLY,
                INITIAL_SUPPLY,
                INITIAL_SUPPLY.sub(1000));


        //TODO check owner wallet for the pair
        const pairAddress = await factory.getPair(tokenA.address, tokenB.address);

        //TODO check pair balance make sure the money from woner is there
    });


    it("Add liquidity from owner, this time we have enough liquidity", async function () {
        //Owner has liquidity because we minted before each test. Otherwise this should
        // return not enough funds
        let date = new Date();
        const deadline = date.setTime(date.getTime() + 2 * 86400000); // +2 days

        //the first returned value is the qty of tokensA
        //the second is qty tokensB
        //the third is liquidity, which is calculated by sqrt of two tokens minus minimum liquidity, which
        // is 1000 for the first deposit
        await expect( router.connect(owner).addLiquidity(
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


        //TODO check owner wallet for the pair
        const pairAddress = await factory.getPair(tokenA.address, tokenB.address);

        //TODO check pair balance make sure the money from woner is there
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