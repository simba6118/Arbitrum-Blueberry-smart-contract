
require("dotenv").config();
require('hardhat-contract-sizer');
require("@nomiclabs/hardhat-waffle");
require(`@nomiclabs/hardhat-etherscan`);
require("solidity-coverage");
require('hardhat-gas-reporter');
require('hardhat-deploy');
require('hardhat-deploy-ethers');
require('@openzeppelin/hardhat-upgrades');


// This is a sample Hardhat task. To learn how to create your own go to
// https://hardhat.org/guides/create-task.html
task("accounts", "Prints the list of accounts", async (taskArgs, hre) => {
  const accounts = await hre.ethers.getSigners();

  for (const account of accounts) {
    console.log(account.address);
  }
});

function getMnemonic(networkName) {
  if (networkName) {
    const mnemonic = process.env['MNEMONIC_' + networkName.toUpperCase()]
    if (mnemonic && mnemonic !== '') {
      return mnemonic
    }
  }

  const mnemonic = process.env.MNEMONIC
  if (!mnemonic || mnemonic === '') {
    return 'test test test test test test test test test test test junk'
  }

  return mnemonic
}

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    compilers: [
      {
        version: "0.8.0",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200
          }
        }
      },
      {
        version: "0.8.17",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200
          }
        }
      },
      {
        version: "0.8.20",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200
          }
        }
      }
    ]
  },
  namedAccounts: {
    deployer: {
      default: 0,    // wallet address 0, of the mnemonic in .env
    },
    proxyOwner: {
      default: 1,
    },
  },

  mocha: {
    timeout: 100000000
  },
	etherscan: {
		apiKey: '4457MWYWXNABJSQRI54P14VZ1N8KUG8N57',
	},
  networks: {
    goerli: {
      // Ankr's Public RPC URL
      url: "https://rpc.ankr.com/eth_goerli",
      chainId: 5,
      // PRIVATE_KEY loaded from .env file
      accounts: [process.env.PRIVATE_KEY],
    },
    sepolia: {
      // Ankr's Public RPC URL
      url: "https://sepolia.drpc.org",
      chainId: 11155111,
      // PRIVATE_KEY loaded from .env file
      accounts: [process.env.PRIVATE_KEY],
    },
    partner: {
      // Ankr's Public RPC URL
      url: "https://rpc.orbit-anytrust-testnet.gelato.digital/",
      chainId: 80998896642,
      // PRIVATE_KEY loaded from .env file
      accounts: [process.env.PRIVATE_KEY],
    },
    blueberry: {
      // Ankr's Public RPC URL
      url: " https://rpc.arb-blueberry.gelato.digital",
      chainId: 88153591557,
      // PRIVATE_KEY loaded from .env file
      accounts: [process.env.PRIVATE_KEY],
    },
    pulse: {
      url: "https://rpc.v4.testnet.pulsechain.com",
      accounts: [process.env.PRIVATE_KEY],
    },
  }
};
