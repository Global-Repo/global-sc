const ethers = require("hardhat").ethers;
const { expect } = require("chai");
const { BigNumber } = require("@ethersproject/bignumber");

const TOKEN_DECIMALS = 18;
const BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER = BigNumber.from(10).pow(TOKEN_DECIMALS);
const NATIVE_TOKEN_PER_BLOCK = BigNumber.from(40).mul(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER);
const DAY_IN_SECONDS = 86400;
const SHOWALLPRINTS = false;

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

var print = async function(str, ...args){
    if(SHOWALLPRINTS) console.log(str, args.join('') );
}


var getTokenPair_helper = async function(token0, token1){
    let pairaddr = await factory.getPair(token0.address, token1.address);
    const pairtkAweth = await (await ethers.getContractFactory("Pair")).attach(pairaddr) ;
    return pairtkAweth;
}

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
        true,
        _maxWithdrawalInterval,
        _withDrawalFeeOfLps,
        _withDrawalFeeOfLps,
        _performanceFeesOfNativeTokens,
        _performanceFeesOfNativeTokens
    );

    print('\t[afegirPool] Owner created a pool in Router from ', token0.address, ' to ', token1.address,
        ' and received ',owner_initial_balancepair.toString(), ' LPs. Then it created a MC pool for the LP.');
}

beforeEach(async function () {
    this.timeout(10000);
    [owner, addr1, addr2, lockedVault, devaddress, ...addrs] = await ethers.getSigners();

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

    const TokenC = await ethers.getContractFactory("BEP20");
    tokenC = await TokenC.deploy('tokenC', 'CC');
    await tokenC.deployed();

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
    await tokenC.mint(INITIAL_SUPPLY);
    await weth.mint(INITIAL_SUPPLY);
    await nativeToken.mint(INITIAL_SUPPLY);

    await nativeToken.transferOwnership(masterChef.address);

    await tokenA.transfer(addr1.address,INITIAL_SUPPLY_ADDR1);
    await tokenB.transfer(addr1.address,INITIAL_SUPPLY_ADDR1);
    await tokenC.transfer(addr1.address,INITIAL_SUPPLY_ADDR1);
    await nativeToken.transfer(addr1.address,INITIAL_SUPPLY_ADDR1);
    await weth.transfer(addr1.address,INITIAL_SUPPLY_ADDR1);

    await tokenA.approve(router.address, INITIAL_SUPPLY_OWNER.toHexString());
    await tokenB.approve(router.address, INITIAL_SUPPLY_OWNER.toHexString());
    await tokenC.approve(router.address, INITIAL_SUPPLY_OWNER.toHexString());
    await weth.approve(router.address, INITIAL_SUPPLY_OWNER.toHexString());
    await nativeToken.approve(router.address, INITIAL_SUPPLY_OWNER.toHexString());

    await tokenA.connect(addr1).approve(router.address, INITIAL_SUPPLY_ADDR1.toHexString());
    await weth.connect(addr1).approve(router.address, INITIAL_SUPPLY_ADDR1.toHexString());
    await tokenB.connect(addr1).approve(router.address, INITIAL_SUPPLY_ADDR1.toHexString());
    await tokenC.connect(addr1).approve(router.address, INITIAL_SUPPLY_ADDR1.toHexString());
    await nativeToken.connect(addr1).approve(router.address, INITIAL_SUPPLY_ADDR1.toHexString());

    tokenAddresses.addToken(tokenAddresses.BNB(), weth.address);
});


describe("MasterChef: Fees", function () {

    it("User can't enter or leave staking for pool 0, nor retrieve funds with emergency withdraw", async function () {
        let date = new Date();
        const deadline = date.setTime(date.getTime() + 2 * 86400000);

        //native tokens in addr1
        let addr1_balance_native = await nativeToken.balanceOf(addr1.address);
        print('addr1_balance_native',addr1_balance_native.toString());
        expect(await(addr1_balance_native)).equal(
            BigNumber.from(100).mul(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER).toHexString()
        );

        //only whitelisted vaults can enter staking
        await expect ( masterChef.connect(addr1).enterStaking(
            BigNumber.from(1).mul(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER).toHexString())
        ).to.be.revertedWith("You are not trusted: you are not in the whitelist");
        await expect ( masterChef.connect(owner).enterStaking(
            BigNumber.from(1).mul(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER).toHexString())
        ).to.be.revertedWith("You are not trusted: you are not in the whitelist");

        //only whitelisted vaults can leave staking
        await expect ( masterChef.connect(addr1).leaveStaking(
            BigNumber.from(1).mul(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER).toHexString())
        ).to.be.revertedWith("You are not trusted: you are not in the whitelist");
        await expect ( masterChef.connect(owner).leaveStaking(
            BigNumber.from(1).mul(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER).toHexString())
        ).to.be.revertedWith("You are not trusted: you are not in the whitelist");

        //can't emergency withdraw from the staking pool
        expect(await masterChef.connect(addr1).emergencyWithdraw(0))
            .to.not.emit(masterChef, 'EmergencyWithdraw');
    });

    it("Create various pools, always at max path distance 2 from native pool", async function () {
        let date = new Date();
        const deadline = date.setTime(date.getTime() + 2 * 86400000); // +2 days
        await afegirPool(
            weth,
            nativeToken,
            BigNumber.from(1).mul(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER),
            1000);
        //can't add this pool, no path to weth or native
        await expect(
            afegirPool(tokenA,tokenB,BigNumber.from(1).mul(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER),1000)
        ).to.be.revertedWith("[f] Add: token/s not connected to WBNB'");
        //this one is ok
        await afegirPool(
            tokenA,
            weth,
            BigNumber.from(1).mul(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER),
            1000);
        //this one is ok too now, since we have a path for tokenB as well
        await afegirPool(
            tokenA,
            tokenB,
            BigNumber.from(1).mul(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER),
            1000);
        //this one is too far away for tokenC
        await expect(
            afegirPool(tokenB,tokenC,BigNumber.from(1).mul(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER),1000)
        ).to.be.revertedWith("[f] Add: token/s not connected to WBNB'");
        //add a closer path
        await afegirPool(
            tokenA,
            tokenC,
            BigNumber.from(1).mul(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER),
            1000);
        //now we can add pool b-c
        await afegirPool(
            tokenB,
            tokenC,
            BigNumber.from(1).mul(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER),
            1000);
        expect(await(masterChef.poolLength())).equal(6);

        let tknpair_weth_native = await getTokenPair_helper(weth, nativeToken);
        let tknpair_tokena_native = await getTokenPair_helper(tokenA, nativeToken);
        let tknpair_native_tokenb = await getTokenPair_helper(nativeToken, tokenB);
        let tknpair_weth_tokenb = await getTokenPair_helper(weth, tokenB);

        //check addr1
        let addr1_balance_pair_weth_native = await tknpair_weth_native.balanceOf(addr1.address);
        expect(await(addr1_balance_pair_weth_native)).equal(0);
        print('addr1_balance_pair_weth_native',addr1_balance_pair_weth_native);
        //check native tokens of addr1
        let addr1_balance_native = await nativeToken.balanceOf(addr1.address);
        print('addr1_balance_native',addr1_balance_native.toString());
        expect(await(addr1_balance_native)).equal(BigNumber.from(100).mul(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER).toHexString() );
    });

    it("EmergencyWithdraw (fees and no fees apply)", async function () {
        let date = new Date();
        const deadline = date.setTime(date.getTime() + 2 * 86400000); // +2 days
        //set dev address
        await masterChef.setDevAddress(devaddress.address);
        print("Eth (or BNB) addr", weth.address);
        print("tokenA addr", tokenA.address);
        print("nativeToken addr", nativeToken.address);
        print("weth addr", weth.address);

        //add weth to native pool in Router and MC
        await afegirPool(
            weth,
            nativeToken,
            BigNumber.from(10).mul(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER));

        const pairAddress2 = await factory.getPair(nativeToken.address, weth.address);
        const pairContract2 = await ethers.getContractFactory("Pair");
        const pairwethnative = await pairContract2.attach(pairAddress2);
        let {0: reserves0_wethnative, 1:reserves1_wethnative} = await pairwethnative.getReserves();
        print('pair weth-native tkns in router pool: ',
            reserves0_wethnative.toString(),
            reserves1_wethnative.toString());

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
        const pairtkAweth = await pairContract.attach(pairAddress);
        let addr1_initial_balancepair = await pairtkAweth.balanceOf(addr1.address);
        print('addr1 balancepair', addr1_initial_balancepair.toString());
        let {0: reserves0, 1:reserves1, 2:reserves_timestamp} = await pairtkAweth.getReserves();
        print('pair tknA-weth tkns in router pool: ',
            reserves0.toString(),
            reserves1.toString());

        await pairtkAweth.connect(addr1).approve(masterChef.address, addr1_initial_balancepair.mul(2));
        //owner adds pool in masterchef

        let LPfees = 40; // 0.4% withdraw fee over the withdrawal if withdrawn before deadline DAY_IN_SECONDS * 3
        await masterChef.connect(owner).addPool(
            100,
            pairtkAweth.address,
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
        addr1_balancepair = await pairtkAweth.balanceOf(addr1.address);
        print('addr1 balancepair after deposit 100000 LPs into pool_', addr1_balancepair.toString());
        print('Lps depositats a masterchef pool 2 per addr1:', ((await masterChef.userInfo(2,
            addr1.address)).amount).toString());

        //After deposit, addr1 tries to remove the LPs.
        // But we need to apply some fees since the _harvestInterval has not passed yet...
        let addr1lp_fees = BigNumber.from(addr1_lp_pool_deposit).mul(LPfees).mul(2).div(10000);
        let addr1lp_balance_minus_fees = BigNumber.from(addr1_lp_pool_deposit).sub(addr1lp_fees);
        expect(await masterChef.connect(addr1).emergencyWithdraw(2)).to.emit(masterChef, 'EmergencyWithdraw')
            .withArgs(addr1.address, 2, addr1_lp_pool_deposit, addr1lp_balance_minus_fees);

        //now we have our LPs back, but some fees apply (fees = lpdeposit * 0.004)
        expect(await(pairtkAweth.balanceOf(addr1.address))).equal(
            BigNumber.from(addr1_initial_balancepair).sub(
                BigNumber.from(addr1_lp_pool_deposit).mul(LPfees).mul(2).div(10000)
            ) );

        //Check whether the devfees are in place
        let devaddr_balance_native = await nativeToken.balanceOf(devaddress.address);
        let devaddr_balance_weth = await weth.balanceOf(devaddress.address);
        print('devaddr', devaddress.address);
        print('weth devaddr_balance', devaddr_balance_weth.toString());
        print('globals burn_balance', devaddr_balance_native.toString());

        //after the withdraw we check the tkns in both pools
        let {0: reserves0_wethnative_final, 1:reserves1_wethnative_final} = await pairwethnative.getReserves();
        print('FINAL pair wethnative tkns in router pool: ',
            reserves0_wethnative_final.toString(),
            reserves1_wethnative_final.toString());
        let {0: reserves0_final, 1:reserves1_final} = await pairtkAweth.getReserves();
        print('FINAL pair tknA-weth tkns in router pool: ',
            reserves0_final.toString(),
            reserves1_final.toString());

        //check that all tokens burned and from fees are no longer in the router pools
        expect(BigNumber.from(reserves0_wethnative_final).sub(reserves0_wethnative).
            add(reserves1_wethnative_final).sub(reserves1_wethnative).
            add(reserves0_final).sub(reserves0).
            add(reserves1_final).sub(reserves1).
            add(devaddr_balance_native).
            add(devaddr_balance_weth)).equal(-7982);
    });

    it("Withdraw and partial withdraw with earning fees.", async function() {
        this.timeout(10000);
        const NATIVE_TOKEN_PER_BLOCK = BigNumber.from(40).mul(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER);

        let date = new Date();
        const deadline = date.setTime(date.getTime() + 2 * 86400000); // +2 days
        //set dev address
        await masterChef.setDevAddress(devaddress.address);
        //Pools vars
        let allocPointMCpool=1000;
        let harvestInterval = DAY_IN_SECONDS * 3;
        let maxWithdrawalInterval= DAY_IN_SECONDS * 3;
        let PerformanceFee = 40;
        await afegirPool(weth,
            nativeToken,
            BigNumber.from(1).mul(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER),
            allocPointMCpool,
            harvestInterval,
            maxWithdrawalInterval,
            0,
            PerformanceFee);
        await afegirPool(tokenA,
            weth,
            BigNumber.from(1).mul(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER),
            allocPointMCpool,
            harvestInterval,
            maxWithdrawalInterval,
            0,
            PerformanceFee);

        //addr1 gets LPs for pair A-weth
        const result = await router.connect(addr1).addLiquidity(
            tokenA.address,weth.address,
            100000,100000,100000,100000,addr1.address,deadline
        );
        //after asking for permission, now deposit 1/10 of the LPs
        let pair_tkA_weth = await getTokenPair_helper(tokenA, weth);
        let addr1_initial_balance_pair_tkA_weth = await pair_tkA_weth.balanceOf(addr1.address);
        let addr1_lp_pool_deposit = BigNumber.from(addr1_initial_balance_pair_tkA_weth).div(10);
        await pair_tkA_weth.connect(addr1).approve(masterChef.address, addr1_initial_balance_pair_tkA_weth);
        expect(await masterChef.connect(addr1).deposit(2,addr1_lp_pool_deposit)).to.emit(masterChef, 'Deposit')
            .withArgs(addr1.address,2,addr1_lp_pool_deposit);
        let addr1_new_balancepair = await pair_tkA_weth.balanceOf(addr1.address);
        await expect(addr1_new_balancepair).equal( 90000 );

        //increase time
        await ethers.provider.send('evm_increaseTime', [(maxWithdrawalInterval)+1]);
        expect(await masterChef.connect(addr1).withdraw(2, 1000)).to.emit(masterChef, 'Withdraw')
            .withArgs(addr1.address, 2, 1000);
        let addr1_final_balancepair = await pair_tkA_weth.balanceOf(addr1.address);
        await expect(addr1_final_balancepair).equal( 91000 );
        console.log("canHarvest ", (await masterChef.canHarvest(2, addr1.address)).toString());
        console.log('balance_native_addr1', (await nativeToken.balanceOf(addr1.address)).toString());

        expect(await masterChef.connect(addr1).withdraw(2, 1000)).to.emit(masterChef, 'Withdraw')
            .withArgs(addr1.address, 2, 1000);
        let addr1_final_balancepair2 = await pair_tkA_weth.balanceOf(addr1.address);
        await expect(addr1_final_balancepair2).equal( 92000 );

        await ethers.provider.send('evm_increaseTime', [(maxWithdrawalInterval)+1]);
        console.log("pendingAccTokens ", (await masterChef.pendingNativeToken(2, addr1.address)).toString());
        console.log("canHarvest ", (await masterChef.canHarvest(2, addr1.address)).toString());
        console.log('balance_native_addr1', (await nativeToken.balanceOf(addr1.address)).toString());

        expect(await masterChef.connect(addr1).withdraw(2, 1000)).to.emit(masterChef, 'Withdraw')
            .withArgs(addr1.address, 2, 1000);
        console.log("pendingAccTokens ", (await masterChef.pendingNativeToken(2, addr1.address)).toString());
        console.log("canHarvest ", (await masterChef.canHarvest(2, addr1.address)).toString());

        console.log('balance_native_addr1', (await nativeToken.balanceOf(addr1.address)).toString());

        //TODO test payOrLockupPendingNativeToken
    });

    it("Withdraw and partial withdraw with LP fees and no fees. Withdraw reset test.", async function () {
        let date = new Date();
        const deadline = date.setTime(date.getTime() + 2 * 86400000); // +2 days
        //set dev address
        await masterChef.setDevAddress(devaddress.address);
        //Pools vars
        let allocPointMCpool=1000;
        let harvestInterval = DAY_IN_SECONDS * 4;
        let maxWithdrawalInterval= DAY_IN_SECONDS * 3;
        let withDrawalFeeOfLps = 40;
        await afegirPool(weth,
            nativeToken,
            BigNumber.from(1).mul(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER),
            allocPointMCpool,
            harvestInterval,
            maxWithdrawalInterval,
            withDrawalFeeOfLps,
            0);
        await afegirPool(tokenA,
            weth,
            BigNumber.from(1).mul(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER),
            allocPointMCpool,
            harvestInterval,
            maxWithdrawalInterval,
            withDrawalFeeOfLps,
            0);

        //addr1 gets LPs for pair A-weth
        const result = await router.connect(addr1).addLiquidity(
            tokenA.address,weth.address,
            100000,100000,100000,100000,addr1.address,deadline
        );
        let pair_tkA_weth = await getTokenPair_helper(tokenA, weth);
        let addr1_initial_balance_pair_tkA_weth = await pair_tkA_weth.balanceOf(addr1.address);
        console.log('addr1_initial_balance_pair_tkA_weth', addr1_initial_balance_pair_tkA_weth.toString());
        await expect(addr1_initial_balance_pair_tkA_weth).to.equal(100000);
        //try deposit, but needs permission
        let addr1_lp_pool_deposit = BigNumber.from(addr1_initial_balance_pair_tkA_weth).div(10);
        await expect(masterChef.connect(addr1).deposit(2,addr1_lp_pool_deposit)).to.be.revertedWith("SafeMath: subtraction overflow");
        await pair_tkA_weth.connect(addr1).approve(masterChef.address, addr1_initial_balance_pair_tkA_weth);
        //after asking for permission, now deposit 1/10 of the LPs
        expect(await masterChef.connect(addr1).deposit(2,addr1_lp_pool_deposit)).to.emit(masterChef, 'Deposit')
            .withArgs(addr1.address,2,addr1_lp_pool_deposit);

        let addr1_new_balancepair = await pair_tkA_weth.balanceOf(addr1.address);
        await expect(addr1_new_balancepair).equal( 90000 );

        //withdraw 1000 with fees = 0.4%*2, total withdrawn 992
        expect(await masterChef.connect(addr1).withdraw(2, 1000)).to.emit(masterChef, 'Withdraw')
            .withArgs(addr1.address, 2, 1000);
        await expect(await pair_tkA_weth.balanceOf(addr1.address)).equal( 90992 );
        await expect(await weth.balanceOf(devaddress.address)).equal( 7 );
        //let's do another withdraw of 1000 with fees = 0.4%*2, total withdrawn 992
        expect(await masterChef.connect(addr1).withdraw(2, 1000)).to.emit(masterChef, 'Withdraw')
            .withArgs(addr1.address, 2, 1000);
        await expect(await pair_tkA_weth.balanceOf(addr1.address)).equal( 91984 );
        await expect(await weth.balanceOf(devaddress.address)).equal( 14 );
        //now we fast forward time and withdraw 1000, no fees
        await ethers.provider.send('evm_increaseTime', [(maxWithdrawalInterval)+1]);
        expect(await masterChef.connect(addr1).withdraw(2, 1000)).to.emit(masterChef, 'Withdraw')
            .withArgs(addr1.address, 2, 1000);
        await expect(await pair_tkA_weth.balanceOf(addr1.address)).equal( 92984 );
        await expect(await weth.balanceOf(devaddress.address)).equal( 14 );
        // a deposit resets the withdraw deadline, so withdrawing should charge fees again
        expect(await masterChef.connect(addr1).deposit(2,1000)).to.emit(masterChef, 'Deposit')
            .withArgs(addr1.address,2,1000);
        await expect(await pair_tkA_weth.balanceOf(addr1.address)).equal( 91984 );
        expect(await masterChef.connect(addr1).withdraw(2, 1000)).to.emit(masterChef, 'Withdraw')
            .withArgs(addr1.address, 2, 1000);
        await expect(await pair_tkA_weth.balanceOf(addr1.address)).equal( 92976 );
        await expect(await weth.balanceOf(devaddress.address)).equal( 21 );
        //fast forward to the end of the deadline minus 1 second and deposit, new deposit resets
        //withdraw LP fees deadline
        await ethers.provider.send('evm_increaseTime', [(maxWithdrawalInterval)-1]);
        expect(await masterChef.connect(addr1).deposit(2,1000)).to.emit(masterChef, 'Deposit')
            .withArgs(addr1.address,2,1000);
        await expect(await pair_tkA_weth.balanceOf(addr1.address)).equal( 91976 );
        await ethers.provider.send('evm_increaseTime', [10]);
        expect(await masterChef.connect(addr1).withdraw(2, 1000)).to.emit(masterChef, 'Withdraw')
            .withArgs(addr1.address, 2, 1000);
        await expect(await pair_tkA_weth.balanceOf(addr1.address)).equal( 92968 );
        await expect(await weth.balanceOf(devaddress.address)).equal( 28 );
        //even after a day...
        await ethers.provider.send('evm_increaseTime', [DAY_IN_SECONDS]);
        expect(await masterChef.connect(addr1).withdraw(2, 1000)).to.emit(masterChef, 'Withdraw')
            .withArgs(addr1.address, 2, 1000);
        await expect(await pair_tkA_weth.balanceOf(addr1.address)).equal( 93960 );
        await expect(await weth.balanceOf(devaddress.address)).equal( 35 );
        //but not after 3 days since the last deposit! we withdraw everything left
        await ethers.provider.send('evm_increaseTime', [DAY_IN_SECONDS*2]);
        expect(await masterChef.connect(addr1).withdraw(2, 6000)).to.emit(masterChef, 'Withdraw')
            .withArgs(addr1.address, 2, 6000);
        await expect(await pair_tkA_weth.balanceOf(addr1.address)).equal( 99960 );
        await expect(await weth.balanceOf(devaddress.address)).equal( 35 );
        //no more LPs to withdraw
        await expect(masterChef.connect(addr1).withdraw(2, 1)).to.be.revertedWith("[f] Withdraw: you are trying to withdraw more tokens than you have. Cheeky boy. Try again.");
    });


});