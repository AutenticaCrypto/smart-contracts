const { deployProxy } = require('@openzeppelin/truffle-upgrades')
const { expect } = require('chai')
const { BN, constants, expectEvent } = require('@openzeppelin/test-helpers')

const AutenticaERC721 = artifacts.require("AutenticaERC721")
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
    describe("Parameterized test for tradeForCoins with AutenticaERC721 - Balances", async () => {
        const testData = [
            // Decimals
            {
                input: {
                    nftPrice: "1.23", // ETH
                    royaltyFeePercentage: "0",
                    marketplaceFeePercentage: "0",
                },
                output: {
                    // Formula: `nftPrice` - (`marketplaceFeePercentage`)%) + (`royaltyFeePercentage`% of `nftPrice`
                    sellerPnl: "1.23", // `nftPrice` from the first sale, from the second sale he won't get anything because he doesn't have royalties

                    // Formula: -`nftPrice` + (`nftPrice` - (`royaltyFeePercentage` + `marketplaceFeePercentage`)%)
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
                    royaltyFeePercentage: "12.34",
                    marketplaceFeePercentage: "0",
                },
                output: {
                    sellerPnl: "1.381782", // `nftPrice` from the first sale + 12.34% royalty from the second trade
                    buyerPnl: "-0.151782", // 12.34% royalty goes to seller
                    buyer2Pnl: "-1.23", // -`nftPrice`
                    autenticaPnl: "0" // no fees
                },
            },
            {
                input: {
                    nftPrice: "1.23", // ETH
                    royaltyFeePercentage: "0",
                    marketplaceFeePercentage: "0",
                },
                output: {
                    sellerPnl: "1.23", // `nftPrice`
                    buyerPnl: "0", // -`nftPrice` + `nftPrice` = 0
                    buyer2Pnl: "-1.23", // -`nftPrice`
                    autenticaPnl: "0" // no fees
                },
            },
            {
                input: {
                    nftPrice: "1.23", // ETH
                    royaltyFeePercentage: "0",
                    marketplaceFeePercentage: "2.34",
                },
                output: {
                    sellerPnl: "1.201218", // `nftPrice` minus 2.34% marketplace fee
                    buyerPnl: "-0.028782", // -`nftPrice` + (`nftPrice` minus 2.34% marketplace fee)
                    buyer2Pnl: "-1.23", // -`nftPrice`
                    autenticaPnl: "0.057564" // 2.34% marketplace fee for 2 trades
                },
            },
            {
                input: {
                    nftPrice: "1.23", // ETH
                    royaltyFeePercentage: "12.34",
                    marketplaceFeePercentage: "2.34",
                },
                output: {
                    sellerPnl: "1.353", // (`nftPrice` - 2.34% marketplace fee) + 12.34% royalty fee from the second trade
                    buyerPnl: "-0.180564", // -`nftPrice` + (`nftPrice` - 2.34% marketplace fee - 12.34% royalty fee)
                    buyer2Pnl: "-1.23", // -`nftPrice`
                    autenticaPnl: "0.057564" // 2.34% marketplace fee for 2 trades
                },
            },

            // Bigger values
            {
                input: {
                    nftPrice: "5", // ETH
                    royaltyFeePercentage: "0",
                    marketplaceFeePercentage: "0",
                },
                output: {
                    sellerPnl: "5", // `nftPrice` from the first sale, from the second sale he won't get anything because he doesn't have royalties
                    buyerPnl: "0", // -`nftPrice` + `nftPrice` = 0
                    buyer2Pnl: "-5", // -`nftPrice`
                    autenticaPnl: "0" // no fees
                }
            },
            {
                input: {
                    nftPrice: "5", // ETH
                    royaltyFeePercentage: "12.34",
                    marketplaceFeePercentage: "0",
                },
                output: {
                    sellerPnl: "5.617", // `nftPrice` from the first sale + 12.34% royalty from the second trade
                    buyerPnl: "-0.617", // 12.34% royalty goes to seller
                    buyer2Pnl: "-5", // -`nftPrice`
                    autenticaPnl: "0" // no fees
                },
            },
            {
                input: {
                    nftPrice: "5", // ETH
                    royaltyFeePercentage: "0",
                    marketplaceFeePercentage: "0",
                },
                output: {
                    sellerPnl: "5", // `nftPrice`
                    buyerPnl: "0", // -`nftPrice` + `nftPrice` = 0
                    buyer2Pnl: "-5", // -`nftPrice`
                    autenticaPnl: "0" // no fees
                },
            },
            {
                input: {
                    nftPrice: "5", // ETH
                    royaltyFeePercentage: "0",
                    marketplaceFeePercentage: "2.34",
                },
                output: {
                    sellerPnl: "4.883", // `nftPrice` minus 2.34% marketplace fee
                    buyerPnl: "-0.117", // -`nftPrice` + (`nftPrice` minus 2.34% marketplace fee)
                    buyer2Pnl: "-5", // -`nftPrice`
                    autenticaPnl: "0.234" // 2.34% marketplace fee for 2 trades
                },
            },
            {
                input: {
                    nftPrice: "5", // ETH
                    royaltyFeePercentage: "12.34",
                    marketplaceFeePercentage: "2.34",
                },
                output: {
                    sellerPnl: "5.5", // (`nftPrice` - 2.34% marketplace fee) + 12.34% royalty fee from the second trade
                    buyerPnl: "-0.734", // -`nftPrice` + (`nftPrice` - 2.34% marketplace fee - 12.34% royalty fee)
                    buyer2Pnl: "-5", // -`nftPrice`
                    autenticaPnl: "0.234" // 2.34% marketplace fee for 2 trades
                },
            },

            // Smaller values
            {
                input: {
                    nftPrice: "0.000000000000000005", // 5 wei
                    royaltyFeePercentage: "0",
                    marketplaceFeePercentage: "0",
                },
                output: {
                    sellerPnl: "0.000000000000000005", // `nftPrice` from the first sale, from the second sale he won't get anything because he doesn't have royalties
                    buyerPnl: "0", // -`nftPrice` + `nftPrice` = 0
                    buyer2Pnl: "-0.000000000000000005", // -`nftPrice`
                    autenticaPnl: "0" // no fees
                }
            },
            {
                input: {
                    nftPrice: "0.000000000000000005", // 5 wei
                    royaltyFeePercentage: "12.34",
                    marketplaceFeePercentage: "0",
                },
                output: {
                    sellerPnl: "0.000000000000000005", // (technically the sum should be 0.000000000000000005617, but since we're using a single digit wei price, it can't add more digits)
                    buyerPnl: "0", // (technically the sum should be -0.000000000000000000617, but since we're using a single digit wei price, it can't add more digits)
                    buyer2Pnl: "-0.000000000000000005", // -`nftPrice`
                    autenticaPnl: "0" // no fees
                },
            },
            {
                input: {
                    nftPrice: "0.000000000000000005",
                    royaltyFeePercentage: "0",
                    marketplaceFeePercentage: "0",
                },
                output: {
                    sellerPnl: "0.000000000000000005", // (technically the sum should be 0.000000000000000002844, but since we're using a single digit wei price, it can't add more digits)
                    buyerPnl: "0", // -`nftPrice` + `nftPrice` = 0
                    buyer2Pnl: "-0.000000000000000005", // -`nftPrice`
                    autenticaPnl: "0" // no fees
                },
            },
            {
                input: {
                    nftPrice: "0.000000000000000005",
                    royaltyFeePercentage: "0",
                    marketplaceFeePercentage: "2.34",
                },
                output: {
                    sellerPnl: "0.000000000000000005", // (technically the sum should be 0.000000000000000004883, but since we're using a single digit wei price, it can't add more digits)
                    buyerPnl: "0", // (technically the sum should be -0.000000000000000000117, but since we're using a single digit wei price, it can't add more digits)
                    buyer2Pnl: "-0.000000000000000005", // -`nftPrice`
                    autenticaPnl: "0" // (technically the sum should be 0.000000000000000000234, but since we're using a single digit wei price, it can't add more digits)
                },
            },
            {
                input: {
                    nftPrice: "0.000000000000000005",
                    royaltyFeePercentage: "12.34",
                    marketplaceFeePercentage: "2.34",
                },
                output: {
                    sellerPnl: "0.000000000000000005", // (technically the sum should be 0.000000000000000003344, but since we're using a single digit wei price, it can't add more digits)
                    buyerPnl: "0", // (technically the sum should be -0.000000000000000000734, but since we're using a single digit wei price, it can't add more digits)
                    buyer2Pnl: "-0.000000000000000005", // -`nftPrice`
                    autenticaPnl: "0" // (technically the sum should be 0.000000000000000000234, but since we're using a single digit wei price, it can't add more digits)
                },
            },

            // Zero price
            {
                input: {
                    nftPrice: "0",
                    royaltyFeePercentage: "0",
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
                    royaltyFeePercentage: "12.34",
                    marketplaceFeePercentage: "0",
                },
                output: {
                    sellerPnl: "0",
                    buyerPnl: "0",
                    buyer2Pnl: "0",
                    autenticaPnl: "0"
                },
            },
            {
                input: {
                    nftPrice: "0",
                    royaltyFeePercentage: "0",
                    marketplaceFeePercentage: "0",
                },
                output: {
                    sellerPnl: "0",
                    buyerPnl: "0",
                    buyer2Pnl: "0",
                    autenticaPnl: "0"
                },
            },
            {
                input: {
                    nftPrice: "0",
                    royaltyFeePercentage: "0",
                    marketplaceFeePercentage: "2.34",
                },
                output: {
                    sellerPnl: "0",
                    buyerPnl: "0",
                    buyer2Pnl: "0",
                    autenticaPnl: "0"
                },
            },
            {
                input: {
                    nftPrice: "0",
                    royaltyFeePercentage: "12.34",
                    marketplaceFeePercentage: "2.34",
                },
                output: {
                    sellerPnl: "0",
                    buyerPnl: "0",
                    buyer2Pnl: "0",
                    autenticaPnl: "0"
                },
            }
        ]

        let deployer, seller, buyer, buyer2, operator, autentica
        let sellerInit, buyerInit, buyer2Init, autenticaInit

        let market, autenticaERC721
        let decimals, marketplaceDecimals

        beforeEach("Deploying contracts and setting up wallets", async () => {
            [deployer, seller, buyer, buyer2, operator, autentica] = accounts;
            
            // Get initial balances for all accounts
            [sellerInit, buyerInit, buyer2Init, autenticaInit] = await getBalances([seller, buyer, buyer2, autentica])

            // Deployments
            autenticaERC721 = await AutenticaERC721.new()
            market = await deployProxy(NFTMarketplace, [autentica, dummyTokenAddresses])

            // Info
            decimals = await autenticaERC721.decimals()
            marketplaceDecimals = await market.decimals()

            // Operator
            const role = await market.OPERATOR_ROLE()
            await market.grantRole(role, operator, { from: deployer })
            await autenticaERC721.grantRole(role, operator, { from: deployer })
        })

        testData.forEach(async (dataSet) => {
            let { nftPrice, royaltyFeePercentage, marketplaceFeePercentage } = dataSet.input
            let { sellerPnl, buyerPnl, buyer2Pnl, autenticaPnl } = dataSet.output

            it(`Should see PnL for seller: ${sellerPnl} ETH, buyer #1: ${buyerPnl} ETH, buyer #2: ${buyer2Pnl} ETH, marketplace: ${autenticaPnl} ETH 
                for given royalty fee: ${royaltyFeePercentage}%, marketplace fee: ${marketplaceFeePercentage}%
                based on 2 trades at a price of ${nftPrice} ETH each`, async () => {
                // Parameters
                let nftId = new BN(1)
                let price = toWei(nftPrice)
                let token = constants.ZERO_ADDRESS
                let royaltyFee = decimalsRepresentation(royaltyFeePercentage, decimals)
                let marketplaceFee = decimalsRepresentation(marketplaceFeePercentage, marketplaceDecimals)

                // Mint
                const mint = await autenticaERC721.mint(nftId, "uri", royaltyFee, { from: seller })
                
                // First trade
                const expandedSig = await generateSignature(
                    marketplaceSignatureTypes,
                    [market.address, autenticaERC721.address, nftId, seller, buyer, price, token, royaltyFee, 0, marketplaceFee],
                    operator)

                const case1Approve = await autenticaERC721.approve(market.address, nftId, { from: seller })
                const case1Trade = await market.tradeForCoins(autenticaERC721.address, nftId, price, buyer, marketplaceFee, expandedSig, { from: buyer, value: price })
                expectEvent(case1Trade, 'TradedForCoins', {
                    collection: autenticaERC721.address,
                    tokenId: nftId,
                    seller: seller,
                    buyer: buyer,
                    price: price
                })

                // Second trade
                const expandedSig2 = await generateSignature(
                    marketplaceSignatureTypes,
                    [market.address, autenticaERC721.address, nftId, buyer, buyer2, price, token, royaltyFee, 0, marketplaceFee],
                    operator)

                const case2Approve = await autenticaERC721.approve(market.address, nftId, { from: buyer })
                const case2Trade = await market.tradeForCoins(autenticaERC721.address, nftId, price, buyer2, marketplaceFee, expandedSig2, { from: buyer2, value: price })
                expectEvent(case2Trade, 'TradedForCoins', {
                    collection: autenticaERC721.address,
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
