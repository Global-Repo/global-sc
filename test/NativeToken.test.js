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

describe("After deployment", function () {
  it("Should to set the right owner", async function () {
    expect(await deployedToken.owner()).to.equal(owner.address);
  });

  it("Should to assign the total supply of tokens to the owner", async function () {
    const ownerBalance = await deployedToken.balanceOf(owner.address);
    expect(await deployedToken.totalSupply()).to.equal(ownerBalance);
  });

  it("Should to have 0 tokens of supply", async function () {
    expect(await deployedToken.totalSupply()).to.equal(0);
  });

  it("Should to exclude from antiwhale the owner, token, burn address and zero address", async function () {
    expect(await deployedToken.GetIfExcludedFromAntiWhale(owner.address)).to.true;
    expect(await deployedToken.GetIfExcludedFromAntiWhale(deployedToken.address)).to.true;
    expect(await deployedToken.GetIfExcludedFromAntiWhale("0x000000000000000000000000000000000000dEaD")).to.true;
    expect(await deployedToken.GetIfExcludedFromAntiWhale("0x0000000000000000000000000000000000000000")).to.true;
  });
});

describe("Transactions", function () {
  it("Should to be able to mint only the owner", async function () {
    // Owner can mint
    await deployedToken.mint(TOKEN_SUPPLY.toString());

    // Not owner cannot mint
    await expect(
        deployedToken.connect(addr1).mint(TOKEN_SUPPLY.toString())
    ).to.be.revertedWith("Ownable: caller is not the owner");
  });

  xit("Should to transfer tokens between accounts", async function () {
    // Transfer 50 tokens from owner to addr1
    await deployedToken.transfer(addr1.address, 50);
    expect(await deployedToken.balanceOf(addr1.address)).to.equal(50);

    // Transfer 50 tokens from addr1 to addr2
    await deployedToken.connect(addr1).transfer(addr2.address, 50);
    expect(await deployedToken.balanceOf(addr2.address)).to.equal(50);
  });

  xit("Should to fail if sender doesn’t have enough tokens", async function () {
    const initialOwnerBalance = await deployedToken.balanceOf(owner.address);

    // Try to send 1 token from addr1 (0 tokens) to owner (1000 tokens).
    // `require` will evaluate false and revert the transaction.
    await expect(
        deployedToken.connect(addr1).transfer(owner.address, 1)
    ).to.be.revertedWith("Not enough tokens");

    // Owner balance shouldn't have changed.
    expect(await deployedToken.balanceOf(owner.address)).to.equal(
        initialOwnerBalance
    );
  });

  xit("Should update balances after transfers", async function () {
    const initialOwnerBalance = await deployedToken.balanceOf(owner.address);

    // Transfer 100 tokens from owner to addr1.
    await deployedToken.transfer(addr1.address, 100);

    // Transfer another 50 tokens from owner to addr2.
    await deployedToken.transfer(addr2.address, 50);

    // Check balances.
    const finalOwnerBalance = await deployedToken.balanceOf(owner.address);
    expect(finalOwnerBalance).to.equal(initialOwnerBalance - 150);

    const addr1Balance = await deployedToken.balanceOf(addr1.address);
    expect(addr1Balance).to.equal(100);

    const addr2Balance = await deployedToken.balanceOf(addr2.address);
    expect(addr2Balance).to.equal(50);
  });
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
