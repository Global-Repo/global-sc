const ethers = require("hardhat").ethers;
const { expect } = require("chai");
const { BigNumber } = require("@ethersproject/bignumber");

const TOKEN_DECIMALS = 18;
const BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER = BigNumber.from(10).pow(TOKEN_DECIMALS);
const TOKEN_SUPPLY = BigNumber.from(1000).mul(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER);
const MAX_ANTIWHALE = 15 * 100;

let deployedToken;

beforeEach(async function () {
  [owner, addr1, addr2, ...addrs] = await ethers.getSigners();
  nativeToken = await ethers.getContractFactory("NativeToken", owner);
  deployedToken = await nativeToken.deploy();
});

describe("Antiwhale", function () {
  it("Should to return max antiwhale", async function () {
    expect(await deployedToken.MAX_ANTIWHALE()).to.equal(MAX_ANTIWHALE);
  });

  it("If not DevPower cannot change the antiwhale supply percentage", async function () {
    await expect(
        deployedToken.connect(addr1).updateMaxTransferAntiWhale(1000)
    ).to.be.revertedWith("DevPower: caller is not the dev with powers");
  });

  it("Cannot increase the antiwhale supply percentage", async function () {
    await expect(
        deployedToken.updateMaxTransferAntiWhale(2000)
    ) .to.be.revertedWith(
        "[!] Antiwhale method triggered. You are trying to set a % which is too high Check MAX_ANTIWHALE in the SC."
    );
  });

  it("As a DevPower I can change (decrease) the antiwhale supply percentage", async function () {
    await deployedToken.updateMaxTransferAntiWhale(1000);
  });

  it("Owner is excluded from antiwhale", async function () {
    expect(await deployedToken.GetIfExcludedFromAntiWhale(owner.address)).to.true;
  });

  it("As DevPower I can exclude addresses from antiwhale", async function () {
    expect(await deployedToken.GetIfExcludedFromAntiWhale(addr1.address)).to.false;
    await deployedToken.setExcludedFromAntiWhale(addr1.address, true);
    expect(await deployedToken.GetIfExcludedFromAntiWhale(addr1.address)).to.true;
  });

  it("As DevPower I can include addresses to antiwhale", async function () {
    expect(await deployedToken.GetIfExcludedFromAntiWhale(owner.address)).to.true;
    await deployedToken.setExcludedFromAntiWhale(owner.address, false);
    expect(await deployedToken.GetIfExcludedFromAntiWhale(owner.address)).to.false;
  });

  it("Calculation of maximum number of tokens can be transferred", async function () {
    await deployedToken.mint(TOKEN_SUPPLY.toString());

    // 1000 tokens * 10^18 * 200 / 10000 = 2 * 10^19
    const expectedResult = TOKEN_SUPPLY.mul(BigNumber.from(200)).div(BigNumber.from(10000));

    expect(await deployedToken.maxTokensTransferAmountAntiWhaleMethod()).to.equal(expectedResult.toString());
  });
});
