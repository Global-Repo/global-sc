const hre = require("hardhat");
require("@nomiclabs/hardhat-ethers");

const {
    VAULT_CAKE_15,
    VAULT_CAKE_30,
    VAULT_CAKE_50,
    MASTERCHEF_ADDRESS
} = require("./addresses");

let vaultCake15;
let vaultCake30;
let vaultCake50;
let masterchef;

async function main() {
    console.log("Starting set minters for Cake Vaults");
    console.log("Ensure MC has the ownership of the NativeToken and proper addresses set up into addresses.js for: VAULT_CAKE_15, VAULT_CAKE_30, VAULT_CAKE_50");

    [deployer] = await hre.ethers.getSigners();

    const Masterchef = await ethers.getContractFactory("MasterChef");
    masterchef = await Masterchef.attach(MASTERCHEF_ADDRESS);

    const VaultCake15 = await ethers.getContractFactory("VaultCake");
    vaultCake15 = await VaultCake15.attach(VAULT_CAKE_15);

    const VaultCake30 = await ethers.getContractFactory("VaultCake");
    vaultCake30 = await VaultCake30.attach(VAULT_CAKE_30);

    const VaultCake50 = await ethers.getContractFactory("VaultCake");
    vaultCake50 = await VaultCake50.attach(VAULT_CAKE_50);

    await masterchef.setMinter(VAULT_CAKE_15, true);
    console.log("Vault cake 15 is minter into Masterchef");
    await new Promise(r => setTimeout(() => r(), 10000));
    await masterchef.setMinter(VAULT_CAKE_30, true);
    console.log("Vault cake 30 is minter into Masterchef");
    await new Promise(r => setTimeout(() => r(), 10000));
    await masterchef.setMinter(VAULT_CAKE_50, true);
    console.log("Vault cake 50 is minter into Masterchef");
    await new Promise(r => setTimeout(() => r(), 10000));

    // this should be executed after global token has MC as owner
    await vaultCake15.setMinter(MASTERCHEF_ADDRESS);
    console.log("Vault cake 15 minter is Masterchef");
    await new Promise(r => setTimeout(() => r(), 10000));
    await vaultCake30.setMinter(MASTERCHEF_ADDRESS);
    console.log("Vault cake 30 minter is Masterchef");
    await new Promise(r => setTimeout(() => r(), 10000));
    await vaultCake50.setMinter(MASTERCHEF_ADDRESS);
    console.log("Vault cake 50 minter is Masterchef");
    await new Promise(r => setTimeout(() => r(), 10000));

    console.log("SetMinters finished");
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });