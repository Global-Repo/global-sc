require("@nomiclabs/hardhat-waffle"); // Includes hardhat-ethers
require("@nomiclabs/hardhat-etherscan");

const fs = require('fs');
const secrets = fs.readFileSync(".secret").toString().trim().split(/\n/);
const secretsDeployer = fs.readFileSync(".secret_deployer").toString().trim().split(/\n/);
const mnemonicTest = secrets[0].trim();
const mnemonicDeployer = secretsDeployer[0].trim();
const apiKeyBSC = secrets[1].trim();

/**
 * @type import('hardhat/config').HardhatUserConfig
 */
module.exports = {
  defaultNetwork: "hardhat",
  networks: {
    localhost: {
      url: "http://127.0.0.1:8545"
    },
    hardhat: {
      allowUnlimitedContractSize: true
    },
    testnet: {
      allowUnlimitedContractSize: true,
      url: "https://data-seed-prebsc-1-s1.binance.org:8545",
      chainId: 97,
      gasPrice: 20000000000,
      accounts: {mnemonic: mnemonicTest},
    },
    mainnet: {
      url: "https://bsc-dataseed.binance.org/",
      chainId: 56,
      gasPrice: 20000000000,
      accounts: {mnemonic: mnemonicTest}
    }
  },
  etherscan: {
    // Your API key for Etherscan
    // Obtain one at https://bscscan.com/
    apiKey: apiKeyBSC
  },
  solidity: {
    compilers: [
      {
        version: "0.6.12",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200
          }
        }
      },
      {
        version: "0.4.16",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200
          }
        }
      }
    ]
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts"
  },
  mocha: {
    timeout: 20000
  }
}