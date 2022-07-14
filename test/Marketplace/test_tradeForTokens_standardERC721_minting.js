const { expect } = require('chai')
const { BN, expectEvent } = require('@openzeppelin/test-helpers')

const AutenticaERC20 = artifacts.require("Autentica")
const ERC721Mock = artifacts.require("ERC721Mock")
const NFTMarketplace = artifacts.require("NFTMarketplace")

const {
    generateSignature,
    toWei,
    decimalsRepresentation,
    marketplaceSignatureTypes
} = require('../utils/TestUtils.js')

contract("NFTMarketplace", accounts => {
    describe("Parameterized test for tradeForTokens with ERC721Mock - Balances", async () => {
        // NOTE: Both buyers start with a balance of 1.000.000 AUT tokens
        const testData = [
            // Decimals
            {
                input: {
                    nftPrice: "1.23", // AUT
                    marketplaceFeePercentage: "0",
                },
                output: {
                    // Formula: `nftPrice` - `marketplaceFeePercentage`%
                    sellerBalance: "1.23", // `nftPrice` from the first sale, from the second sale he won't get anything because he doesn't have royalties

                    // Formula: -`nftPrice` + (`nftPrice` - `marketplaceFeePercentage`%)
                    buyerBalance: "1000000", // -`nftPrice` + `nftPrice` = 0

                    // Formula: -`nftPrice`
                    buyer2Balance: "999998.77", // -`nftPrice`

                    // Formula: (`marketplaceFeePercentage`% of `nftPrice`) * 2
                    autenticaBalance: "0" // no fees
                }
            },
            {
                input: {
                    nftPrice: "1.23", // AUT
                    marketplaceFeePercentage: "2.34",
                },
                output: {
                    sellerBalance: "1.201218", // `nftPrice` minus 2.34% marketplace fee
                    buyerBalance: "999999.971218", // -`nftPrice` + (`nftPrice` minus 2.34% marketplace fee)
                    buyer2Balance: "999998.77", // -`nftPrice`
                    autenticaBalance: "0.057564" // 2.34% marketplace fee for 2 trades
                },
            },

            // Bigger values
            {
                input: {
                    nftPrice: "50", // AUT
                    marketplaceFeePercentage: "0",
                },
                output: {
                    sellerBalance: "50", // `nftPrice` from the first sale, from the second sale he won't get anything because he doesn't have royalties
                    buyerBalance: "1000000", // -`nftPrice` + `nftPrice` = 0
                    buyer2Balance: "999950", // -`nftPrice`
                    autenticaBalance: "0" // no fees
                }
            },
            {
                input: {
                    nftPrice: "50", // AUT
                    marketplaceFeePercentage: "2.34",
                },
                output: {
                    sellerBalance: "48.83", // `nftPrice` minus 2.34% marketplace fee
                    buyerBalance: "999998.83", // -`nftPrice` + (`nftPrice` minus 2.34% marketplace fee)
                    buyer2Balance: "999950", // -`nftPrice`
                    autenticaBalance: "2.34" // 2.34% marketplace fee for 2 trades
                },
            },

            // Smaller values
            {
                input: {
                    nftPrice: "0.000000000000000005", // 5 wei
                    marketplaceFeePercentage: "0",
                },
                output: {
                    sellerBalance: "0.000000000000000005", // `nftPrice` from the first sale, from the second sale he won't get anything because he doesn't have royalties
                    buyerBalance: "1000000", // -`nftPrice` + `nftPrice` = 0
                    buyer2Balance: "999999.999999999999999995", // -`nftPrice`
                    autenticaBalance: "0" // no fees
                }
            },
            {
                input: {
                    nftPrice: "0.000000000000000005",
                    marketplaceFeePercentage: "2.34",
                },
                output: {
                    sellerBalance: "0.000000000000000005", // (technically the sum should be 0.000000000000000004883, but since we're using a single digit wei price, it can't add more digits)
                    buyerBalance: "1000000", // (technically the sum should be 1000000-0.000000000000000000117, but since we're using a single digit wei price, it can't add more digits)
                    buyer2Balance: "999999.999999999999999995", // -`nftPrice`
                    autenticaBalance: "0" // (technically the sum should be 0.000000000000000000234, but since we're using a single digit wei price, it can't add more digits)
                },
            },

            // Zero price
            {
                input: {
                    nftPrice: "0",
                    marketplaceFeePercentage: "0",
                },
                output: {
                    sellerBalance: "0",
                    buyerBalance: "1000000",
                    buyer2Balance: "1000000",
                    autenticaBalance: "0"
                }
            },
            {
                input: {
                    nftPrice: "0",
                    marketplaceFeePercentage: "2.34",
                },
                output: {
                    sellerBalance: "0",
                    buyerBalance: "1000000",
                    buyer2Balance: "1000000",
                    autenticaBalance: "0"
                },
            },
        ]

        let deployer, seller, buyer, buyer2, operator, autentica
        let autenticaERC20, erc721Mock, market

        let decimalsForToken, marketplaceDecimals

        beforeEach("Deploying contracts and setting up wallets", async () => {
            [deployer, seller, buyer, buyer2, operator, autentica] = accounts;
            
            // Deployments
            autenticaERC20 = await AutenticaERC20.new({ from: deployer })
            erc721Mock = await ERC721Mock.new("Mock", "MCK")
            market = await NFTMarketplace.new(autentica, [autenticaERC20.address])

            // Info
            decimalsForToken = await autenticaERC20.decimals()
            marketplaceDecimals = await market.decimals()

            // Operator
            const role = await market.OPERATOR_ROLE()
            await market.grantRole(role, operator, { from: deployer })

            // Transfers and approvals
            await autenticaERC20.approve(market.address, decimalsRepresentation("2000000", decimalsForToken).toString())
            await autenticaERC20.transfer(buyer, decimalsRepresentation("1000000", decimalsForToken).toString())
            await autenticaERC20.approve(market.address, decimalsRepresentation("1000000", decimalsForToken).toString(), { from: buyer })
            await autenticaERC20.transfer(buyer2, decimalsRepresentation("1000000", decimalsForToken).toString())
            await autenticaERC20.approve(market.address, decimalsRepresentation("1000000", decimalsForToken).toString(), { from: buyer2 })
        })

        testData.forEach(async (dataSet) => {
            let { nftPrice, marketplaceFeePercentage } = dataSet.input
            let { sellerBalance, buyerBalance, buyer2Balance, autenticaBalance } = dataSet.output

            it(`Should see balances for seller: ${sellerBalance} AUT, buyer #1: ${buyerBalance} AUT, buyer #2: ${buyer2Balance} AUT, marketplace: ${autenticaBalance} AUT 
                for given marketplace fee: ${marketplaceFeePercentage}%
                based on 2 trades at a price of ${nftPrice} AUT each`, async () => {
                // Parameters
                let nftId = new BN(1)
                let price = toWei(nftPrice)
                let token = autenticaERC20.address
                let royaltyFee = 0
                let investorFee = 0
                let marketplaceFee = decimalsRepresentation(marketplaceFeePercentage, marketplaceDecimals)

                // Mint
                await erc721Mock.mint(seller, { from: seller })

                // First trade
                const expandedSig = await generateSignature(
                    marketplaceSignatureTypes,
                    [market.address, erc721Mock.address, nftId, seller, buyer, price, token, royaltyFee, investorFee, marketplaceFee],
                    operator)

                await erc721Mock.approve(market.address, nftId, { from: seller })
                const case1Trade = await market.tradeForTokens(erc721Mock.address, nftId, price, token, buyer, marketplaceFee, expandedSig, { from: buyer })
                expectEvent(case1Trade, 'TradedForTokens', {
                    collection: erc721Mock.address,
                    tokenId: nftId,
                    seller: seller,
                    buyer: buyer,
                    token: token,
                    price: price
                })

                // Second trade
                const expandedSig2 = await generateSignature(
                    marketplaceSignatureTypes,
                    [market.address, erc721Mock.address, nftId, buyer, buyer2, price, token, royaltyFee, investorFee, marketplaceFee],
                    operator)

                await erc721Mock.approve(market.address, nftId, { from: buyer })
                const case2Trade = await market.tradeForTokens(erc721Mock.address, nftId, price, token, buyer2, marketplaceFee, expandedSig2, { from: buyer2 })
                expectEvent(case2Trade, 'TradedForTokens', {
                    collection: erc721Mock.address,
                    tokenId: nftId,
                    seller: buyer,
                    buyer: buyer2,
                    token: token,
                    price: price
                })

                expect(await autenticaERC20.balanceOf(seller)).to.bignumber.be.equal(decimalsRepresentation(sellerBalance, decimalsForToken).toString(), 'seller balance is not accurate')
                expect(await autenticaERC20.balanceOf(buyer)).to.bignumber.be.equal(decimalsRepresentation(buyerBalance, decimalsForToken).toString(), 'buyer #1 balance is not accurate')
                expect(await autenticaERC20.balanceOf(buyer2)).to.bignumber.be.equal(decimalsRepresentation(buyer2Balance, decimalsForToken).toString(), 'buyer #2 balance is not accurate')
                expect(await autenticaERC20.balanceOf(autentica)).to.bignumber.be.equal(decimalsRepresentation(autenticaBalance, decimalsForToken).toString(), 'marketplace balance is not accurate')
            })
        })
    })
})