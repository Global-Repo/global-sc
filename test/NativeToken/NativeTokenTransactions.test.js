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
  nativeToken = await ethers.getContractFactory("NativeToken");
  deployedToken = await nativeToken.deploy();
});

describe("NativeToken: Transactions", function () {
  // TODO: Fix double mint function name
  xit("Should to be able to mint only the owner", async function () {
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