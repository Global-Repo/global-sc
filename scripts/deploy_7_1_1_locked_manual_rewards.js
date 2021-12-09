const hre = require("hardhat");
require("@nomiclabs/hardhat-ethers");
const { BigNumber } = require("@ethersproject/bignumber");

const {
    GLOBAL_TOKEN_ADDRESS,
    WETH_ADDRESS,
    MASTERCHEF_ADDRESS,
    TREASURY_MINT_ADDRESS, VAULT_LOCKED_MANUAL_ADDRESS, VAULT_LOCKED_MANUAL_ADDRESS_2,
} = require("./addresses");

const {
    deployVaultLockedManual,
} = require("../test/helpers/singleDeploys");

const { timestampNHours } = require("../test/helpers/utils.js");

const VAULT_LOCKED_DISTRIBUTE_GLOBAL_INTERVAL = timestampNHours(48);

let CURRENT_BLOCK;
let nativeToken;
let vaultLockedManual;

async function main() {
    console.log("Starting rewards");
    console.log("Ensure you have proper addresses set up into addresses.js for: VaultLockedManual & VaultLockedManual2");

    [deployer] = await hre.ethers.getSigners();

    //CURRENT_BLOCK = await ethers.provider.getBlockNumber();
    //console.log("Current block is:", CURRENT_BLOCK);

    // Attach
    const NativeToken = await ethers.getContractFactory("NativeToken");
    nativeToken = await NativeToken.attach(GLOBAL_TOKEN_ADDRESS);

    const VaultLockedManual = await ethers.getContractFactory("VaultLockedManual"); //543 users
    vaultLockedManual = await VaultLockedManual.attach(VAULT_LOCKED_MANUAL_ADDRESS);

    const TOKEN_DECIMALS = 18;
    const BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER = BigNumber.from(10).pow(TOKEN_DECIMALS);
    const GLOBAL_BALANCE = BigNumber.from(53950).mul(BIG_NUMBER_TOKEN_DECIMALS_MULTIPLIER);

    //console.log((await nativeToken.balanceOf(deployer.address)).toString());
    //for (var i = 0; i < 544; i++) {
    var globalToUser;
    var globalToUserTotal = BigNumber.from(0);
    var userAddress;
    for (var i = 0; i <= 542; i++) {
        userAddress = await vaultLockedManual.users(i);
        if(userAddress=="0x31Ff45c85608d9e37D82e81cE376E797B0C1deCE")
        {
            //globalToUser = GLOBAL_BALANCE.mul(await vaultLockedManual.amountOfUser(userAddress)).div(await vaultLockedManual.totalSupply());
            //await nativeToken.transfer(userAddress, globalToUser);
            console.log("Per l'user ", i ," : ",userAddress)
            //console.log("Li ingressarem: ",globalToUser.toString());
            //globalToUserTotal = globalToUserTotal.add(globalToUser);
            //console.log("Te de balanc: ",(await vaultLockedManual.amountOfUser(userAddress)).toString());
            //await new Promise(r => setTimeout(() => r(), 20000));
        }
        console.log("Per l'user ", i ," res");
    }
    console.log(globalToUserTotal.toString());

    /*for (var i = 0; i < 544; i++) {
        //console.log((await vaultLockedManual.globalEarned(await vaultLockedManual.users(i))).isZero());
        if (!(await vaultLockedManual.globalEarned(await vaultLockedManual.users(i))).isZero())
        {
            console.log("Alerta, aquest ja els te assignats: ", await vaultLockedManual.users(i))
            console.log((await vaultLockedManual.globalEarned(await vaultLockedManual.users(i))).toString());
        }
    }*/

    /*uint globalAmountToDistribute = globalBalance;
    uint globalBalanceLocal = globalBalance;
    if(lastRewardEvent.add(rewardInterval)<=block.timestamp && globalAmountToDistribute >= minGlobalAmountToDistribute)
    {
        lastRewardEvent = block.timestamp;
        for (uint i=0; i < users.length; i++) {
            uint globalToUser = globalAmountToDistribute.mul(amountOfUser(users[i])).div(totalSupply);
            globalBalanceLocal = globalBalanceLocal.sub(globalToUser);

            globalEarned[users[i]] = globalEarned[users[i]].add(globalToUser);
        }

        lastDistributedGLOBALAmount = globalAmountToDistribute.sub(globalBalanceLocal);

        globalBalance = globalBalanceLocal;

        emit DistributedGLOBAL(lastDistributedGLOBALAmount);
    }*/

    /*console.log("Vault locked manual deployed to:", vaultLocked.address);
    await new Promise(r => setTimeout(() => r(), 10000));

    // Set up
    await masterchef.addAddressToWhitelist(vaultLocked.address);
    console.log("Vault locked added into Masterchef whitelist");
    await new Promise(r => setTimeout(() => r(), 10000));

    await vaultLocked.setDepositary(TREASURY_MINT_ADDRESS, true);
    console.log("Treasury depositary added into vault locked manual as depositary");
    await new Promise(r => setTimeout(() => r(), 10000));*/


    //console.log("Current block is:", CURRENT_BLOCK);

    console.log("Rewards finished");
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
