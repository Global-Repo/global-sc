const { expect } = require("chai");

// const TOKEN_SUPPLY = 1000000000000000000000;
const TOKEN_SUPPLY = 1000;

let deployedToken;

beforeEach(async function () {
  nativeToken = await ethers.getContractFactory("NativeToken");
  [owner, addr1, addr2, ...addrs] = await ethers.getSigners();
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
});

describe("Transactions", function () {
  it("Should to be able to mint only the owner", async function () {
    // Owner can mint
    await deployedToken.mint(TOKEN_SUPPLY);
    expect(await deployedToken.balanceOf(owner.address)).to.equal(TOKEN_SUPPLY);

    // Not owner cannot mint
    await expect(
        deployedToken.connect(addr1).mint(TOKEN_SUPPLY)
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
  xit("Should to return max antiwhale", async function () {
    expect(await deployedToken.MAX_ANTIWHALE()).to.equal(1500);
  });

  xit("Only DevPower can change the antiwhale supply percentage", async function () {
    const NativeToken = await ethers.getContractFactory("NativeToken");
    const contract = await NativeToken.deploy();
    await contract.deployed();

    expect(await contract.MAX_ANTIWHALE()).to.equal(1500);

    await contract.updateMaxTransferAntiWhale(2000);

    expect(await contract.MAX_ANTIWHALE()).to.throw("[!] Antiwhale method triggered. You are trying to set a % which is too high Check MAX_ANTIWHALE in the SC.");
  });
});
