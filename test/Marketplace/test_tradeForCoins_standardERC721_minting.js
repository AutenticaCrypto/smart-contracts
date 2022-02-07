const { deployProxy } = require('@openzeppelin/truffle-upgrades')
const { expect } = require('chai')
const { BN, constants, expectEvent } = require('@openzeppelin/test-helpers')

const ERC721Mock = artifacts.require("ERC721Mock")
const NFTMarketplace = artifacts.require("NFTMarketplace")

const {
    getBalances,
    totalPnl,
    generateSignature,
    toWei,
    decimalsRepresentation,
    marketplaceSignatureTypes,
    dummyTokenAddresses
} = require('../utils/TestUtils.js')

contract("NFTMarketplace", accounts => {
    describe("Parameterized test for tradeForCoins with ERC721Mock - Balances", async () => {
        const testData = [
            // Decimals
            {
                input: {
                    nftPrice: "1.23", // ETH
                    marketplaceFeePercentage: "0",
                },
                output: {
                    // Formula: `nftPrice` - `marketplaceFeePercentage`%
                    sellerPnl: "1.23", // `nftPrice`

                    // Formula: -`nftPrice` + (`nftPrice` - `marketplaceFeePercentage`%)
                    buyerPnl: "0", // -`nftPrice` + `nftPrice` = 0

                    // Formula: -`nftPrice`
                    buyer2Pnl: "-1.23", // -`nftPrice`

                    // Formula: (`marketplaceFeePercentage`% of `nftPrice`) * 2
                    autenticaPnl: "0" // no fees
                }
            },
            {
                input: {
                    nftPrice: "1.23", // ETH
                    marketplaceFeePercentage: "2.34",
                },
                output: {
                    sellerPnl: "1.201218", // `nftPrice` minus 2.34% marketplace fee
                    buyerPnl: "-0.028782", // -`nftPrice` + (`nftPrice` minus 2.34% marketplace fee)
                    buyer2Pnl: "-1.23", // -`nftPrice`
                    autenticaPnl: "0.057564" // 2.34% marketplace fee for 2 trades
                },
            },

            // Bigger values
            {
                input: {
                    nftPrice: "5", // ETH
                    marketplaceFeePercentage: "0",
                },
                output: {
                    sellerPnl: "5", // `nftPrice`
                    buyerPnl: "0", // -`nftPrice` + `nftPrice` = 0
                    buyer2Pnl: "-5", // -`nftPrice`
                    autenticaPnl: "0" // no fees
                }
            },
            {
                input: {
                    nftPrice: "5", // ETH
                    marketplaceFeePercentage: "2.34",
                },
                output: {
                    sellerPnl: "4.883", // `nftPrice` minus 2.34% marketplace fee
                    buyerPnl: "-0.117", // -`nftPrice` + (`nftPrice` minus 2.34% marketplace fee)
                    buyer2Pnl: "-5", // -`nftPrice`
                    autenticaPnl: "0.234" // 2.34% marketplace fee for 2 trades
                },
            },

            // Smaller values
            {
                input: {
                    nftPrice: "0.000000000000000005", // 5 wei
                    marketplaceFeePercentage: "0",
                },
                output: {
                    sellerPnl: "0.000000000000000005", // `nftPrice`
                    buyerPnl: "0", // -`nftPrice` + `nftPrice` = 0
                    buyer2Pnl: "-0.000000000000000005", // -`nftPrice`
                    autenticaPnl: "0" // no fees
                }
            },
            {
                input: {
                    nftPrice: "0.000000000000000005",
                    marketplaceFeePercentage: "2.34",
                },
                output: {
                    sellerPnl: "0.000000000000000005", // (technically the sum should be 0.000000000000000004883, but since we're using a single digit wei price, it can't add more digits)
                    buyerPnl: "0", // (technically the sum should be -0.000000000000000000117, but since we're using a single digit wei price, it can't add more digits)
                    buyer2Pnl: "-0.000000000000000005", // -`nftPrice`
                    autenticaPnl: "0" // (technically the sum should be 0.000000000000000000234, but since we're using a single digit wei price, it can't add more digits)
                },
            },

            // Zero price
            {
                input: {
                    nftPrice: "0",
                    marketplaceFeePercentage: "0",
                },
                output: {
                    sellerPnl: "0",
                    buyerPnl: "0",
                    buyer2Pnl: "0",
                    autenticaPnl: "0"
                }
            },
            {
                input: {
                    nftPrice: "0",
                    marketplaceFeePercentage: "2.34",
                },
                output: {
                    sellerPnl: "0",
                    buyerPnl: "0",
                    buyer2Pnl: "0",
                    autenticaPnl: "0"
                },
            },
        ]

        let deployer, seller, buyer, buyer2, operator, autentica
        let sellerInit, buyerInit, buyer2Init, autenticaInit

        let market, erc721Mock
        let marketplaceDecimals

        beforeEach("Deploying contracts and setting up wallets", async () => {
            [deployer, seller, buyer, buyer2, operator, autentica] = accounts;
            
            // Get initial balances for all accounts
            [sellerInit, buyerInit, buyer2Init, autenticaInit] = await getBalances([seller, buyer, buyer2, autentica])

            // Deployments
            erc721Mock = await ERC721Mock.new("Mock", "MCK")
            market = await deployProxy(NFTMarketplace, [autentica, dummyTokenAddresses])

            // Info
            marketplaceDecimals = await market.decimals()

            // Operator
            const role = await market.OPERATOR_ROLE()
            await market.grantRole(role, operator, { from: deployer })
        })

        testData.forEach(async (dataSet) => {
            let { nftPrice, marketplaceFeePercentage } = dataSet.input
            let { sellerPnl, buyerPnl, buyer2Pnl, autenticaPnl } = dataSet.output

            it(`Should see PnL for seller: ${sellerPnl} ETH, buyer #1: ${buyerPnl} ETH, buyer #2: ${buyer2Pnl} ETH, marketplace: ${autenticaPnl} ETH 
                for given marketplace fee: ${marketplaceFeePercentage}%
                based on 2 trades at a price of ${nftPrice} ETH each`, async () => {
                // Parameters
                let nftId = new BN(1)
                let price = toWei(nftPrice)
                let token = constants.ZERO_ADDRESS
                let royaltyFee = 0
                let investorFee = 0
                let marketplaceFee = decimalsRepresentation(marketplaceFeePercentage, marketplaceDecimals)

                // Mint
                const mint = await erc721Mock.mint(seller, { from: seller })
                
                // First trade
                const expandedSig = await generateSignature(
                    marketplaceSignatureTypes,
                    [market.address, erc721Mock.address, nftId, seller, buyer, price, token, royaltyFee, investorFee, marketplaceFee],
                    operator)

                const case1Approve = await erc721Mock.approve(market.address, nftId, { from: seller })
                const case1Trade = await market.tradeForCoins(erc721Mock.address, nftId, price, buyer, marketplaceFee, expandedSig, { from: buyer, value: price })
                expectEvent(case1Trade, 'TradedForCoins', {
                    collection: erc721Mock.address,
                    tokenId: nftId,
                    seller: seller,
                    buyer: buyer,
                    price: price
                })

                // Second trade
                const expandedSig2 = await generateSignature(
                    marketplaceSignatureTypes,
                    [market.address, erc721Mock.address, nftId, buyer, buyer2, price, token, royaltyFee, investorFee, marketplaceFee],
                    operator)

                const case2Approve = await erc721Mock.approve(market.address, nftId, { from: buyer })
                const case2Trade = await market.tradeForCoins(erc721Mock.address, nftId, price, buyer2, marketplaceFee, expandedSig2, { from: buyer2, value: price })
                expectEvent(case2Trade, 'TradedForCoins', {
                    collection: erc721Mock.address,
                    tokenId: nftId,
                    seller: buyer,
                    buyer: buyer2,
                    price: price
                })

                // comparing the exact (wei denominated) balances
                expect(new BN(await totalPnl(seller, sellerInit, [mint, case1Approve], "wei"))).to.bignumber.be.equal(toWei(sellerPnl), 'seller PnL is not accurate')
                expect(new BN(await totalPnl(buyer, buyerInit, [case1Trade, case2Approve], "wei"))).to.bignumber.be.equal(toWei(buyerPnl), 'buyer #1 PnL is not accurate')
                expect(new BN(await totalPnl(buyer2, buyer2Init, [case2Trade], "wei"))).to.bignumber.be.equal(toWei(buyer2Pnl), 'buyer #2 PnL is not accurate')
                expect(new BN(await totalPnl(autentica, autenticaInit, [], "wei"))).to.bignumber.be.equal(toWei(autenticaPnl), 'marketplace PnL is not accurate')
            })
        })
    })
})
