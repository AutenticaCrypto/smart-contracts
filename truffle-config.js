require('@babel/register')
require('@babel/polyfill')
require('dotenv').config()

// Dependencies
const { getEnvironmentVariable } = require('./helpers/env')
const HDWalletProvider = require('@truffle/hdwallet-provider')

// Constants
const keyInfuraApiKey = 'INFURA_API_KEY'
const keyMnemonic = 'MNEMONIC'

// Helpers
const walletProvider = (rpc) => {
  return new HDWalletProvider(getEnvironmentVariable(keyMnemonic), rpc)
}

module.exports = {
  networks: {
    // Development
    local: {
      host: "127.0.0.1",
      port: 7545,
      network_id: "5777",
    },

    // Ethereum
    eth_rinkeby: {
      provider: () => walletProvider(`https://rinkeby.infura.io/v3/${getEnvironmentVariable(keyInfuraApiKey)}`),
      network_id: 4,
      skipDryRun: true
    },
    eth: {
      provider: () => walletProvider(`https://mainnet.infura.io/v3/${getEnvironmentVariable(keyInfuraApiKey)}`),
      network_id: 1,                    // Mainnet's id
      maxFeePerGas: 20000000000,        // 20 Gwei (check https://etherscan.io/gastracker)
      maxPriorityFeePerGas: 2000000000, // 2 Gwei
      skipDryRun: false                 // Skip dry run before migrations? (default: false for public nets )
    },

    // Binance Smart Chain
    bsc_testnet: {
      provider: () => walletProvider(`https://data-seed-prebsc-1-s1.binance.org:8545`),
      network_id: 97,
      networkCheckTimeout: 10000,
      skipDryRun: true
    },
    bsc: {
      provider: () => walletProvider(`https://bsc-dataseed.binance.org/`),
      network_id: 56,
      confirmations: 10,
      timeoutBlocks: 200,
      skipDryRun: false
    },
  },

  mocha: {
    reporter: 'eth-gas-reporter',
    reporterOptions: {
      currency: 'USD',
      coinmarketcap: getEnvironmentVariable('COINMARKETCAP_API_KEY'),
    }
  },

  // Compiler
  compilers: {
    solc: {
      version: "0.8.15",
      settings: {
        optimizer: {
          enabled: true,
          runs: 200
        }
      }
    }
  },

  plugins: [
    "solidity-coverage",
    "truffle-contract-size",
    'truffle-plugin-verify',
  ],

  api_keys: {
    etherscan: getEnvironmentVariable('ETHERSCAN_API_KEY'),
    bscscan: getEnvironmentVariable('BSCSCAN_API_KEY'),
  }
};
