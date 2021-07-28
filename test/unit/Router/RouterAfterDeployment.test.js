const ethers = require("hardhat").ethers;
const { expect } = require("chai");
const { BigNumber } = require("@ethersproject/bignumber");

const TOKEN_DECIMALS = 18;
const BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER = BigNumber.from(10).pow(TOKEN_DECIMALS);
const NORMAL_NUMBER_TOKEN_DECIMALS_MULTIPLIER = BigNumber.from(10).pow(9);
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

describe("Router: Add liquidity to a pair, and pair proportions + functions", function () {

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

        await tokenA.connect(addr3).approve(router.address, INITIAL_SUPPLY.toHexString());
        await tokenC.connect(addr3).approve(router.address, INITIAL_SUPPLY.toHexString());

        //finally, addr3 can add liquidity to the pool!
        let date = new Date();
        const deadline = date.setTime(date.getTime() + 2 * 86400000); // +2 days

        await expect( router.connect(addr3).addLiquidity(
            tokenA.address,
            tokenC.address,
            tkns_to_mint,
            tkns_to_mint,
            tkns_to_mint.div(10),
            tkns_to_mint.div(10),
            addr3.address,
            deadline
        )).to.emit(router, 'AddedLiquidity')
            .withArgs(tkns_to_mint,
                tkns_to_mint,
                tkns_to_mint.sub(1000));
    });

    it("Add liquidity from owner, owner not having enough liquidity", async function () {
        //Owner already has some tokens (we minted them beforeeach functions)
        expect( await tokenA.connect(owner).balanceOf(owner.address) ).to.equal(INITIAL_SUPPLY);
        expect( await tokenC.connect(owner).balanceOf(owner.address) ).to.equal(INITIAL_SUPPLY);

        //We get a 'TransferHelper: TRANSFER_FROM_FAILED' when the source wallet does not have enough
        //liquidity. The error 'PancakeRouter: INSUFFICIENT_A_AMOUNT' seems ot happen when we do not provide
        //enough A tkns wrt B and viceversa.
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
        )).to.revertedWith('TransferHelper: TRANSFER_FROM_FAILED');

        //since the tx didnt go through, owner has the same qty of tokens as previously
        expect( await tokenA.connect(owner).balanceOf(owner.address) ).to.equal(INITIAL_SUPPLY);
        expect( await tokenC.connect(owner).balanceOf(owner.address) ).to.equal(INITIAL_SUPPLY);

        //Also, the pair A-B has been created
        const pairAddress = await factory.getPair(tokenA.address, tokenB.address);
        expect(pairAddress).not.equal(0);
        const pairContract = await ethers.getContractFactory("Pair");
        const pair = await pairContract.attach(pairAddress);

        //find balance of owner, which should be 0
        expect(await pair.balanceOf(owner.address)).equal(0);

        //pair reserves should also be zero
        const {0: reserves0, 1:reserves1, 2:reserves_timestamp} = await pair.getReserves();
        expect(reserves0).equal(0);
        expect(reserves1).equal(0);
        expect(reserves_timestamp).equal(0);
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
            BigNumber.from(10).mul(NORMAL_NUMBER_TOKEN_DECIMALS_MULTIPLIER),
            BigNumber.from(10).mul(NORMAL_NUMBER_TOKEN_DECIMALS_MULTIPLIER),
            BigNumber.from(1).mul(NORMAL_NUMBER_TOKEN_DECIMALS_MULTIPLIER),
            BigNumber.from(1).mul(NORMAL_NUMBER_TOKEN_DECIMALS_MULTIPLIER),
            owner.address,
            deadline
        )).to.emit(router, 'AddedLiquidity')
            .withArgs(BigNumber.from(10).mul(NORMAL_NUMBER_TOKEN_DECIMALS_MULTIPLIER),
                BigNumber.from(10).mul(NORMAL_NUMBER_TOKEN_DECIMALS_MULTIPLIER),
                BigNumber.from(10).mul(NORMAL_NUMBER_TOKEN_DECIMALS_MULTIPLIER).sub(1000));


        //since the tx did go through, owner has less tokens now
        expect( await tokenA.connect(owner).balanceOf(owner.address) ).to.equal(INITIAL_SUPPLY.sub(BigNumber.from(10).mul(NORMAL_NUMBER_TOKEN_DECIMALS_MULTIPLIER)));
        expect( await tokenB.connect(owner).balanceOf(owner.address) ).to.equal(INITIAL_SUPPLY.sub(BigNumber.from(10).mul(NORMAL_NUMBER_TOKEN_DECIMALS_MULTIPLIER)));

        //Also, the pair A-B has been created
        const pairAddress = await factory.getPair(tokenA.address, tokenB.address);
        expect(pairAddress).not.equal(0);
        const pairContract = await ethers.getContractFactory("Pair");
        const pair = await pairContract.attach(pairAddress);

        //find balance of owner reagrding the pair A-B, which should be the qty of Pair minus the blocking fee
        expect(await pair.balanceOf(owner.address)).equal(BigNumber.from(10).mul(NORMAL_NUMBER_TOKEN_DECIMALS_MULTIPLIER).sub(1000) );

        //pair reserves should be the same qty of tkns introduced by owner after adding liquidity
        //reserves_timestamsp should be less than the deadline
        let {0: reserves0, 1:reserves1, 2:reserves_timestamp} = await pair.getReserves();
        expect(reserves0).equal(BigNumber.from(10).mul(NORMAL_NUMBER_TOKEN_DECIMALS_MULTIPLIER) );
        expect(reserves1).equal(BigNumber.from(10).mul(NORMAL_NUMBER_TOKEN_DECIMALS_MULTIPLIER));
        expect(reserves_timestamp).lessThanOrEqual(deadline );
    });

    it("Add liquidity using an outdated datetime stamp.", async function () {
        //test datetime stamp; 'PancakeRouter: EXPIRED'
        //Owner sends tkns to addr3, addr has liquidity
        const tkns_to_mint = BigNumber.from(10).mul(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER)
        expect( await tokenA.balanceOf(addr3.address) ).to.equal(0);
        expect( await tokenC.balanceOf(addr3.address) ).to.equal(0);
        await tokenA.connect(owner).transfer(addr3.address, tkns_to_mint )
        await tokenC.connect(owner).transfer(addr3.address, tkns_to_mint )
        expect( await tokenA.balanceOf(addr3.address) ).to.equal(tkns_to_mint);
        expect( await tokenC.balanceOf(addr3.address) ).to.equal(tkns_to_mint);

        // However the transfer does not go thoruhg since the we did not approve the token
        // from addr3
        let date = new Date();
        const deadline = date.setTime(date.getTime() - (2 * 86400000)); // +2 days
        await expect( router.connect(owner).addLiquidity(
            tokenA.address,
            tokenB.address,
            BigNumber.from(10).mul(NORMAL_NUMBER_TOKEN_DECIMALS_MULTIPLIER),
            BigNumber.from(10).mul(NORMAL_NUMBER_TOKEN_DECIMALS_MULTIPLIER),
            BigNumber.from(1).mul(NORMAL_NUMBER_TOKEN_DECIMALS_MULTIPLIER),
            BigNumber.from(1).mul(NORMAL_NUMBER_TOKEN_DECIMALS_MULTIPLIER),
            owner.address,
            0
        )).to.revertedWith('PancakeRouter: EXPIRED');
    });

    it("Adding liquidity from a non approved addr should break.", async function () {
        //test adding loquidity using a non approved token, check error 'TransferHelper: TRANSFER_FROM_FAILED'
        //Owner has liquidity because we minted before each test. Otherwise this should
        // return not enough funds
        let date = new Date();
        const deadline = date.setTime(date.getTime() + 2 * 86400000); // +2 days

        //the first returned value is the qty of tokensA
        //the second is qty tokensB
        //the third is liquidity, which is calculated by sqrt of two tokens minus minimum liquidity, which
        // is 1000 for the first deposit
        await expect( router.connect(addr3).addLiquidity(
            tokenA.address,
            tokenB.address,
            BigNumber.from(10).mul(NORMAL_NUMBER_TOKEN_DECIMALS_MULTIPLIER),
            BigNumber.from(10).mul(NORMAL_NUMBER_TOKEN_DECIMALS_MULTIPLIER),
            BigNumber.from(1).mul(NORMAL_NUMBER_TOKEN_DECIMALS_MULTIPLIER),
            BigNumber.from(1).mul(NORMAL_NUMBER_TOKEN_DECIMALS_MULTIPLIER),
            owner.address,
            deadline
        )).to.revertedWith('TransferHelper: TRANSFER_FROM_FAILED');

    });

    it("Test amountAMin and amountBMin", async function () {
        //in _addLiquidity, check for messages 'PancakeRouter: INSUFFICIENT_B_AMOUNT', 'PancakeRouter: INSUFFICIENT_A_AMOUNT'

        //first addliquidity, establishing the proportoin 1:1 between tkA:tkB
        let date = new Date();
        const deadline = date.setTime(date.getTime() + 2 * 86400000); // +2 days
        await expect( router.connect(owner).addLiquidity(
            tokenA.address,
            tokenB.address,
            BigNumber.from(10).mul(NORMAL_NUMBER_TOKEN_DECIMALS_MULTIPLIER),
            BigNumber.from(10).mul(NORMAL_NUMBER_TOKEN_DECIMALS_MULTIPLIER),
            BigNumber.from(1).mul(NORMAL_NUMBER_TOKEN_DECIMALS_MULTIPLIER),
            BigNumber.from(1).mul(NORMAL_NUMBER_TOKEN_DECIMALS_MULTIPLIER),
            owner.address,
            deadline
        )).to.emit(router, 'AddedLiquidity')
            .withArgs(BigNumber.from(10).mul(NORMAL_NUMBER_TOKEN_DECIMALS_MULTIPLIER),
                BigNumber.from(10).mul(NORMAL_NUMBER_TOKEN_DECIMALS_MULTIPLIER),
                BigNumber.from(10).mul(NORMAL_NUMBER_TOKEN_DECIMALS_MULTIPLIER).sub(1000));

        //second addliquidity, breaking the proportion
        await expect( router.connect(owner).addLiquidity(
            tokenA.address,
            tokenB.address,
            BigNumber.from(10).mul(NORMAL_NUMBER_TOKEN_DECIMALS_MULTIPLIER),
            BigNumber.from(1).mul(NORMAL_NUMBER_TOKEN_DECIMALS_MULTIPLIER),
            BigNumber.from(10).mul(NORMAL_NUMBER_TOKEN_DECIMALS_MULTIPLIER),
            BigNumber.from(1).mul(NORMAL_NUMBER_TOKEN_DECIMALS_MULTIPLIER),
            owner.address,
            deadline
        )).to.revertedWith('PancakeRouter: INSUFFICIENT_A_AMOUNT');

        //third addliquidity, breaking the proportion the other way around
        await expect( router.connect(owner).addLiquidity(
            tokenA.address,
            tokenB.address,
            BigNumber.from(1).mul(NORMAL_NUMBER_TOKEN_DECIMALS_MULTIPLIER),
            BigNumber.from(10).mul(NORMAL_NUMBER_TOKEN_DECIMALS_MULTIPLIER),
            BigNumber.from(1).mul(NORMAL_NUMBER_TOKEN_DECIMALS_MULTIPLIER),
            BigNumber.from(10).mul(NORMAL_NUMBER_TOKEN_DECIMALS_MULTIPLIER),
            owner.address,
            deadline
        )).to.revertedWith('PancakeRouter: INSUFFICIENT_B_AMOUNT');



    });

    it("Checking amountAMin and amountBMin on an already created pair", async function () {
        let date = new Date();
        const deadline = date.setTime(date.getTime() + 2 * 86400000); // +2 days

        //
        // first addliquidity from owner
        //
        // first addliquidity should go trough, establishing the proportion between tokens 1:1
        await expect( router.connect(owner).addLiquidity(
            tokenA.address,
            tokenB.address,
            BigNumber.from(10).mul(NORMAL_NUMBER_TOKEN_DECIMALS_MULTIPLIER),
            BigNumber.from(10).mul(NORMAL_NUMBER_TOKEN_DECIMALS_MULTIPLIER),
            BigNumber.from(1).mul(NORMAL_NUMBER_TOKEN_DECIMALS_MULTIPLIER),
            BigNumber.from(1).mul(NORMAL_NUMBER_TOKEN_DECIMALS_MULTIPLIER),
            owner.address,
            deadline
        )).to.emit(router, 'AddedLiquidity')
            .withArgs(BigNumber.from(10).mul(NORMAL_NUMBER_TOKEN_DECIMALS_MULTIPLIER),
                BigNumber.from(10).mul(NORMAL_NUMBER_TOKEN_DECIMALS_MULTIPLIER),
                BigNumber.from(10).mul(NORMAL_NUMBER_TOKEN_DECIMALS_MULTIPLIER).sub(1000));

        //
        // check the reserves and coins of owner, now he'll have (10).mul(NORMAL_NUMBER_TOKEN_DECIMALS_MULTIPLIER) less
        // for tknA and tknB
        //
        expect( await tokenA.connect(owner).balanceOf(owner.address) ).to.equal(
            INITIAL_SUPPLY.sub(BigNumber.from(10).mul(NORMAL_NUMBER_TOKEN_DECIMALS_MULTIPLIER))
        );
        expect( await tokenB.connect(owner).balanceOf(owner.address) ).to.equal(
            INITIAL_SUPPLY.sub(BigNumber.from(10).mul(NORMAL_NUMBER_TOKEN_DECIMALS_MULTIPLIER))
        );

        //Also, the pair A-B has been created
        const pairAddress = await factory.getPair(tokenA.address, tokenB.address);
        expect(pairAddress).not.equal(0);
        const pairContract = await ethers.getContractFactory("Pair");
        const pair = await pairContract.attach(pairAddress);

        // find balance of owner from pair,
        // which should be the qty of LPs minus the comission for opoening the trade
        expect(await pair.balanceOf(owner.address)).equal(
            BigNumber.from(10).mul(NORMAL_NUMBER_TOKEN_DECIMALS_MULTIPLIER).sub(1000)
        );

        //pair reserves should also not be zero
        let {0: reserves0, 1:reserves1, 2:reserves_timestamp} = await pair.getReserves();
        expect(reserves0).equal(BigNumber.from(10).mul(NORMAL_NUMBER_TOKEN_DECIMALS_MULTIPLIER),);
        expect(reserves1).equal(BigNumber.from(10).mul(NORMAL_NUMBER_TOKEN_DECIMALS_MULTIPLIER),);
        expect(reserves_timestamp).lessThanOrEqual(deadline );


        //
        // second addliquidity from owner
        //
        // should go trhough too, but instead of removing 10).mul(NORMAL_NUMBER_TOKEN_DECIMALS_MULTIPLIER)
        // it'll only collect 5, as the proportion between tkA and tkB should be kept at 1:1 and we are only
        // sending 5 times the tknB. We are also not paying the fee of 1000, since it's only for the first
        // deposit to a token pair
        await expect( router.connect(owner).addLiquidity(
            tokenA.address,
            tokenB.address,
            BigNumber.from(10).mul(NORMAL_NUMBER_TOKEN_DECIMALS_MULTIPLIER),
            BigNumber.from(5).mul(NORMAL_NUMBER_TOKEN_DECIMALS_MULTIPLIER),
            BigNumber.from(1).mul(NORMAL_NUMBER_TOKEN_DECIMALS_MULTIPLIER),
            BigNumber.from(1).mul(NORMAL_NUMBER_TOKEN_DECIMALS_MULTIPLIER),
            owner.address,
            deadline
        )).to.emit(router, 'AddedLiquidity')
            .withArgs(
                BigNumber.from(5).mul(NORMAL_NUMBER_TOKEN_DECIMALS_MULTIPLIER),
                BigNumber.from(5).mul(NORMAL_NUMBER_TOKEN_DECIMALS_MULTIPLIER),
                BigNumber.from(5).mul(NORMAL_NUMBER_TOKEN_DECIMALS_MULTIPLIER) );
        //
        // check the reserves and coins of owner, now he'll have (10+5).mul(NORMAL_NUMBER_TOKEN_DECIMALS_MULTIPLIER) less
        // for tknA and tknB
        //
        expect( await tokenA.connect(owner).balanceOf(owner.address) ).to.equal(
            INITIAL_SUPPLY.sub(BigNumber.from(15).mul(NORMAL_NUMBER_TOKEN_DECIMALS_MULTIPLIER))
        );
        expect( await tokenB.connect(owner).balanceOf(owner.address) ).to.equal(
            INITIAL_SUPPLY.sub(BigNumber.from(15).mul(NORMAL_NUMBER_TOKEN_DECIMALS_MULTIPLIER))
        );

        // find balance of owner from pair,
        // which should be the qty of LPs minus the comission for opoening the trade
        expect(await pair.balanceOf(owner.address)).equal(
            BigNumber.from(15).mul(NORMAL_NUMBER_TOKEN_DECIMALS_MULTIPLIER).sub(1000)
        );

        //pair reserves should also not be zero
        let {0: reserves0_2, 1:reserves1_2, 2:reserves_timestamp_2} = await pair.getReserves();
        expect(reserves0_2).equal(BigNumber.from(15).mul(NORMAL_NUMBER_TOKEN_DECIMALS_MULTIPLIER),);
        expect(reserves1_2).equal(BigNumber.from(15).mul(NORMAL_NUMBER_TOKEN_DECIMALS_MULTIPLIER),);
        expect(reserves_timestamp_2).lessThanOrEqual(deadline );

        //
        // third addliquidity from owner
        //
        // this one should fail, as the minimumA and minB do not satisfy the requirements for
        // the pair A-B
        await expect( router.connect(owner).addLiquidity(
            tokenA.address,
            tokenB.address,
            BigNumber.from(10).mul(NORMAL_NUMBER_TOKEN_DECIMALS_MULTIPLIER),
            BigNumber.from(5).mul(NORMAL_NUMBER_TOKEN_DECIMALS_MULTIPLIER),
            BigNumber.from(8).mul(NORMAL_NUMBER_TOKEN_DECIMALS_MULTIPLIER),
            BigNumber.from(3).mul(NORMAL_NUMBER_TOKEN_DECIMALS_MULTIPLIER),
            owner.address,
            deadline
        )).to.revertedWith('PancakeRouter: INSUFFICIENT_A_AMOUNT');


    });

    it("Change pair.devfeeto address and check that fees are sent the correct way", async function () {
    });

    it("Change factory fees to apply for swap and devefeenum and devefeedenum and check that fees are correctly calculated", async function () {
    });

    it("perform different liquidity adds and withdraws and check that everything works fine", async function () {
    });

});

describe("Router: swap and fees", function () {
    //TODO, swap and fees

});

describe("Router: removeLiquidity and fees", function () {
    //TODO, removeLiquidity and fees

});