const ethers = require("hardhat").ethers;
const { expect } = require("chai");
const {BigNumber} = require("@ethersproject/bignumber");

const TOKEN_DECIMALS = 18;
const BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER = BigNumber.from(10).pow(TOKEN_DECIMALS);

let factory;
let pair;
let addressAB;

beforeEach(async function () {
    [owner, addr1, addr2, ...addrs] = await ethers.getSigners();

    const Factory = await ethers.getContractFactory("Factory");
    factory = await Factory.deploy(owner.address);
    await factory.deployed();

    const TokenA = await ethers.getContractFactory("BEP20");
    tokenA = await TokenA.deploy('tokenA', 'AA');
    await tokenA.deployed();

    const TokenB = await ethers.getContractFactory("BEP20");
    tokenB = await TokenB.deploy('tokenB', 'BB');
    await tokenB.deployed();

    // Set up scenarios
    const INITIAL_SUPPLY = BigNumber.from(100).mul(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER);

    expect(await tokenA.totalSupply()).to.equal(0);
    expect(await tokenB.totalSupply()).to.equal(0);

    await tokenA.mint(INITIAL_SUPPLY);
    expect(await tokenA.totalSupply()).to.equal(INITIAL_SUPPLY);

    await tokenB.mint(INITIAL_SUPPLY);
    expect(await tokenB.totalSupply()).to.equal(INITIAL_SUPPLY);

    /*pair = await factory.createPair(tokenA.address, tokenB.address);
    addressAB = await factory.getPair(tokenA.address, tokenB.address);*/

    const pairContract = await ethers.getContractFactory("Pair");
    await factory.createPair(tokenA.address, tokenB.address);
    addressAB = await factory.getPair(tokenA.address, tokenB.address);
    pair = await pairContract.attach(addressAB);

});

describe("Factory: Fees", function () {
    it("Only the fee setter can modify the fee setter", async function () {
        //provem de canviar el feesetter desde la addr1 pero el feesetter actual es l'owner -> casque
        await expect(
            factory.connect(addr1).setFeeSetter(addr1.address)
        ).to.be.revertedWith("FORBIDDEN");

        //provem de canviar el feeSetter des de l'owner , que es l'actual setter
        await factory.setFeeSetter(addr1.address);

        //comprovem que el feesetter s'ha configurat be al addr1
        expect(await factory.feeSetter()).to.equal(addr1.address);
        //comprovem que ja no podem canviar feesetter des de owner
        await expect(
            factory.setFeeSetter(addr2.address)
        ).to.be.revertedWith("FORBIDDEN");

        //comprovem que connectant-nos amb la compta de feesetter el podem tornar a canviar
        await factory.connect(addr1).setFeeSetter(owner.address);

        //comprovem que s'ha posat a posar el feesetter a l'owner
        expect(await factory.feeSetter()).to.equal(owner.address);
    });

    it("Only the fee setter can modify the swap fee", async function () {

        await expect(
            factory.setSwapFee(addressAB,100001)
        ).to.be.revertedWith("GlobalPair: FORBIDDEN_FEE");

        await expect(
            factory.connect(addr1).setSwapFee(addressAB,85)
        ).to.be.revertedWith("GlobalFactory: FORBIDDEN");

        await factory.setSwapFee(addressAB,25);
        expect(await pair.swapFee()).to.equal(25);

        await expect(
            factory.connect(addr1).setSwapFee(addressAB,100)
        ).to.be.revertedWith("GlobalFactory: FORBIDDEN");

        await factory.setFeeSetter(addr1.address);

        await expect(
            factory.setSwapFee(addressAB,100)
        ).to.be.revertedWith("GlobalFactory: FORBIDDEN");

        await factory.connect(addr1).setSwapFee(addressAB,100);
        expect(await pair.swapFee()).to.equal(100);
    });


    it("The swap fees cannot be set above 10000", async function () {
        await factory.setSwapFee(addressAB,100);
        expect(await pair.swapFee()).to.equal(100);
        await expect(factory.setSwapFee(addressAB,110000)).to.be.revertedWith("GlobalPair: FORBIDDEN_FEE");
        await factory.setSwapFee(addressAB,1000);
        expect(await pair.swapFee()).to.equal(1000);
        await expect(factory.setSwapFee(addressAB,100001)).to.be.revertedWith("GlobalPair: FORBIDDEN_FEE");
        await factory.setSwapFee(addressAB,10000);
        expect(await pair.swapFee()).to.equal(10000);
        await expect(factory.setSwapFee(addressAB,200000)).to.be.revertedWith("GlobalPair: FORBIDDEN_FEE");
        await factory.setSwapFee(addressAB,100000);
        expect(await pair.swapFee()).to.equal(100000);
    });

    it("Only the fee setter can modify the dev fee", async function () {
        await expect(
            factory.connect(addr1).setDevFee(addressAB,1)
        ).to.be.revertedWith("GlobalFactory: FORBIDDEN");

        await factory.setDevFee(addressAB,1);
        expect(await pair.devFee()).to.equal(1);

        await expect(
            factory.connect(addr1).setDevFee(addressAB,2)
        ).to.be.revertedWith("GlobalFactory: FORBIDDEN");

        await factory.setFeeSetter(addr1.address);

        await expect(
            factory.setDevFee(addressAB,2)
        ).to.be.revertedWith("GlobalFactory: FORBIDDEN");

        await factory.connect(addr1).setDevFee(addressAB,2);
        expect(await pair.devFee()).to.equal(2);

    });


    it("The dev fees cannot be set at 100% or above of the total fees", async function () {
        await factory.setDevFee(addressAB,85);
        expect(await pair.devFee()).to.equal(85);
        await expect(factory.setDevFee(addressAB,0)).to.be.revertedWith("GlobalFactory: FORBIDDEN_FEE");
        await factory.setDevFee(addressAB,100);
        expect(await pair.devFee()).to.equal(100);
        await expect(factory.setDevFee(addressAB,0)).to.be.revertedWith("GlobalFactory: FORBIDDEN_FEE");
        await factory.setDevFee(addressAB,255);
        expect(await pair.devFee()).to.equal(255);
        await expect(factory.setDevFee(addressAB,0)).to.be.revertedWith("GlobalFactory: FORBIDDEN_FEE");
    });

});


