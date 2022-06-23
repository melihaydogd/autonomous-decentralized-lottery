require('dotenv').config()
const HDWalletProvider = require("@truffle/hdwallet-provider")

module.exports = {
  networks: {
    development: {
      host: "localhost",
      port: 8545,
      network_id: "*",
    },
    bloxberg: {
      provider: () => {
        return new HDWalletProvider({
          privateKeys: [process.env.PRIVATE_KEY],
          providerOrUrl: 'https://core.bloxberg.org',
          numberOfAddresses: 1
        })
      },
      network_id: '8995',
      gas: 8000000,
      gasPrice: 4 * 1000000000,
    },
  },

  compilers: {
    solc: {
      version: "^0.8.0",
      docker: false,
      settings: {
        optimizer: {
          enabled: true,
          runs: 200
        },
        evmVersion: "byzantium"
      }
    }
  },

  plugins: [
    'truffle-plugin-verify'
  ]
}