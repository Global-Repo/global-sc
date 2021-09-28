const ethers = require("hardhat").ethers;
const { expect } = require("chai");

let factory;

beforeEach(async function () {
  [owner, addr1, addr2, ...addrs] = await ethers.getSigners();

  const Factory = await ethers.getContractFactory("Factory");
  factory = await Factory.deploy(owner.address);
  await factory.deployed();
});

describe("Factory: After deployment", function () {
  it("Should to have zero pairs created", async function () {
    expect(await factory.allPairsLength()).to.equal(0);
  });

  it("Fee setter must be the owner by default", async function () {
    expect(await factory.feeToSetter()).to.equal(owner.address);
  });

  it("Check the proper init code hash", async function () {
    expect(
        await factory.INIT_CODE_PAIR_HASH()
    ).to.equal("0x0865945bff91b28c3ca8845851f222a10ec2c08f688bcaced2e8e2c23dff668b");
  });
});