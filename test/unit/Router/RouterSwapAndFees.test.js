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
    [owner, addr1, addr2, addr3, feetoo, ...addrs] = await ethers.getSigners();

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
        //await factory.setSwapFee(0);
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
        ).to.be.revertedWith('GlobalRouter: INSUFFICIENT_OUTPUT_AMOUNT');
    });

    it("Cannot swap tokens from a non token address in path", async function () {
        let date = new Date();
        const timestamp = date.setTime(date.getTime() + 2 * 86400000); // +2 days
        //await factory.setSwapFee(0);
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
        //await factory.setSwapFee(0);
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

    it("Cannot change the feeto address unless owner", async function () {
        await expect(
            factory.connect(addr3).setFeeTo(feetoo.address)
        ).to.revertedWith('FORBIDDEN');

        await expect(
            factory.connect(owner).setFeeTo(feetoo.address)
        );
    });

    it("Cannot change the feeto setter address unless owner", async function () {
        await expect(
            factory.connect(addr3).setFeeToSetter(feetoo.address)
        ).to.revertedWith('FORBIDDEN');

        await expect(
            factory.connect(owner).setFeeToSetter(feetoo.address)
        );
    });

    it("Change feeto setter, then set feeto it to new address", async function () {
        //owner changes feeto setter to feetoo address
        await expect(
            factory.connect(owner).setFeeToSetter(feetoo.address)
        );
        await expect(
            factory.connect(feetoo).setFeeTo(feetoo.address)
        );
        //owner does not have any right
        await expect(
            factory.connect(owner).setFeeToSetter(feetoo.address)
        ).to.revertedWith('FORBIDDEN');
        await expect(
            factory.connect(owner).setFeeTo(feetoo.address)
        ).to.revertedWith('FORBIDDEN');
    });

    it("STORY:- swap tokens, check if fees are correctly computed", async function () {
        let date = new Date();
        const deadline = date.setTime(date.getTime() + 2 * 86400000); // +2 days
        console.log('\nOWNER sets feetoo adress to ', feetoo.address);
        factory.connect(owner).setFeeTo(feetoo.address);
        //console.log('feetoo addrs gets approve for nativeToken and tknB from router');
        //await tokenB.connect(feetoo).approve(router.address, 10000000000);
        //await nativeToken.connect(feetoo).approve(router.address, 10000000000);

        console.log('\nADDR1 initial supplies');
        let owner_initial_native_balance = await nativeToken.balanceOf(owner.address);
        let owner_initial_b_balance = await tokenB.balanceOf(owner.address);
        console.log('owner tkn native balance', owner_initial_native_balance.toString());
        console.log('owner tkn b balance', owner_initial_b_balance.toString());
        await tokenB.connect(addr1).approve(router.address, 10000000000);
        await nativeToken.connect(addr1).approve(router.address, 10000000000);
        await tokenB.connect(owner).mint(1000000);
        await tokenB.connect(owner).transfer(addr1.address, 1000000 );
        await nativeToken.connect(owner).mint(1000000);
        await nativeToken.connect(owner).transfer(addr1.address, 1000000 );
        let addr1_initial_native_balance = await nativeToken.balanceOf(addr1.address);
        let addr1_initial_b_balance = await tokenB.balanceOf(addr1.address);
        console.log('addr1 tkn native balance', addr1_initial_native_balance.toString());
        console.log('addr1 tkn b balance', addr1_initial_b_balance.toString());

        console.log('\nADDR1 deposits 100000 for both A and B tokens');
        let firstdepositA = 100000;
        let firstdepositB = 100000;
        await router.connect(addr1).addLiquidity(
            nativeToken.address,
            tokenB.address,
            firstdepositA,
            firstdepositB,
            0,
            0,
            addr1.address,
            deadline
        );
        const pairAddress = await factory.getPair(nativeToken.address, tokenB.address);
        const pairContract = await ethers.getContractFactory("Pair");
        const pair = await pairContract.attach(pairAddress);
        await pair.connect(addr1).approve(router.address, 10000000000);
        addr1_initial_native_balance = await nativeToken.balanceOf(addr1.address);
        addr1_initial_b_balance = await tokenB.balanceOf(addr1.address);
        let addr1_pair_balance = await pair.balanceOf(addr1.address);
        console.log('addr1 tkn native balance', addr1_initial_native_balance.toString());
        console.log('addr1 tkn b balance', addr1_initial_b_balance.toString());
        console.log('addr1_pair_balance', addr1_pair_balance.toString());

        console.log('\nLets Swap some coins, to check the fees generated. LPs of addr1 should not change');
        for(let i = 0; i < 3; i++) {
            console.log('\tNormal swap 10000tknB per X native swapExactTokensForTokens');
            await router.connect(addr1).swapExactTokensForTokens(
                10000,
                0,
                [tokenB.address, nativeToken.address],
                addr1.address,
                deadline
            );
            addr1_initial_native_balance = await nativeToken.balanceOf(addr1.address);
            addr1_initial_b_balance = await tokenB.balanceOf(addr1.address);
            addr1_pair_balance = await pair.balanceOf(addr1.address);
            console.log('addr1 tkn native balance', addr1_initial_native_balance.toString());
            console.log('addr1 tkn b balance', addr1_initial_b_balance.toString());
            console.log('addr1_pair_balance', addr1_pair_balance.toString());
            console.log('\tReverse swap X native per 10000 tknB swapTokensForExactTokens');
            await router.connect(addr1).swapTokensForExactTokens(
                10000,
                100000,
                [nativeToken.address, tokenB.address],
                addr1.address,
                deadline
            );
            addr1_initial_native_balance = await nativeToken.balanceOf(addr1.address);
            addr1_initial_b_balance = await tokenB.balanceOf(addr1.address);
            addr1_pair_balance = await pair.balanceOf(addr1.address);
            console.log('addr1 tkn native balance', addr1_initial_native_balance.toString());
            console.log('addr1 tkn b balance', addr1_initial_b_balance.toString());
            console.log('addr1_pair_balance', addr1_pair_balance.toString());
        }

        console.log('\nAddr1 removes all liquidity from the pool.' +
            'Lets check how many LPs have been generated as rewards in feeto addr...');
        await router.connect(addr1).removeLiquidity(
            nativeToken.address,
            tokenB.address,
            addr1_pair_balance,
            0,
            0,
            addr1.address,
            deadline
        );
        addr1_initial_native_balance = await nativeToken.balanceOf(addr1.address);
        addr1_initial_b_balance = await tokenB.balanceOf(addr1.address);
        addr1_pair_balance = await pair.balanceOf(addr1.address);
        console.log('addr1 tkn native balance', addr1_initial_native_balance.toString());
        console.log('addr1 tkn b balance', addr1_initial_b_balance.toString());
        console.log('addr1_pair_balance', addr1_pair_balance.toString());
        feetoo_pair_balance = await pair.balanceOf(feetoo.address);
        console.log('feetoo_pair_balance: LPs generated as fees', feetoo_pair_balance.toString());

        console.log('\nNow, address feetoo removes the tokens from the Router, ' +
            'after approving spending for LPs!');
        await pair.connect(feetoo).approve(router.address, 10000000000);
        await router.connect(feetoo).removeLiquidity(
            nativeToken.address,
            tokenB.address,
            feetoo_pair_balance,
            0,
            0,
            feetoo.address,
            deadline
        );
        feetoo_initial_native_balance = await nativeToken.balanceOf(feetoo.address);
        feetoo_initial_b_balance = await tokenB.balanceOf(feetoo.address);
        feetoo_pair_balance = await pair.balanceOf(feetoo.address);
        console.log('feetoo tkn native balance', feetoo_initial_native_balance.toString());
        console.log('feetoo tkn b balance', feetoo_initial_b_balance.toString());
        console.log('feetoo_pair_balance', feetoo_pair_balance.toString());
        let {0: reserves0, 1:reserves1} = await pair.getReserves();
        console.log('Reserves still in the pair nativetkn:',reserves0.toString(),
            'nativeB:',reserves1.toString());

        console.log('\nAddLiquidity from owner, 1000000tknative, 500000tkB');
        let ownerdepositA = 1000000;
        let ownerdepositB = 1000000;
        await router.connect(owner).addLiquidity(
            nativeToken.address,
            tokenB.address,
            ownerdepositA,
            ownerdepositB,
            0,
            0,
            owner.address,
            deadline
        );
        let {0: reserves00, 1:reserves10} = await pair.getReserves();
        console.log('Reserves in the pair nativetkn:',reserves00.toString(),
            'nativeB:',reserves10.toString());
        owner_native_balance = await nativeToken.balanceOf(owner.address);
        owner_b_balance = await tokenB.balanceOf(owner.address);
        owner_pair_balance = await pair.balanceOf(owner.address);
        console.log('owner_native_balance tkn native balance', owner_native_balance.toString());
        console.log('owner_b_balance tkn b balance', owner_b_balance.toString());
        console.log('owner_pair_balance', owner_pair_balance.toString());

        console.log("\nOwner starts swapping 3x times 100000 ntv->B, 100000 B->ntv")
        //aquest es el test, forço un swap per a mirar les fees generades.
        //Per a comprovar valors exactes, deixar nomes un swap de 10000 (no loop, no doble swap)
        for(let i = 0; i < 3; i++) {
            await router.connect(owner).swapExactTokensForTokens(
                10000,
                0,
                [tokenB.address, nativeToken.address],
                owner.address,
                deadline
            );
            await router.connect(owner).swapExactTokensForTokens(
                10000,
                0,
                [nativeToken.address, tokenB.address],
                owner.address,
                deadline
            );
            console.log("Swapped", i);
        }
        owner_native_balance = await nativeToken.balanceOf(owner.address);
        owner_b_balance = await tokenB.balanceOf(owner.address);
        owner_pair_balance = await pair.balanceOf(owner.address);
        console.log('owner_native_balance tkn native balance', owner_native_balance.toString());
        console.log('owner_b_balance tkn b balance', owner_b_balance.toString());
        console.log('owner_pair_balance', owner_pair_balance.toString());


        console.log('\nOwner removes all liquidity from the pool.' +
            'Lets check how many LPs have been generated as rewards in feeto addr...');
        await pair.connect(owner).approve(router.address, 10000000000);
        await router.connect(owner).removeLiquidity(
            nativeToken.address,
            tokenB.address,
            owner_pair_balance,
            0,
            0,
            owner.address,
            deadline
        );
        owner_initial_native_balance = await nativeToken.balanceOf(owner.address);
        owner_initial_b_balance = await tokenB.balanceOf(owner.address);
        owner_pair_balance = await pair.balanceOf(owner.address);
        console.log('owner tkn native balance', owner_initial_native_balance.toString());
        console.log('owner tkn b balance', owner_initial_b_balance.toString());
        console.log('owner_pair_balance', owner_pair_balance.toString());
        feetoo_pair_balance = await pair.balanceOf(feetoo.address);
        console.log('feetoo_pair_balance: LPs generated as fees', feetoo_pair_balance.toString());

        console.log('\nNow, address feetoo removes the tokens from the Router, ');
        await router.connect(feetoo).removeLiquidity(
            nativeToken.address,
            tokenB.address,
            feetoo_pair_balance,
            0,
            0,
            feetoo.address,
            deadline
        );
        feetoo_initial_native_balance = await nativeToken.balanceOf(feetoo.address);
        feetoo_initial_b_balance = await tokenB.balanceOf(feetoo.address);
        feetoo_pair_balance = await pair.balanceOf(feetoo.address);
        console.log('feetoo tkn native balance', feetoo_initial_native_balance.toString());
        console.log('feetoo tkn b balance', feetoo_initial_b_balance.toString());
        console.log('feetoo_pair_balance', feetoo_pair_balance.toString());
        let {0: reserves03, 1:reserves13} = await pair.getReserves();
        console.log('Reserves still in the pair nativetkn:',reserves03.toString(),
            'nativeB:',reserves13.toString());

        console.log('[!] So even if the set the denom to 2 or 3, we still get the results correctly and we can retrieve ' +
            'all LP fees without problem. There is also a minimum hard limit for a pool, it always leaves at least 1tk for the ' +
            'stronger pair, no matter the swaps performed and the fees taken');
    });

    it("Swap tokens, complete functionality + swaps + 2 users + fees", async function () {
        let date = new Date();
        const deadline = date.setTime(date.getTime() + 2 * 86400000); // +2 days
        console.log('\nOWNER sets feetoo adress to ', feetoo.address);
        factory.connect(owner).setFeeTo(feetoo.address);
        console.log('feetoo addrs gets approve for nativeToken and tknB from router');
        await tokenB.connect(feetoo).approve(router.address, 10000000000);
        await nativeToken.connect(feetoo).approve(router.address, 10000000000);

        //OWNER Initial supplies
        console.log('\nOWNER initial supplies');
        let owner_initial_native_balance = await nativeToken.balanceOf(owner.address);
        let owner_initial_b_balance = await tokenB.balanceOf(owner.address);
        console.log('owner tkn native balance', owner_initial_native_balance.toString());
        console.log('owner tkn b balance', owner_initial_b_balance.toString());

        //FIRST liquidity deposit from owner
        //Inside the Pair.sol _mintFee function (the one who sends the fees to the dev addrs)
        //   these are the var values at this point (got them with console.logs, which are removed now):
        //  	_mintFee feeTo 0x15d34aaf54267db7d7c367839aaf71a00a2c6a65
        //  	_mintFee feeOn true
        //  	_mintFee klast 0
        //   (Note that feeTo address will change in every test execution, as new addresses are generated)
        //   FeeOn will be true as long as we set a feetoo address (we did some lines above, see below),
        //   otherwise this will be false and fees will not be considered. Need to do this:
        //      factory.connect(owner).setFeeTo(feetoo.address);
        //
        console.log('\nOWNER deposits 100000 for both A and B tokens');
        let firstdeposit = 100000;
        await router.connect(owner).addLiquidity(
            nativeToken.address,
            tokenB.address,
            firstdeposit,
            firstdeposit,
            0,
            0,
            owner.address,
            deadline
        );
        let owner_native_balance = await nativeToken.balanceOf(owner.address);
        let owner_b_balance = await tokenB.balanceOf(owner.address);
        expect(owner_native_balance).equal( owner_initial_native_balance.sub(firstdeposit) );
        expect(owner_b_balance).equal( owner_initial_b_balance.sub(firstdeposit) );
        const pairAddress = await factory.getPair(nativeToken.address, tokenB.address);
        expect(pairAddress).not.equal(0);
        const pairContract = await ethers.getContractFactory("Pair");
        const pair = await pairContract.attach(pairAddress);
        //find balance of pair native-tknb for owner, which should be 99000 (100k - blocked first deposit)
        let owner_pair_balance = await pair.balanceOf(owner.address);
        expect(owner_pair_balance).equal(99000);
        let {0: reserves0, 1:reserves1} = await pair.getReserves();
        expect(reserves0).equal(firstdeposit);
        expect(reserves1).equal(firstdeposit);
        console.log('owner tkn native balance', owner_native_balance.toString());
        console.log('owner tkn b balance', owner_b_balance.toString());
        console.log('owner LP balance', owner_pair_balance.toString());
        console.log('LP pool reserves0', reserves0.toString());
        console.log('LP pool reserves1', reserves1.toString());

        //OWNER SWAPS 100 TOKENA for TOKENB
        console.log('\nOWNER swaps 1000 tokens A for B');
        let swappeda = 10000;
        await router.connect(owner).swapExactTokensForTokens(
            swappeda,
            0,
            [nativeToken.address, tokenB.address],
            owner.address,
            deadline
        );
        owner_native_balance = await nativeToken.balanceOf(owner.address);
        owner_b_balance = await tokenB.balanceOf(owner.address);
        expect(owner_native_balance).equal( owner_initial_native_balance.sub(firstdeposit).sub(swappeda)  );
        expect(owner_b_balance).equal( owner_initial_b_balance.sub(firstdeposit).add(9079)  );
        owner_pair_balance = await pair.balanceOf(owner.address);
        console.log('owner tkn native balance', owner_native_balance.toString());
        console.log('owner tkn b balance (swapped A for B - fees)', owner_b_balance.toString());
        console.log('owner LP balance', owner_pair_balance.toString());
        let {0: reserves0_1, 1:reserves1_1} = await pair.getReserves();
        console.log('LP pool reserves0', reserves0_1.toString());
        console.log('LP pool reserves1', reserves1_1.toString());
        //check whether the fees are in the feeto address
        feeto_native_balance = await nativeToken.balanceOf(feetoo.address);
        feeto_b_balance = await tokenB.balanceOf(feetoo.address);
        let feeto_pair_balance = await pair.balanceOf(feetoo.address);
        console.log('feeto addrs tkn native balance', feeto_native_balance.toString());
        console.log('feeto addrs tkn b balance', feeto_b_balance.toString());
        console.log('feeto addrs pair LP balance', feeto_pair_balance.toString());


        //ADDR3 SWAPS SOME COINS
        console.log('\nADDR3 SWAPS 1000 tokens B for A. Getting permission for tkb and tka, minting 1000tkb from owner and transferring them to addr3.');
        console.log('\tBefore swap');
        await tokenB.connect(addr3).approve(router.address, 10000000000);
        await nativeToken.connect(addr3).approve(router.address, 10000000000);
        await tokenB.connect(owner).mint(1000);
        await tokenB.connect(owner).transfer(addr3.address, 1000 );
        let addr3_native_balance = await nativeToken.balanceOf(addr3.address);
        let addr3_b_balance = await tokenB.balanceOf(addr3.address);
        console.log('addr3 tkn native balance', addr3_native_balance.toString());
        console.log('addr3 tkn b balance', addr3_b_balance.toString());
        let {0: reserves0_3, 1:reserves1_3} = await pair.getReserves();
        console.log('LP pool reserves0', reserves0_3.toString());
        console.log('LP pool reserves1', reserves1_3.toString());

        await router.connect(addr3).swapExactTokensForTokens(
            1000,
            0,
            [tokenB.address, nativeToken.address],
            addr3.address,
            deadline
        );
        console.log('\tAfter swap');
        addr3_native_balance = await nativeToken.balanceOf(addr3.address);
        addr3_b_balance = await tokenB.balanceOf(addr3.address);
        console.log('addr3 tkn native balance', addr3_native_balance.toString());
        console.log('addr3 tkn b balance', addr3_b_balance.toString());
        let {0: reserves0_2, 1:reserves1_2} = await pair.getReserves();
        console.log('LP pool reserves0', reserves0_2.toString());
        console.log('LP pool reserves1', reserves1_2.toString());

        //checking whether the fees are anywhere. NOT YET! we should wait for a deposit or withdraw
        //event!
        feeto_native_balance = await nativeToken.balanceOf(feetoo.address);
        feeto_b_balance = await tokenB.balanceOf(feetoo.address);
        feeto_pair_balance = await pair.balanceOf(feetoo.address);
        console.log('feeto addrs tkn native balance', feeto_native_balance.toString());
        console.log('feeto addrs tkn b balance', feeto_b_balance.toString());
        console.log('feeto addrs pair LP balance', feeto_pair_balance.toString());

        //
        // OWNER deposits 100000 tkA. This will activate the transfer of fees, since
        // kLast (in Pair.sol) will no longer be zero. WIthdrawns will also activate transfer fees
        // In this example, this jumps inside Pair._mintFee function, whose inside vars are
        //    _mintFee feeTo 0x15d34aaf54267db7d7c367839aaf71a00a2c6a65
        //    _mintFee feeOn true
        //    _mintFee klast 10000000000
        //    _mintFee rootK 100007
        //    _mintFee rootKLast 100000
        //    _mintFee numerator 700000
        //    _mintFee denominator 400021
        //    _mintFee liquidity 1 // this is the number of LPs minted as fees!
        //
        console.log('\nOWNER deposits 100000 for both A and B tokens. This activates the fee transfer that should be sent to feeto addres');
        await router.connect(owner).addLiquidity(
            nativeToken.address,
            tokenB.address,
            100000,
            100000,
            0,
            0,
            owner.address,
            deadline
        );
        //checking whether the fees are in our wallet...
        feeto_native_balance = await nativeToken.balanceOf(feetoo.address);
        feeto_b_balance = await tokenB.balanceOf(feetoo.address);
        feeto_pair_balance = await pair.balanceOf(feetoo.address);
        console.log('feeto addrs tkn native balance', feeto_native_balance.toString());
        console.log('feeto addrs tkn b balance', feeto_b_balance.toString());
        console.log('feeto addrs pair LP balance', feeto_pair_balance.toString());


        console.log('\nOWNER deposits AGAIN 100000 for both A and B tokens. This activates the fee transfer that should be sent to feeto addres');
        await router.connect(owner).addLiquidity(
            nativeToken.address,
            tokenB.address,
            100000,
            100000,
            0,
            0,
            owner.address,
            deadline
        );
        //checking whether the fees are anywhere
        feeto_native_balance = await nativeToken.balanceOf(feetoo.address);
        feeto_b_balance = await tokenB.balanceOf(feetoo.address);
        feeto_pair_balance = await pair.balanceOf(feetoo.address);
        console.log('feeto addrs tkn native balance', feeto_native_balance.toString());
        console.log('feeto addrs tkn b balance', feeto_b_balance.toString());
        console.log('feeto addrs pair LP balance', feeto_pair_balance.toString());

        //
        // Let's swap some more and see how the fees increase for the sake of complexity
        //
        console.log('\nLets swap some more, add liquidity again and check again the fees');
        for(var i = 0; i < 4; i++){
            await router.connect(owner).swapExactTokensForTokens(
                10000,
                0,
                [tokenB.address, nativeToken.address],
                owner.address,
                deadline
            );

            await router.connect(owner).swapExactTokensForTokens(
                10000,
                0,
                [nativeToken.address, tokenB.address],
                owner.address,
                deadline
            );
            console.log('Swapping', i);
        }
        // After executing this addLiquidity, we find
        //      _mintFee feeTo 0x15d34aaf54267db7d7c367839aaf71a00a2c6a65
        //      _mintFee feeOn true
        //      _mintFee klast 80562592425
        //      _mintFee rootK 283892
        //      _mintFee rootKLast 283835
        //      _mintFee numerator 16177569
        //      _mintFee denominator 1135511
        //      _mintFee liquidity 14
        await router.connect(owner).addLiquidity(
            nativeToken.address,
            tokenB.address,
            10,
            10,
            0,
            0,
            owner.address,
            deadline
        );
        //checking whether the fees are anywhere
        feeto_native_balance = await nativeToken.balanceOf(feetoo.address);
        feeto_b_balance = await tokenB.balanceOf(feetoo.address);
        feeto_pair_balance = await pair.balanceOf(feetoo.address);
        console.log('feeto addrs pair LP balance', feeto_pair_balance.toString());
        let {0: reserves0_4, 1:reserves1_4} = await pair.getReserves();
        console.log('LP pool reserves0', reserves0_4.toString());
        console.log('LP pool reserves1', reserves1_4.toString());
        console.log('LP owner', (await pair.balanceOf(owner.address) ).toString() );

        console.log('\nFinally we removeliquidity from our feetoo address, which received the LPs minted as fees.');
        // Since there have been no swaps here, we don't have any fees to earn or mint
        // with the withdrawal. rootK == rootKLast therefore we do not get any fees.
        // 	_mintFee feeTo 0x15d34aaf54267db7d7c367839aaf71a00a2c6a65
        // 	_mintFee feeOn true
        // 	_mintFee klast 80599969590
        // 	_mintFee rootK 283901
        // 	_mintFee rootKLast 283901
        await pair.connect(feetoo).approve(router.address, 50000);
        await router.connect(feetoo).removeLiquidity(
            nativeToken.address,
            tokenB.address,
            10,
            0,
            0,
            feetoo.address,
            deadline
        );

    });

});