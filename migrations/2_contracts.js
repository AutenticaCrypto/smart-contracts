const { deployProxy, erc1967 } = require('@openzeppelin/truffle-upgrades');
const query = require('cli-interact').getYesNo;

const { getEnvironmentVariable } = require("../helpers/env");

const Autentica = artifacts.require("Autentica");
const AutenticaERC721 = artifacts.require("AutenticaERC721");
const NFTMarketplace = artifacts.require("NFTMarketplace");

/**
 * Indicates if the token should be deployed.
 * @param {string} network 
 * @returns `true` if the token should be deployed, `false` otherwise
 */
function shouldDeployToken(network) {
  switch (network) {
    case "eth_rinkeby":
    case "local":
    case "test":
    case "soliditycoverage":
      return true;

    default:
      return false;
  }
}

/**
 * List of tokens that are allowed to be used in the NFT Marketplace.
 * @param {string} network Network name
 * @returns List of token addresses
 */
function allowedTokens(network) {
  switch (network) {
    case "eth":
      return [
        "0xdAC17F958D2ee523a2206206994597C13D831ec7", // (USDT) https://etherscan.io/token/0xdAC17F958D2ee523a2206206994597C13D831ec7
        "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", // (USDC) https://etherscan.io/token/0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48
        "0x6B175474E89094C44Da98b954EedeAC495271d0F", // (DAI) https://etherscan.io/token/0x6B175474E89094C44Da98b954EedeAC495271d0F
      ]

    case "bsc": 
      return [
        "0x55d398326f99059fF775485246999027B3197955", // (USDT) https://bscscan.com/token/0x55d398326f99059fF775485246999027B3197955
        "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d", // (USDC) https://bscscan.com/token/0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d
        "0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56", // (BUSD) https://bscscan.com/token/0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56
        "0x1AF3F329e8BE154074D8769D1FFa4eE058B1DBc3", // (DAI) https://bscscan.com/token/0x1AF3F329e8BE154074D8769D1FFa4eE058B1DBc3
      ]
    
    case "eth_rinkeby":
      return [
        "0xd9ba894e0097f8cc2bbc9d24d308b98e36dc6d02", // (USDT) https://rinkeby.etherscan.io/token/0xd9ba894e0097f8cc2bbc9d24d308b98e36dc6d02,
        "0x4DBCdF9B62e891a7cec5A2568C3F4FAF9E8Abe2b", // (USDC) https://rinkeby.etherscan.io/token/0x4DBCdF9B62e891a7cec5A2568C3F4FAF9E8Abe2b
        "0x5592EC0cfb4dbc12D3aB100b257153436a1f0FEa", // (DAI) https://rinkeby.etherscan.io/token/0x5592EC0cfb4dbc12D3aB100b257153436a1f0FEa
      ]

    case "bsc_testnet":
      return [
        "0x337610d27c682E347C9cD60BD4b3b107C9d34dDd", // (USDT) https://testnet.bscscan.com/token/0x337610d27c682E347C9cD60BD4b3b107C9d34dDd,
        "0x64544969ed7ebf5f083679233325356ebe738930", // (USDC) https://testnet.bscscan.com/token/0x64544969ed7ebf5f083679233325356ebe738930
        "0xeD24FC36d5Ee211Ea25A80239Fb8C4Cfd80f12Ee", // (BUSD) https://testnet.bscscan.com/token/0xeD24FC36d5Ee211Ea25A80239Fb8C4Cfd80f12Ee
        "0xEC5dCb5Dbf4B114C9d0F65BcCAb49EC54F6A0867", // (DAI) https://testnet.bscscan.com/token/0xEC5dCb5Dbf4B114C9d0F65BcCAb49EC54F6A0867
      ]

    default: return []
  }
}

// Deployments
module.exports = async function (deployer, network, accounts) {
  const [owner] = accounts
  const autenticaWallet = getEnvironmentVariable('AUTENTICA_WALLET')
  const operator = getEnvironmentVariable('OPERATOR_ADDRESS')

  // Settings
  const willDeployToken = shouldDeployToken(network)
  const baseAllowedTokens = allowedTokens(network)

  // Log
  console.log(`Starting the deployment on the "${network}" network...`)

  console.table([
    {
      'name': 'Owner',
      'details': owner,
    },
    {
      'name': 'Operator',
      'details': operator,
    },
    {
      'name': 'Autentica wallet',
      'details': autenticaWallet,
    },
    {
      'name': 'ERC-20 will be deployed',
      'details': willDeployToken,
    },
  ])

  console.log(`Additional allowed tokens for the NFT Marketplace`, baseAllowedTokens)
  console.log()

  // Confirm if needed
  if (['local', 'test', 'soliditycoverage'].includes(network) === false) {
    const shouldContinue = query('Do you want to continue');
    if (!shouldContinue) {
      console.log('Aborting the deployment...')
      process.exit(0)
    }
  }

  // Deploy the ERC-20 smart contract if needed
  let token = null;
  if (willDeployToken) {
    await deployer.deploy(Autentica)
    token = await Autentica.deployed()
  }

  // Deploy the ERC-721 smart contract
  await deployer.deploy(AutenticaERC721)
  const nft = await AutenticaERC721.deployed()

  // Deploy the NFT Marketplace
  let allAllowedTokens = baseAllowedTokens.concat(token !== null ? [token.address] : [])
  let marketplaceProxy = await deployProxy(NFTMarketplace, [autenticaWallet, allAllowedTokens], { deployer });
  let marketplaceImplementation = await erc1967.getImplementationAddress(marketplaceProxy.address);
  let marketplaceAdmin = await erc1967.getAdminAddress(marketplaceProxy.address);

  // Grant roles
  const marketplaceOperatorRole = await marketplaceProxy.OPERATOR_ROLE()
  await marketplaceProxy.grantRole(marketplaceOperatorRole, operator)
  console.log('Granted the "operator" role in the NFT Marketplace smart contract for', operator)

  const nftOperatorRole = await nft.OPERATOR_ROLE()
  await nft.grantRole(nftOperatorRole, operator)
  console.log('Granted the "operator" role in the ERC-721 smart contract for', operator)

  // Set the marketplace address
  await nft.setMarketplace(marketplaceProxy.address)
  console.log('Set the "marketplace" address in the ERC-721 smart contract to', marketplaceProxy.address)

  // Additional logs
  console.log('All allowed tokens for the NFT Marketplace', allAllowedTokens)
  console.table([
    {
      name: 'Owner',
      address: owner
    },
    {
      name: 'Operator',
      address: operator
    },
    {
      name: 'Autentica wallet',
      address: autenticaWallet
    },
    {
      name: 'Autentica ERC-20',
      address: token?.address ?? `Not deployed on "${network}" network`
    },
    {
      name: 'Autentica ERC-721',
      address: nft.address
    },
    {
      name: 'NFT Marketplace (proxy)',
      address: marketplaceProxy.address
    },
    {
      name: 'NFT Marketplace (implementation)',
      address: marketplaceImplementation
    },
    {
      name: 'NFT Marketplace (admin)',
      address: marketplaceAdmin
    },
  ]);
};