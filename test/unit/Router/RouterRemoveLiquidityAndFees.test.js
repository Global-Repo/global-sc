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


describe("Router: removeLiquidity and fees", function () {


    it("Can't remove liquidity with an expired deadline.", async function () {
        //AddLiquidity
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
        ))

        //Removeliquidity breaks cause expired deadline
        //Also, the pair A-B has been created
        const pairAddress = await factory.getPair(tokenA.address, tokenB.address);
        expect(pairAddress).not.equal(0);
        const pairContract = await ethers.getContractFactory("Pair");
        const pair = await pairContract.attach(pairAddress);

        //approve owner
        await pair.connect(owner).approve(router.address, 50000);
        await expect( router.connect(owner).removeLiquidity(
            tokenA.address,
            tokenB.address,
            BigNumber.from(5).mul(NORMAL_NUMBER_TOKEN_DECIMALS_MULTIPLIER),
            BigNumber.from(1).mul(NORMAL_NUMBER_TOKEN_DECIMALS_MULTIPLIER),
            BigNumber.from(1).mul(NORMAL_NUMBER_TOKEN_DECIMALS_MULTIPLIER),
            owner.address,
            0
        )).to.revertedWith('PancakeRouter: EXPIRED');

    });

    it("Can't remove liquidity from a non-existing pair.", async function () {

        //Removeliquidity breaks cause we do not have liquidity for that pair
        let date = new Date();
        const deadline = date.setTime(date.getTime() + 2 * 86400000); // +2 days
        await expect( router.connect(owner).removeLiquidity(
            tokenA.address,
            tokenB.address,
            BigNumber.from(5).mul(NORMAL_NUMBER_TOKEN_DECIMALS_MULTIPLIER),
            BigNumber.from(1).mul(NORMAL_NUMBER_TOKEN_DECIMALS_MULTIPLIER),
            BigNumber.from(1).mul(NORMAL_NUMBER_TOKEN_DECIMALS_MULTIPLIER),
            owner.address,
            deadline
        )).to.revertedWith('SafeMath: subtraction overflow');

    });

    it("Can't remove liquidity if we don't have permission for that pair.", async function () {

        //AddLiquidity
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
        ))

        //Also, the pair A-B has been created
        const pairAddress = await factory.getPair(tokenA.address, tokenB.address);
        expect(pairAddress).not.equal(0);
        const pairContract = await ethers.getContractFactory("Pair");
        const pair = await pairContract.attach(pairAddress);

        //try to remove liquidity with addr3
        await expect( router.connect(owner).removeLiquidity(
            tokenA.address,
            tokenB.address,
            BigNumber.from(1).mul(NORMAL_NUMBER_TOKEN_DECIMALS_MULTIPLIER),
            BigNumber.from(1).mul(NORMAL_NUMBER_TOKEN_DECIMALS_MULTIPLIER),
            BigNumber.from(1).mul(NORMAL_NUMBER_TOKEN_DECIMALS_MULTIPLIER),
            owner.address,
            deadline
        )).to.revertedWith('SafeMath: subtraction overflow');
    });

    it("Can't remove liquidity if we don't have liquidity in that pair.", async function () {

        //add liquidity with owner and create the pair AB
        let date = new Date();
        const deadline = date.setTime(date.getTime() + 2 * 86400000); // +2 days
        await router.connect(owner).addLiquidity(
            tokenA.address,
            tokenB.address,
            BigNumber.from(10000),
            BigNumber.from(10000),
            BigNumber.from(1000),
            BigNumber.from(1000),
            owner.address,
            deadline
        );

        //Also, the pair A-B has been created
        const pairAddress = await factory.getPair(tokenA.address, tokenB.address);
        expect(pairAddress).not.equal(0);
        const pairContract = await ethers.getContractFactory("Pair");
        const pair = await pairContract.attach(pairAddress);

        //try to remove liquidity with addr3
        await pair.connect(addr3).approve(router.address, 50000);
        await expect( router.connect(addr3).removeLiquidity(
            tokenA.address,
            tokenB.address,
            BigNumber.from(1).mul(NORMAL_NUMBER_TOKEN_DECIMALS_MULTIPLIER),
            BigNumber.from(1).mul(NORMAL_NUMBER_TOKEN_DECIMALS_MULTIPLIER),
            BigNumber.from(1).mul(NORMAL_NUMBER_TOKEN_DECIMALS_MULTIPLIER),
            owner.address,
            deadline
        )).to.revertedWith('SafeMath: subtraction overflow');
    });

    it("Add and Remove 0 liquidity", async function () {

        //add liquidity with owner and create the pair AB
        let date = new Date();
        const deadline = date.setTime(date.getTime() + 2 * 86400000); // +2 days
        await router.connect(owner).addLiquidity(
            tokenA.address,
            tokenB.address,
            BigNumber.from(10000),
            BigNumber.from(10000),
            BigNumber.from(1000),
            BigNumber.from(1000),
            owner.address,
            deadline
        );

        //Also, the pair A-B has been created
        const pairAddress = await factory.getPair(tokenA.address, tokenB.address);
        expect(pairAddress).not.equal(0);
        const pairContract = await ethers.getContractFactory("Pair");
        const pair = await pairContract.attach(pairAddress);

        //try to remove 0 liquidity breaks
        await pair.connect(owner).approve(router.address, 50000);
        await expect( router.connect(owner).removeLiquidity(
            tokenA.address,
            tokenB.address,
            0,
            0,
            0,
            owner.address,
            deadline
        )).to.revertedWith('Pancake: INSUFFICIENT_LIQUIDITY_BURNED');
    });


    it("Can't remove liquidity if we don't have permission for that pair (reversed).", async function () {

        //AddLiquidity
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
        ))

        //
        await expect( router.connect(owner).removeLiquidity(
            tokenB.address,
            tokenC.address,
            BigNumber.from(1).mul(NORMAL_NUMBER_TOKEN_DECIMALS_MULTIPLIER),
            BigNumber.from(1).mul(NORMAL_NUMBER_TOKEN_DECIMALS_MULTIPLIER),
            BigNumber.from(1).mul(NORMAL_NUMBER_TOKEN_DECIMALS_MULTIPLIER),
            owner.address,
            deadline
        )).to.revertedWith('SafeMath: subtraction overflow');
    });


    it("Add and remove liquidity from the same user.", async function () {
        //add liquidity
        let date = new Date();
        const deadline = date.setTime(date.getTime() + 2 * 86400000); // +2 days
        await router.connect(owner).addLiquidity(
            tokenA.address,
            tokenB.address,
            BigNumber.from(10000),
            BigNumber.from(10000),
            BigNumber.from(1000),
            BigNumber.from(1000),
            owner.address,
            deadline
        );

        await router.connect(owner).addLiquidity(
            tokenA.address,
            tokenB.address,
            BigNumber.from(10000),
            BigNumber.from(10000),
            BigNumber.from(1000),
            BigNumber.from(1000),
            owner.address,
            deadline
        );

        //Also, the pair A-B has been created
        const pairAddress = await factory.getPair(tokenA.address, tokenB.address);
        expect(pairAddress).not.equal(0);
        const pairContract = await ethers.getContractFactory("Pair");
        const pair = await pairContract.attach(pairAddress);

        //balance of owner should be 19000 A-B LPs (the two addliquidity) minus the blocked part \o.o/
        expect(await pair.balanceOf(owner.address)).equal(19000 );
        //balance of owner for token1 and tokenb should be 99999999999999980000 (minted - liquidity added)
        expect(await tokenA.balanceOf(owner.address)).equal( INITIAL_SUPPLY.sub(20000) );
        expect(await tokenB.balanceOf(owner.address)).equal( INITIAL_SUPPLY.sub(20000) );
        //pair reserves should be 20k
        let {0: reserves0, 1:reserves1, 2:reserves_timestamp} = await pair.getReserves();
        expect(reserves0).equal(BigNumber.from(20000) );
        expect(reserves1).equal(BigNumber.from(20000) );
        expect(reserves_timestamp).lessThanOrEqual(deadline );
        await pair.connect(owner).approve(router.address, 50000);

        //allow owner to retrieve LP from router
        //since the proportion between A:B es 1:1, we will retrieve the maximum
        //possible between amountAMin and amountBMin considering the liquidity and the qty
        // we want to retrieve of the pool (which is 1000) and send it to the owner address
        await router.connect(owner).removeLiquidity(
            tokenA.address,
            tokenB.address,
            1000,
            0,
            0,
            owner.address,
            deadline
        );

        //now, the owner recovered 1000 tokensA and 1000 tokensB, therefore he now must have
        //INITIAL_SUPPLY.sub(19000)
        expect(await tokenA.balanceOf(owner.address)).equal( INITIAL_SUPPLY.sub(19000) );
        expect(await tokenB.balanceOf(owner.address)).equal( INITIAL_SUPPLY.sub(19000));
        //since we retrieved 1000A-B Pairs, now the owner only has 18000 left
        expect(await pair.balanceOf(owner.address)).equal(18000 );
        //if we check the ABpair..


        //
        // retrieve all thats left
        //
        await router.connect(owner).removeLiquidity(
            tokenA.address,
            tokenB.address,
            18000,
            100,
            1,
            owner.address,
            deadline
        );

        //now, the owner recovered 1000 tokensA and 1000 tokensB, therefore he now must have
        //INITIAL_SUPPLY.sub(19000)
        expect(await tokenA.balanceOf(owner.address)).equal( INITIAL_SUPPLY.sub(1000) );
        expect(await tokenB.balanceOf(owner.address)).equal( INITIAL_SUPPLY.sub(1000));
        //since we retrieved 1000A-B Pairs, now the owner only has 18000 left
        expect(await pair.balanceOf(owner.address)).equal(0 );
        //check the ABPair reserves. It must contain 1000 which is the blocked liquidity
        let {0: reserves01, 1:reserves11, 2:reserves_timestamp1} = await pair.getReserves();
        expect(reserves01).equal(BigNumber.from(1000) );
        expect(reserves11).equal(BigNumber.from(1000) );

        //
        // finally, we can't remove the reserves locked in the pool
        //
        await expect(router.connect(owner).removeLiquidity(
            tokenA.address,
            tokenB.address,
            900,
            100,
            1,
            owner.address,
            deadline
        )).to.revertedWith('SafeMath: subtraction overflow');
    });

});