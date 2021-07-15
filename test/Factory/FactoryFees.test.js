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
    await expect(
        factory.connect(addr1).setFeeSetter(addr1.address)
    ).to.be.revertedWith("FORBIDDEN");

    expect(await factory.setFeeSetter(addr1.address));
    expect(await factory.feeSetter()).to.equal(addr1.address);
  });
});