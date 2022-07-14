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
    autenticaERC721SignatureTypes,
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
                    investorFeePercentage: "0",
                    marketplaceFeePercentage: "0",
                },
                output: {
                    // Formula: `nftPrice` - (`investorFeePercentage` + `marketplaceFeePercentage`)%) + (`royaltyFeePercentage - (`investorFeePercentage`% of `royaltyFeePercentage`)`)% of `nftPrice`
                    sellerPnl: "1.23", // `nftPrice` from the first sale, from the second sale he won't get anything because he doesn't have royalties

                    // Formula: -`nftPrice` + (`nftPrice` - (`royaltyFeePercentage` + `marketplaceFeePercentage`)%)
                    buyerPnl: "0", // -`nftPrice` + `nftPrice` = 0

                    // Formula: -`nftPrice`
                    buyer2Pnl: "-1.23", // -`nftPrice`

                    // Formula: `investorFeePercentage`% of seller proceeds
                    investorPnl: "0", // no fees

                    // Formula: (`marketplaceFeePercentage`% of `nftPrice`) * 2
                    autenticaPnl: "0" // no fees
                }
            },
            {
                input: {
                    nftPrice: "1.23", // ETH
                    royaltyFeePercentage: "12.34",
                    investorFeePercentage: "0",
                    marketplaceFeePercentage: "0",
                },
                output: {
                    sellerPnl: "1.381782",
                    buyerPnl: "-0.151782",
                    buyer2Pnl: "-1.23",
                    investorPnl: "0",
                    autenticaPnl: "0"
                },
            },
            {
                input: {
                    nftPrice: "1.23", // ETH
                    royaltyFeePercentage: "0",
                    investorFeePercentage: "43.12",
                    marketplaceFeePercentage: "0",
                },
                output: {
                    sellerPnl: "0.699624",
                    buyerPnl: "0",
                    buyer2Pnl: "-1.23",
                    investorPnl: "0.530376",
                    autenticaPnl: "0"
                },
            },
            {
                input: {
                    nftPrice: "1.23", // ETH
                    royaltyFeePercentage: "0",
                    investorFeePercentage: "0",
                    marketplaceFeePercentage: "2.34",
                },
                output: {
                    sellerPnl: "1.201218",
                    buyerPnl: "-0.028782",
                    buyer2Pnl: "-1.23",
                    investorPnl: "0",
                    autenticaPnl: "0.057564"
                },
            },
            {
                input: {
                    nftPrice: "1.23", // ETH
                    royaltyFeePercentage: "12.34",
                    investorFeePercentage: "43.12",
                    marketplaceFeePercentage: "2.34",
                },
                output: {
                    sellerPnl: "0.769611",
                    buyerPnl: "-0.180564",
                    buyer2Pnl: "-1.23",
                    investorPnl: "0.583389",
                    autenticaPnl: "0.057564"
                },
            },

            // Bigger values
            {
                input: {
                    nftPrice: "5", // ETH
                    royaltyFeePercentage: "0",
                    investorFeePercentage: "0",
                    marketplaceFeePercentage: "0",
                },
                output: {
                    sellerPnl: "5",
                    buyerPnl: "0",
                    buyer2Pnl: "-5",
                    investorPnl: "0",
                    autenticaPnl: "0"
                }
            },
            {
                input: {
                    nftPrice: "5", // ETH
                    royaltyFeePercentage: "12.34",
                    investorFeePercentage: "0",
                    marketplaceFeePercentage: "0",
                },
                output: {
                    sellerPnl: "5.617",
                    buyerPnl: "-0.617",
                    buyer2Pnl: "-5",
                    investorPnl: "0",
                    autenticaPnl: "0"
                },
            },
            {
                input: {
                    nftPrice: "5", // ETH
                    royaltyFeePercentage: "0",
                    investorFeePercentage: "43.12",
                    marketplaceFeePercentage: "0",
                },
                output: {
                    sellerPnl: "2.844",
                    buyerPnl: "0",
                    buyer2Pnl: "-5",
                    investorPnl: "2.156",
                    autenticaPnl: "0"
                },
            },
            {
                input: {
                    nftPrice: "5", // ETH
                    royaltyFeePercentage: "0",
                    investorFeePercentage: "0",
                    marketplaceFeePercentage: "2.34",
                },
                output: {
                    sellerPnl: "4.883",
                    buyerPnl: "-0.117",
                    buyer2Pnl: "-5",
                    investorPnl: "0",
                    autenticaPnl: "0.234"
                },
            },
            {
                input: {
                    nftPrice: "5", // ETH
                    royaltyFeePercentage: "12.34",
                    investorFeePercentage: "43.12",
                    marketplaceFeePercentage: "2.34",
                },
                output: {
                    sellerPnl: "3.1285",
                    buyerPnl: "-0.734",
                    buyer2Pnl: "-5",
                    investorPnl: "2.3715",
                    autenticaPnl: "0.234"
                },
            },

            // Smaller values
            {
                input: {
                    nftPrice: "0.000000000000000005", // 5 wei
                    royaltyFeePercentage: "0",
                    investorFeePercentage: "0",
                    marketplaceFeePercentage: "0",
                },
                output: {
                    sellerPnl: "0.000000000000000005",
                    buyerPnl: "0",
                    buyer2Pnl: "-0.000000000000000005",
                    investorPnl: "0",
                    autenticaPnl: "0"
                }
            },
            {
                input: {
                    nftPrice: "0.000000000000000005", // 5 wei
                    royaltyFeePercentage: "12.34",
                    investorFeePercentage: "0",
                    marketplaceFeePercentage: "0",
                },
                output: {
                    sellerPnl: "0.000000000000000005",
                    buyerPnl: "0",
                    buyer2Pnl: "-0.000000000000000005",
                    investorPnl: "0",
                    autenticaPnl: "0"
                },
            },
            {
                input: {
                    nftPrice: "0.000000000000000005",
                    royaltyFeePercentage: "0",
                    investorFeePercentage: "43.12",
                    marketplaceFeePercentage: "0",
                },
                output: {
                    sellerPnl: "0.000000000000000003",
                    buyerPnl: "0",
                    buyer2Pnl: "-0.000000000000000005",
                    investorPnl: "0.000000000000000002",
                    autenticaPnl: "0"
                },
            },
            {
                input: {
                    nftPrice: "0.000000000000000005",
                    royaltyFeePercentage: "0",
                    investorFeePercentage: "0",
                    marketplaceFeePercentage: "2.34",
                },
                output: {
                    sellerPnl: "0.000000000000000005",
                    buyerPnl: "0",
                    buyer2Pnl: "-0.000000000000000005",
                    investorPnl: "0",
                    autenticaPnl: "0"
                },
            },
            {
                input: {
                    nftPrice: "0.000000000000000005",
                    royaltyFeePercentage: "12.34",
                    investorFeePercentage: "43.12",
                    marketplaceFeePercentage: "2.34",
                },
                output: {
                    sellerPnl: "0.000000000000000003",
                    buyerPnl: "0",
                    buyer2Pnl: "-0.000000000000000005",
                    investorPnl: "0.000000000000000002",
                    autenticaPnl: "0"
                },
            },

            // Zero price
            {
                input: {
                    nftPrice: "0",
                    royaltyFeePercentage: "0",
                    investorFeePercentage: "0",
                    marketplaceFeePercentage: "0",
                },
                output: {
                    sellerPnl: "0",
                    buyerPnl: "0",
                    buyer2Pnl: "0",
                    investorPnl: "0",
                    autenticaPnl: "0"
                }
            },
            {
                input: {
                    nftPrice: "0",
                    royaltyFeePercentage: "12.34",
                    investorFeePercentage: "0",
                    marketplaceFeePercentage: "0",
                },
                output: {
                    sellerPnl: "0",
                    buyerPnl: "0",
                    buyer2Pnl: "0",
                    investorPnl: "0",
                    autenticaPnl: "0"
                },
            },
            {
                input: {
                    nftPrice: "0",
                    royaltyFeePercentage: "0",
                    investorFeePercentage: "43.12",
                    marketplaceFeePercentage: "0",
                },
                output: {
                    sellerPnl: "0",
                    buyerPnl: "0",
                    buyer2Pnl: "0",
                    investorPnl: "0",
                    autenticaPnl: "0"
                },
            },
            {
                input: {
                    nftPrice: "0",
                    royaltyFeePercentage: "0",
                    investorFeePercentage: "0",
                    marketplaceFeePercentage: "2.34",
                },
                output: {
                    sellerPnl: "0",
                    buyerPnl: "0",
                    buyer2Pnl: "0",
                    investorPnl: "0",
                    autenticaPnl: "0"
                },
            },
            {
                input: {
                    nftPrice: "0",
                    royaltyFeePercentage: "12.34",
                    investorFeePercentage: "43.12",
                    marketplaceFeePercentage: "2.34",
                },
                output: {
                    sellerPnl: "0",
                    buyerPnl: "0",
                    buyer2Pnl: "0",
                    investorPnl: "0",
                    autenticaPnl: "0"
                },
            }
        ]

        let deployer, seller, buyer, buyer2, operator, investor, autentica
        let sellerInit, buyerInit, buyer2Init, investorInit, autenticaInit
        
        let market, autenticaERC721
        let decimals, marketplaceDecimals

        beforeEach("Deploying contracts and setting up wallets", async () => {
            [deployer, seller, buyer, buyer2, operator, autentica, investor] = accounts;
            
            // Get initial balances for all accounts
            [sellerInit, buyerInit, buyer2Init, investorInit, autenticaInit] = await getBalances([seller, buyer, buyer2, investor, autentica])

            // Deployments
            autenticaERC721 = await AutenticaERC721.new()
            market = await NFTMarketplace.new(autentica, dummyTokenAddresses)

            // Info
            decimals = await autenticaERC721.decimals()
            marketplaceDecimals = await market.decimals()

            // Operator
            const role = await market.OPERATOR_ROLE()
            await market.grantRole(role, operator, { from: deployer })
            await autenticaERC721.grantRole(role, operator, { from: deployer })

            // Set the marketplace
            await autenticaERC721.setMarketplace(market.address)
        })

        testData.forEach(async (dataSet) => {
            let { nftPrice, royaltyFeePercentage, investorFeePercentage, marketplaceFeePercentage } = dataSet.input
            let { sellerPnl, buyerPnl, buyer2Pnl, investorPnl, autenticaPnl } = dataSet.output

            it(`Should see PnL for seller: ${sellerPnl} ETH, buyer #1: ${buyerPnl} ETH, buyer #2: ${buyer2Pnl} ETH, investor: ${investorPnl} ETH, marketplace: ${autenticaPnl} ETH 
                for given royalty fee: ${royaltyFeePercentage}%, investor fee: ${investorFeePercentage}%, marketplace fee: ${marketplaceFeePercentage}%
                based on 2 trades at a price of ${nftPrice} ETH each`, async () => {
                // Parameters
                let nftId = new BN(1)
                let price = toWei(nftPrice)
                let token = constants.ZERO_ADDRESS
                let royaltyFee = decimalsRepresentation(royaltyFeePercentage, decimals)
                let investorFee = decimalsRepresentation(investorFeePercentage, marketplaceDecimals)
                let marketplaceFee = decimalsRepresentation(marketplaceFeePercentage, marketplaceDecimals)
                
                // Seller is the creator
                let nftSig = await generateSignature(autenticaERC721SignatureTypes, [autenticaERC721.address, seller, nftId, royaltyFee, investorFee], operator)
                const mint = await autenticaERC721.investorMintingAndApproveMarketplace(seller, nftId, "uri", royaltyFee, investorFee, nftSig.v, nftSig.r, nftSig.s, { from: investor })

                // First trade
                const expandedSig = await generateSignature(
                    marketplaceSignatureTypes,
                    [market.address, autenticaERC721.address, nftId, seller, buyer, price, token, royaltyFee, investorFee, marketplaceFee],
                    operator)

                const case1Trade = await market.tradeForCoins(autenticaERC721.address, nftId, price, buyer, marketplaceFee, expandedSig, { from: buyer, value: price })
                expectEvent(case1Trade, 'TradedForCoins', {
                    collection: autenticaERC721.address,
                    tokenId: nftId,
                    seller: seller,
                    buyer: buyer,
                    price: price,
                })

                // Second trade
                const expandedSig2 = await generateSignature(
                    marketplaceSignatureTypes,
                    [market.address, autenticaERC721.address, nftId, buyer, buyer2, price, token, royaltyFee, investorFee, marketplaceFee],
                    operator)

                const case2Approve = await autenticaERC721.approve(market.address, nftId, { from: buyer })
                const case2Trade = await market.tradeForCoins(autenticaERC721.address, nftId, price, buyer2, marketplaceFee, expandedSig2, { from: buyer2, value: price })
                expectEvent(case2Trade, 'TradedForCoins', {
                    collection: autenticaERC721.address,
                    tokenId: nftId,
                    seller: buyer,
                    buyer: buyer2,
                    price: price,
                })

                // comparing the exact (wei denominated) balances
                expect(new BN(await totalPnl(seller, sellerInit, [], "wei"))).to.bignumber.be.equal(toWei(sellerPnl), 'seller PnL is not accurate')
                expect(new BN(await totalPnl(buyer, buyerInit, [case1Trade, case2Approve], "wei"))).to.bignumber.be.equal(toWei(buyerPnl), 'buyer #1 PnL is not accurate')
                expect(new BN(await totalPnl(buyer2, buyer2Init, [case2Trade], "wei"))).to.bignumber.be.equal(toWei(buyer2Pnl), 'buyer #2 PnL is not accurate')
                expect(new BN(await totalPnl(investor, investorInit, [mint], "wei"))).to.bignumber.be.equal(toWei(investorPnl), 'investor PnL is not accurate')
                expect(new BN(await totalPnl(autentica, autenticaInit, [], "wei"))).to.bignumber.be.equal(toWei(autenticaPnl), 'marketplace PnL is not accurate')
            })
        })
    })
})
