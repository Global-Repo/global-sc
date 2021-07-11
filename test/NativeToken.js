const { expect } = require("chai");

describe("NativeToken", function () {
  it("Should return token symbol", async function () {
    const NativeToken = await ethers.getContractFactory("NativeToken");
    const contract = await NativeToken.deploy();
    await contract.deployed();

    expect(await contract.symbol()).to.equal("GLV");
  });

  it("Should return max antiwhale", async function () {
    const NativeToken = await ethers.getContractFactory("NativeToken");
    const contract = await NativeToken.deploy();
    await contract.deployed();

    expect(await contract.MAX_ANTIWHALE()).to.equal(1500);
  });

  it("Only DevPower can change the antiwhale supply percentage", async function () {
    const NativeToken = await ethers.getContractFactory("NativeToken");
    const contract = await NativeToken.deploy();
    await contract.deployed();

    expect(await contract.MAX_ANTIWHALE()).to.equal(1500);

    await contract.updateMaxTransferAntiWhale(2000);

    expect(await contract.MAX_ANTIWHALE()).to.throw("[!] Antiwhale method triggered. You are trying to set a % which is too high Check MAX_ANTIWHALE in the SC.");
  });
});
