# Autentica
[![CI](https://github.com/AutenticaCrypto/smart-contracts/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/AutenticaCrypto/smart-contracts/actions/workflows/ci.yml)
[![Coverage Status](https://coveralls.io/repos/github/AutenticaCrypto/smart-contracts/badge.svg?branch=main)](https://coveralls.io/github/AutenticaCrypto/smart-contracts?branch=main)

Autentica is a technology company focused on enabling creators around the world to present, sell and authenticate their artwork. With the help of our technology, artists and digital creators can authenticate their artwork without exposing themselves to fraudulent use or duplicates.

Check us out at [autentica.io](https://autentica.io)

## Repository

This repository contains the source code of the smart contracts used by [Autentica](https://autentica.io).

## Deployments

### Autentica ERC-20

|  Network  | Address |
| --------- | ------- |
| Ethereum | [0x214fEebda3AE6Bb842Bd17D91A0f346eeBcD7898](https://etherscan.io/address/0x214fEebda3AE6Bb842Bd17D91A0f346eeBcD7898) |
| Ethereum (Rinkeby) | [0x51536429019ec9485bA05eeF591BCA521170fF2f](https://rinkeby.etherscan.io/token/0x51536429019ec9485bA05eeF591BCA521170fF2f) |

### Autentica ERC-721

|  Network  | Address |
| --------- | ------- |
| Ethereum | [0x48a868dD45151800e306e83234c0EeF55E5BC624](https://etherscan.io/address/0x48a868dd45151800e306e83234c0eef55e5bc624) |
| Binance Smart Chain  | [0xf262a3b2a6973db844b6c82187d917e3b7a89170](https://bscscan.com/address/0xf262a3b2a6973db844b6c82187d917e3b7a89170) |
| Ethereum (Rinkeby) | [0x7E7821ef6C1D635f4E7f9Bc0964207CB0F10F45f](https://rinkeby.etherscan.io/address/0x7E7821ef6C1D635f4E7f9Bc0964207CB0F10F45f) |
| Binance Smart Chain (testnet)  | [0x289a01be6A52B664D1C2EDEBB19F6C6419fb8229](https://testnet.bscscan.com/address/0x289a01be6A52B664D1C2EDEBB19F6C6419fb8229) |

### NFT Marketplace

|  Network  | Address |
| --------- | ------- |
| Ethereum | [0xc731d111023b11EB39606B672Be35f20C6D88Af1](https://etherscan.io/address/0xc731d111023b11eb39606b672be35f20c6d88af1) |
| Binance Smart Chain  | [0x1a224a1a77f76aac623571408c45789a173314c8](https://bscscan.com/address/0x1a224a1a77f76aac623571408c45789a173314c8) |
| Ethereum (Rinkeby) | [0x12774EAd954F19DDe4142462C22E05F19452d320](https://rinkeby.etherscan.io/address/0x12774EAd954F19DDe4142462C22E05F19452d320) |
| Binance Smart Chain (testnet)  | [0x621866d04C82Fbec31b1C67c5E4FAa904584CaFC](https://testnet.bscscan.com/address/0x621866d04C82Fbec31b1C67c5E4FAa904584CaFC) |

## Installation

To begin, let us make sure that you have the required packages installed.
```sh
npm install
```

## Prerequisites

Create a `.env` file in root directory and put your environment variables. For example:
```
MNEMONIC="..."
OPERATOR_ADDRESS=0x0000000000000000000000000000000000000000
AUTENTICA_WALLET=0x0000000000000000000000000000000000000000
ETHERSCAN_API_KEY=YOUR_API_KEY
BSCSCAN_API_KEY=YOUR_API_KEY
INFURA_API_KEY=YOUR_API_KEY
COINMARKETCAP_API_KEY=YOUR_API_KEY
```

## Usage

Although the smart contracts are intended to be used exclusively by [Autentica](https://www.autentica.io) products, one of which is [Autentica Market](https://autentica.market), you can also interact with most of them using a Web3 framework.

If you need to interact with them, you can use the already deployed versions of the smart contracts from Ethereum and Binance Smart Chain blockchains. The smart contract addresses can be found in the `Deployments` section above.

### Basic Commands

Compiling the smart contracts can be done by using the [Truffle](https://trufflesuite.com/truffle) `compile` command:
```sh
npx truffle compile
```

Testing the smart contracts can be done by using the [Truffle](https://trufflesuite.com/truffle) `test` command:
```sh
npx truffle test
```

This project has over 200 test cases, and because of that the testing process is quite slow on the Truffle `test` network, so it is recommended to use a [Ganache](https://trufflesuite.com/ganache/) network instead. To start a Ganache network, you can just run the `npm run ganache` command and then start the test process on this `local` network like this `npx truffle test --network local`.

### Code Coverage

Generating the code coverage report can be done by running
```sh
npx truffle run coverage
```

After the report is generated, you should open the `coverage/index.html` to view the detailed information.

### Deployment

Deploying the smart contract can be done by running
```sh
npx truffle deploy --network networkName
```
where `networkName` is the name of the network you want to deploy the smart contract to.
Please check the `truffle-config.js` file to see the list of available networks.

### Verifying smart contracts

To verify the smart contracts on [Etherscan](https://etherscan.io) or [BSCScan](https://bscscan.com) you can use the `npx truffle run verify` command like this:
```sh
npx truffle run verify Autentica AutenticaERC721 NFTMarketplace --network networkName [--debug]
```
where `networkName` is the name of the network you want to deploy the smart contract to.
Please check the `truffle-config.js` file to see the list of available networks.

## Wiki

More information about the smart contracts can be found in the [Wiki](https://github.com/AutenticaCrypto/smart-contracts/wiki) section.

## Security

For security concerns, please email [security@autentica.io](mailto:security@autentica.io).
