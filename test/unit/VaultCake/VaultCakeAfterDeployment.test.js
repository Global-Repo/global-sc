const { expect } = require("chai");
const {
  deploy,
  getNativeToken,
  getCakeToken,
  getGlobalMasterChef,
  getVaultCake,
} = require("../../helpers/vaultCakeDeploy.js");

beforeEach(async function () {
  await deploy();
  await getNativeToken().transferOwnership(getGlobalMasterChef().address);
});

describe("VaultCake: After deployment", function () {
  it("Check Cake pool id (pid)", async function () {
    expect(await getVaultCake().pid()).to.equal(0);
  });

  it("Staking token is cake", async function () {
    expect(await getVaultCake().stakingToken()).to.equal(getCakeToken().address);
  });

  it("Reward token is cake", async function () {
    expect(await getVaultCake().rewardsToken()).to.equal(getCakeToken().address);
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

  it("Set minter: only contract addresses", async function () {
    await expect(getVaultCake().setMinter(user1.address))
        .to.be.revertedWith("function call to a non-contract account");
  });

  it("Set minter: only minters which there are minter in masterChef", async function () {
    await expect(getVaultCake().setMinter(getGlobalMasterChef().address))
        .to.be.revertedWith("This vault must be a minter in minter's contract");
  });

  it("Set minter: MC add vault cake as minter", async function () {
    await getGlobalMasterChef().setMinter(getVaultCake().address, true);
    await getVaultCake().setMinter(getGlobalMasterChef().address);
  });
});