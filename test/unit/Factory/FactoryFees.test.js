const ethers = require("hardhat").ethers;
const { expect } = require("chai");

let factory;

beforeEach(async function () {
    [owner, addr1, addr2, ...addrs] = await ethers.getSigners();

    const Factory = await ethers.getContractFactory("Factory");
    factory = await Factory.deploy(owner.address);
    await factory.deployed();
});

describe("Factory: Fees", function () {
    it("Only the fee setter can modify the fee setter", async function () {
        //provem de canviar el feesetter desde la addr1 pero el feesetter actual es l'owner -> casque
        await expect(
            factory.connect(addr1).setFeeSetter(addr1.address)
        ).to.be.revertedWith("FORBIDDEN");

        //provem de canviar el feeSetter des de l'owner , que es l'actual setter
        expect(await factory.setFeeSetter(addr1.address)).to.emit(factory, 'FeeSetterChanged').withArgs(addr1.address);

        //comprovem que el feesetter s'ha configurat be al addr1
        expect(await factory.feeSetter()).to.equal(addr1.address);
        //comprovem que ja no podem canviar feesetter des de owner
        await expect(
            factory.setFeeSetter(addr2.address)
        ).to.be.revertedWith("FORBIDDEN");

        //comprovem que connectant-nos amb la compta de feesetter el podem tornar a canviar
        await expect(
            factory.connect(addr1).setFeeSetter(owner.address)
        ).to.emit(factory, 'FeeSetterChanged').withArgs(owner.address);

        //comprovem que s'ha posat a posar el feesetter a l'owner
        expect(await factory.feeSetter()).to.equal(owner.address);
    });

    it("Only the fee setter can modify the swap fee", async function () {

        await expect(
            factory.connect(addr1).setSwapFee(25)
        ).to.be.revertedWith("FORBIDDEN");

        expect(await factory.setSwapFee(25)).to.emit(factory, 'SwapFeeChanged').withArgs(25);

        await expect(
            factory.connect(addr1).setSwapFee(10)
        ).to.be.revertedWith("FORBIDDEN");

        expect(await factory.setFeeSetter(addr1.address)).to.emit(factory, 'FeeSetterChanged').withArgs(addr1.address);

        await expect(
            factory.setSwapFee(10)
        ).to.be.revertedWith("FORBIDDEN");

        await expect(
            factory.connect(addr1).setSwapFee(10)
        ).to.emit(factory, 'SwapFeeChanged').withArgs(10);
    });


    it("The swap fees cannot be set above 25", async function () {
        expect(await factory.setSwapFee(15)).to.emit(factory, 'SwapFeeChanged').withArgs(15);
        await expect(factory.setSwapFee(35)).to.be.revertedWith("You cannot set the swap fees above 25");
        expect(await factory.setSwapFee(25)).to.emit(factory, 'SwapFeeChanged').withArgs(25);
        await expect(factory.setSwapFee(100)).to.be.revertedWith("You cannot set the swap fees above 25");
        expect(await factory.setSwapFee(20)).to.emit(factory, 'SwapFeeChanged').withArgs(20);
        await expect(factory.setSwapFee(26)).to.be.revertedWith("You cannot set the swap fees above 25");
    });

    it("Only the fee setter can modify the dev fee", async function () {
        await expect(
            factory.connect(addr1).setDevFee(addr1.address,2,3)
        ).to.be.revertedWith("FORBIDDEN");

        expect(await factory.setDevFee(addr1.address,2,3)).to.emit(factory, 'DevFeeChanged').withArgs(addr1.address,2,3);

        expect(await factory.setFeeSetter(addr1.address)).to.emit(factory, 'FeeSetterChanged').withArgs(addr1.address);

        await expect(
            factory.setDevFee(addr2.address,1,5)
        ).to.be.revertedWith("FORBIDDEN");

        await expect(
            factory.connect(addr1).setDevFee(addr2.address,1,5)
        ).to.emit(factory, 'DevFeeChanged').withArgs(addr2.address,1,5);

    });


    it("The dev fees cannot be set at 100% or above of the total fees", async function () {
        expect(await factory.setDevFee(addr1.address,2,3)).to.emit(factory, 'DevFeeChanged').withArgs(addr1.address,2,3);
        await expect(factory.setDevFee(addr2.address,3,2)).to.be.revertedWith("You cannot set the fees to the total or more tnan the total of the fees");
        expect(await factory.setDevFee(addr2.address,1,5)).to.emit(factory, 'DevFeeChanged').withArgs(addr2.address,1,5);
        await expect(factory.setDevFee(owner.address,2,2)).to.be.revertedWith("You cannot set the fees to the total or more tnan the total of the fees");
        expect(await factory.setDevFee(owner.address,2,10)).to.emit(factory, 'DevFeeChanged').withArgs(owner.address,2,10);
        await expect(factory.setDevFee(owner.address,100,99)).to.be.revertedWith("You cannot set the fees to the total or more tnan the total of the fees");
    });

});


