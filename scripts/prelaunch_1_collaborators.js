const hre = require("hardhat");
require("@nomiclabs/hardhat-ethers");

const {
    GLOBAL_TOKEN_ADDRESS
} = require("./addresses");

let nativeToken;

async function main() {
    console.log("Starting collaborators transfers");
    console.log("Ensure you have the ownership of the NativeToken and proper addresses set up into addresses.js for: NativeToken");

    [deployer] = await hre.ethers.getSigners();

    const NativeToken = await ethers.getContractFactory("NativeToken");
    nativeToken = await NativeToken.attach(GLOBAL_TOKEN_ADDRESS);
    await new Promise(r => setTimeout(() => r(), 10000));

    //transfer 1 for Crypto_penn
    nativeToken.mints(to,amount);
    await new Promise(r => setTimeout(() => r(), 10000));
    console.log("1: ",amount," GLOBALs transfered to :", to);

    //transfer 2 for Downsin
    nativeToken.mints(to,amount);
    await new Promise(r => setTimeout(() => r(), 10000));
    console.log("2: ",amount," GLOBALs transfered to :", to);

    //transfer 3 for Dani Lores
    nativeToken.mints(to,amount);
    await new Promise(r => setTimeout(() => r(), 10000));
    console.log("3: ",amount," GLOBALs transfered to :", to);

    //transfer 4 for
    nativeToken.mints(to,amount);
    await new Promise(r => setTimeout(() => r(), 10000));
    console.log("4: ",amount," GLOBALs transfered to :", to);

    //transfer 5 for
    nativeToken.mints(to,amount);
    await new Promise(r => setTimeout(() => r(), 10000));
    console.log("5: ",amount," GLOBALs transfered to :", to);

    //transfer 6 for
    nativeToken.mints(to,amount);
    await new Promise(r => setTimeout(() => r(), 10000));
    console.log("6: ",amount," GLOBALs transfered to :", to);

    //transfer 7 for
    nativeToken.mints(to,amount);
    await new Promise(r => setTimeout(() => r(), 10000));
    console.log("7: ",amount," GLOBALs transfered to :", to);

    //transfer 8 for
    nativeToken.mints(to,amount);
    await new Promise(r => setTimeout(() => r(), 10000));
    console.log("8: ",amount," GLOBALs transfered to :", to);

    //transfer 9 for
    nativeToken.mints(to,amount);
    await new Promise(r => setTimeout(() => r(), 10000));
    console.log("9: ",amount," GLOBALs transfered to :", to);

    console.log("Transfers finished");
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });