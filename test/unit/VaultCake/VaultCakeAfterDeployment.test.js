const { expect } = require("chai");
const {
  deploy,
  getNativeToken,
  getMinter,
  getVaultCake,
} = require("../../helpers/vaultCakeDeploy.js");

beforeEach(async function () {
  await deploy();
  await getNativeToken().transferOwnership(getMinter().address);
});

describe("VaultCake: After deployment", function () {
  it("Check Cake pool id (pid)", async function () {
    expect(await getVaultCake().pid()).to.equal(0);
  });

  it("Vault is configured as minter", async function () {
    expect(await getVaultCake().isVaultMintable()).to.false;

    await getMinter().setMinter(getVaultCake().address, true);
    await getVaultCake().setMinter(getMinter().address);

    expect(await getVaultCake().isVaultMintable()).to.true;
  });

  it("Vault total supply is zero", async function () {
    expect(await getVaultCake().totalSupply()).to.equal(0);
  });

  it("Vault balance against CAKE pool", async function () {
    expect(await getVaultCake().balance()).to.equal(0);
  });

  it("Balance of account where not shares in vault is always zero", async function () {
    expect(await getVaultCake().balanceOf(user1.address)).to.equal(0);
  });
});