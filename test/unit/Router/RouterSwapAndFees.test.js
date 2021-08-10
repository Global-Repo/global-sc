const ethers = require("hardhat").ethers;
const { expect } = require("chai");
const { BigNumber } = require("@ethersproject/bignumber");

const TOKEN_DECIMALS = 18;
const BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER = BigNumber.from(10).pow(TOKEN_DECIMALS);
const NORMAL_NUMBER_TOKEN_DECIMALS_MULTIPLIER = BigNumber.from(5).pow(TOKEN_DECIMALS);

let factory;
let weth;
let router;
let tokenA;
let tokenB;
let nativeToken;

beforeEach(async function () {
    [owner, addr1, addr2, addr3, ...addrs] = await ethers.getSigners();

    const Factory = await ethers.getContractFactory("Factory");
    factory = await Factory.deploy(owner.address);
    await factory.deployed();

    const Weth = await ethers.getContractFactory("BEP20");
    weth = await Weth.deploy('Wrapped BNB', 'WBNB');
    await weth.deployed();

    const Router = await ethers.getContractFactory("Router");
    router = await Router.deploy(factory.address, weth.address);
    await router.deployed();

    const TokenA = await ethers.getContractFactory("BEP20");
    tokenA = await TokenA.deploy('tokenA', 'AA');
    await tokenA.deployed();
    const TokenB = await ethers.getContractFactory("BEP20");
    tokenB = await TokenB.deploy('tokenB', 'BB');
    await tokenB.deployed();
    const NativeToken = await ethers.getContractFactory("NativeToken");
    nativeToken = await NativeToken.deploy();
    await nativeToken.deployed();

    // Set up scenarios
    const INITIAL_SUPPLY = BigNumber.from(100000000).mul(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER);

    await weth.mint(INITIAL_SUPPLY);
    await tokenA.mint(INITIAL_SUPPLY);
    await tokenB.mint(INITIAL_SUPPLY);
    await nativeToken.mint(INITIAL_SUPPLY);

    // Approve
    await tokenA.approve(router.address, INITIAL_SUPPLY.toHexString());
    await tokenB.approve(router.address, INITIAL_SUPPLY.toHexString());
    await weth.approve(router.address, INITIAL_SUPPLY.toHexString());
    await nativeToken.approve(router.address, INITIAL_SUPPLY.toHexString());
});

describe("Swap tokens", function () {

    it("Cannot swap tokens if the pair does not exist", async function () {
        let date = new Date();
        const timestamp = date.setTime(date.getTime() + 2 * 86400000); // +2 days

        await expect(
            router.swapExactTokensForTokens(
                BigNumber.from(1).mul(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER),
                BigNumber.from(2).mul(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER),
                [tokenA.address, tokenB.address],
                owner.address,
                timestamp
            )
        ).to.be.reverted;
    });

    it("Cannot swap tokens if there isn't enough liquidity for these pairs. -- PancakeRouter: INSUFFICIENT_OUTPUT_AMOUNT", async function () {
        let date = new Date();
        const timestamp = date.setTime(date.getTime() + 2 * 86400000); // +2 days
        await factory.setSwapFee(0);
        await router.addLiquidity(
            tokenA.address,
            tokenB.address,
            BigNumber.from(1).mul(NORMAL_NUMBER_TOKEN_DECIMALS_MULTIPLIER),
            BigNumber.from(1).mul(NORMAL_NUMBER_TOKEN_DECIMALS_MULTIPLIER),
            BigNumber.from(0).mul(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER),
            BigNumber.from(0).mul(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER),
            owner.address,
            timestamp
        );

        await expect(
            router.swapExactTokensForTokens(
                BigNumber.from(1).mul(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER),
                BigNumber.from(2).mul(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER),
                [tokenA.address, tokenB.address],
                owner.address,
                timestamp
            )
        ).to.be.revertedWith('PancakeRouter: INSUFFICIENT_OUTPUT_AMOUNT');
    });

    it("Cannot swap tokens from a non token address in path", async function () {
        let date = new Date();
        const timestamp = date.setTime(date.getTime() + 2 * 86400000); // +2 days
        await factory.setSwapFee(0);
        await router.addLiquidity(
            tokenA.address,
            tokenB.address,
            BigNumber.from(1).mul(NORMAL_NUMBER_TOKEN_DECIMALS_MULTIPLIER),
            BigNumber.from(1).mul(NORMAL_NUMBER_TOKEN_DECIMALS_MULTIPLIER),
            BigNumber.from(0).mul(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER),
            BigNumber.from(0).mul(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER),
            owner.address,
            timestamp
        );

        await expect(
            router.swapExactTokensForTokens(
                BigNumber.from(1).mul(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER),
                BigNumber.from(2).mul(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER),
                [tokenA.address, addr3.address],
                owner.address,
                timestamp
            )
        ).to.be.revertedWith('Transaction reverted: function call to a non-contract account');
    });


    it("Cannot swap 0 tokens -- PancakeLibrary: INSUFFICIENT_INPUT_AMOUNT", async function () {
        let date = new Date();
        const timestamp = date.setTime(date.getTime() + 2 * 86400000); // +2 days
        await factory.setSwapFee(0);
        await router.addLiquidity(
            tokenA.address,
            tokenB.address,
            BigNumber.from(10000000).mul(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER),
            BigNumber.from(10000000).mul(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER),
            BigNumber.from(0).mul(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER),
            BigNumber.from(0).mul(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER),
            owner.address,
            timestamp
        );

        await expect(
            router.swapExactTokensForTokens(
                0,
                0,
                [tokenA.address, tokenB.address],
                owner.address,
                timestamp
            )
        ).to.be.revertedWith('PancakeLibrary: INSUFFICIENT_INPUT_AMOUNT');
    });

    it("Cannot change the swap fee unless owner", async function () {
        await expect(
            factory.connect(addr3).setSwapFee(0)
        ).to.revertedWith('FORBIDDEN');

        await expect(
            factory.connect(owner).setSwapFee(0)
        );
    });

    it("Cannot set up a negative fee", async function () {
        await expect(
            factory.connect(owner).setSwapFee(-10000)
        ).to.reverted;

        await expect(
            factory.connect(owner).setSwapFee(-1)
        ).to.reverted;

        await expect(
            factory.connect(owner).setSwapFee(100)
        ).to.revertedWith('You cannot set the swap fees above 25');
    });


    it("Swap native tokens, complete functionality + swaps + 2 users (no swap fees)", async function () {
        const INITIAL_SUPPLY = BigNumber.from(100000000).mul(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER);
        let date = new Date();
        const deadline = date.setTime(date.getTime() + 2 * 86400000); // +2 days
        await factory.connect(owner).setSwapFee(0);

        await router.connect(owner).addLiquidity(
            nativeToken.address,
            tokenB.address,
            10000000,
            5000000,
            0,
            0,
            owner.address,
            deadline
        );
        expect(await nativeToken.balanceOf(owner.address)).equal( INITIAL_SUPPLY.sub(10000000) );
        expect(await tokenB.balanceOf(owner.address)).equal( INITIAL_SUPPLY.sub(5000000) );

        //Also, the pair Native-B has been created
        const pairAddress = await factory.getPair(nativeToken.address, tokenB.address);
        expect(pairAddress).not.equal(0);
        const pairContract = await ethers.getContractFactory("Pair");
        const pair = await pairContract.attach(pairAddress);
        //find balance of pair native-tknb for owner, which should not be 0
        expect(await pair.balanceOf(owner.address)).equal(7070067);

        let owner_pair_balance = await pair.balanceOf(owner.address);
        let owner_native_balance = await nativeToken.balanceOf(owner.address);
        let owner_b_balance = await tokenB.balanceOf(owner.address);
        console.log('\nAFTER DEPOSIT')
        console.log('tkn native balance', owner_native_balance.toString());
        console.log('tkn b balance', owner_b_balance.toString());
        console.log('pair balance', owner_pair_balance.toString());

        let {0: reserves000, 1:reserves010} = await pair.getReserves();
        console.log('pair reserves0', reserves000.toString());
        console.log('pair reserves1', reserves010.toString());


        //SWAP NATIVE TOKEN FOR B
        await router.connect(owner).swapExactTokensForTokens(
            500,
            0,
            [nativeToken.address, tokenB.address],
            owner.address,
            deadline
        );
        expect(await nativeToken.balanceOf(owner.address)).equal( owner_native_balance.sub(500) );
        expect(await tokenB.balanceOf(owner.address)).equal( owner_b_balance.add(249) );
        //check that the LP qty is the same
        owner_pair_balance = await pair.balanceOf(owner.address);
        expect(await pair.balanceOf(owner.address)).equal(7070067);

        //update owners balances
        owner_native_balance = await nativeToken.balanceOf(owner.address);
        owner_b_balance = await tokenB.balanceOf(owner.address);
        console.log('\nAFTER SWAP NATIVE-B')
        console.log('tkn native balance', owner_native_balance.toString());
        console.log('tkn b balance', owner_b_balance.toString());
        console.log('pair balance', owner_pair_balance.toString());

        let {0: reserves00, 1:reserves01} = await pair.getReserves();
        console.log('pair reserves0', reserves00.toString());
        console.log('pair reserves1', reserves01.toString());

        //
        // SWAP TOKEN B FOR NATIVE
        //
        await router.connect(owner).swapExactTokensForTokens(
            500,
            0,
            [tokenB.address, nativeToken.address],
            owner.address,
            deadline
        );
        expect(await nativeToken.balanceOf(owner.address)).equal( owner_native_balance.add(999) );
        expect(await tokenB.balanceOf(owner.address)).equal( owner_b_balance.sub(500) );
        expect(await pair.balanceOf(owner.address)).equal(7070067);

        owner_pair_balance = await pair.balanceOf(owner.address);
        owner_native_balance = await nativeToken.balanceOf(owner.address);
        owner_b_balance = await tokenB.balanceOf(owner.address);
        console.log('\nAFTER SWAP B-NATIVE')
        console.log('tkn native balance', owner_native_balance.toString());
        console.log('tkn b balance', owner_b_balance.toString());
        console.log('pair balance', owner_pair_balance.toString());

        let {0: reserves0, 1:reserves1} = await pair.getReserves();
        console.log('pair reserves0', reserves0.toString());
        console.log('pair reserves1', reserves1.toString());

        //
        // WITHDRAW, see how the LPs and total tkns has changed
        //
        await pair.connect(owner).approve(router.address, 100000000000000);
        await router.connect(owner).removeLiquidity(
            nativeToken.address,
            tokenB.address,
            owner_pair_balance,
            1,
            1,
            owner.address,
            deadline
        );

        owner_pair_balance = (await pair.balanceOf(owner.address));
        owner_native_balance = await nativeToken.balanceOf(owner.address);
        owner_b_balance = await tokenB.balanceOf(owner.address);
        console.log('\nAFTER WITHDRAW')
        console.log('tkn native balance', owner_native_balance.toString());
        console.log('tkn b balance', owner_b_balance.toString());
        console.log('pair balance', owner_pair_balance.toString());

        let {0: reserves_0, 1:reserves_1} = await pair.getReserves();
        console.log('pair reserves0', reserves_0.toString());
        console.log('pair reserves1', reserves_1.toString());

        //
        // NOW WE MINT SOME TOKENS FOR ADDR3 and addliquidity to the same pair
        // then we try to remove liquidity from owner, and it should break
        //
        await pair.connect(addr3).approve(router.address, 100000000000000);
        await nativeToken.connect(addr3).approve(router.address, 100000000000000);
        await tokenB.connect(addr3).approve(router.address, 100000000000000);
        await nativeToken.connect(owner).transfer(addr3.address, 50000 )
        await tokenB.connect(owner).transfer(addr3.address, 50000 )
        expect(await nativeToken.balanceOf(owner.address)).equal( owner_native_balance.sub(50000) );
        expect(await tokenB.balanceOf(owner.address)).equal( owner_b_balance.sub(50000) );
        owner_native_balance = owner_native_balance.sub(50000);
        owner_b_balance = owner_b_balance.sub(50000);
        console.log('\nOWNER AFTER TRANSFERRING 50k to ADDR3');
        console.log('owner_native_balance', owner_native_balance.toString());
        console.log('owner_b_balance', owner_b_balance.toString());

        //
        // ADDR adds liquidity to the same pool
        //
        await router.connect(addr3).addLiquidity(
            nativeToken.address,
            tokenB.address,
            30000,
            30000,
            200,
            200,
            addr3.address,
            deadline
        );
        let {0: reserves__0, 1:reserves__1} = await pair.getReserves();
        console.log('\nADDR3 ADDED LIQUIDITY')
        console.log('pair reserves0', reserves__0.toString());
        console.log('pair reserves1', reserves__1.toString());

        let {0: reserves___0, 1:reserves___1} = await pair.getReserves();
        console.log('\nOWNER removed liquidity')
        console.log('pair reserves0', reserves___0.toString());
        console.log('pair reserves1', reserves___1.toString());
        owner_pair_balance = await pair.balanceOf(owner.address);
        owner_native_balance = await nativeToken.balanceOf(owner.address);
        owner_b_balance = await tokenB.balanceOf(owner.address);
        console.log('tkn native balance', owner_native_balance.toString());
        console.log('tkn b balance', owner_b_balance.toString());
        console.log('pair balance', owner_pair_balance.toString());

        await expect( router.connect(addr3).removeLiquidity(
            nativeToken.address,
            tokenB.address,
            1000,
            10,
            5,
            owner.address,
            deadline
        ));


    });


    it("Swap tokens, basic functionality", async function () {
        let date = new Date();
        const deadline = date.setTime(date.getTime() + 2 * 86400000); // +2 days

        await factory.setSwapFee(0);

        await router.addLiquidity(
            tokenA.address,
            tokenB.address,
            BigNumber.from(10000000).mul(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER),
            BigNumber.from(10000000).mul(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER),
            BigNumber.from(0).mul(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER),
            BigNumber.from(0).mul(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER),
            owner.address,
            deadline
        );

        /*const f = await tokenA.balanceOf(owner.address);
        const g = await tokenB.balanceOf(owner.address);
        console.log(f.toString());
        console.log(g.toString());*/

        // Remaining 100 - 10 added as liquidity = 90 tokenA
        //expect(await tokenA.balanceOf(owner.address)).to.equal(BigNumber.from(90).mul(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER));

        // Remaining 100 - 10 added as liquidity = 90 tokenB
        //expect(await tokenB.balanceOf(owner.address)).to.equal(BigNumber.from(90).mul(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER));

        await router.swapExactTokensForTokens(
            BigNumber.from(5).mul(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER),
            BigNumber.from(1).mul(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER),
            [tokenA.address, tokenB.address],
            owner.address,
            deadline
        );

        /*const a = await tokenA.balanceOf(owner.address);
        const b = await tokenB.balanceOf(owner.address);
        console.log(a.toString());
        console.log(b.toString());*/

        //expect(await tokenA.balanceOf(owner.address)).to.equal(BigNumber.from(85).mul(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER));
        // TODO: expect token B amount

        await router.swapExactTokensForTokens(
            BigNumber.from(5).mul(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER),
            BigNumber.from(1).mul(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER),
            [tokenA.address, tokenB.address],
            owner.address,
            deadline
        );

        //expect(await tokenA.balanceOf(owner.address)).to.equal(BigNumber.from(80).mul(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER));
        // TODO: expect token B amount

        /*const c = await tokenA.balanceOf(owner.address);
        const d = await tokenB.balanceOf(owner.address);
        console.log(c.toString());
        console.log(d.toString());*/
    });
});