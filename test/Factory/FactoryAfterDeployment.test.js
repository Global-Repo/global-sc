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
    expect(await factory.feeSetter()).to.equal(owner.address);
  });

  it("Check the proper init code hash", async function () {
    expect(
        await factory.INIT_CODE_PAIR_HASH()
    ).to.equal("0x8481eafacef1558a28823b7aa843a0aeb2b9827265932812b7572b5a9f22f830");
  });
});