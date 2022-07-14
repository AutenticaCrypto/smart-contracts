const { expect } = require('chai')
const { BN, expectEvent } = require('@openzeppelin/test-helpers')

const AutenticaERC20 = artifacts.require("Autentica")
const ERC721RoyaltiesMock = artifacts.require("ERC721RoyaltiesMock")
const NFTMarketplace = artifacts.require("NFTMarketplace")

const {
    generateSignature,
    toWei,
    decimalsRepresentation,
    marketplaceSignatureTypes
} = require('../utils/TestUtils.js')

contract("NFTMarketplace", accounts => {
    describe("Parameterized test for tradeForTokens with ERC721RoyaltiesMock - Balances", async () => {
        // NOTE: Both buyers start with a balance of 1.000.000 AUT tokens
        const testData = [
            // Decimals
            {
                input: {
                    nftPrice: "1.23", // AUT
                    royaltyFeePercentage: "0",
                    marketplaceFeePercentage: "0",
                },
                output: {
                    // Formula: `nftPrice` - (`marketplaceFeePercentage`)%) + (`royaltyFeePercentage`% of `nftPrice`
                    sellerBalance: "1.23", // `nftPrice` from the first sale, from the second sale he won't get anything because he doesn't have royalties

                    // Formula: `initialBalance` - `nftPrice` + (`nftPrice` - (`royaltyFeePercentage` + `marketplaceFeePercentage`)%)
                    buyerBalance: "1000000", // -`nftPrice` + `nftPrice` = 0

                    // Formula: `initialBalance` - `nftPrice`
                    buyer2Balance: "999998.77", // -`nftPrice`

                    // Formula: (`marketplaceFeePercentage`% of `nftPrice`) * 2
                    autenticaBalance: "0" // no fees
                }
            },
            {
                input: {
                    nftPrice: "1.23", // AUT
                    royaltyFeePercentage: "12.34",
                    marketplaceFeePercentage: "0",
                },
                output: {
                    sellerBalance: "1.381782", // `nftPrice` from the first sale + 12.34% royalty from the second trade
                    buyerBalance: "999999.848218", // `initialBalance` - `nftPrice` + (`nftPrice` from 12.34% royalty goes to seller)
                    buyer2Balance: "999998.77", // `initialBalance` -`nftPrice`
                    autenticaBalance: "0" // no fees
                },
            },
            {
                input: {
                    nftPrice: "1.23", // AUT
                    royaltyFeePercentage: "0",
                    marketplaceFeePercentage: "0",
                },
                output: {
                    sellerBalance: "1.23", // `nftPrice`
                    buyerBalance: "1000000", // -`nftPrice` + `nftPrice` = 0
                    buyer2Balance: "999998.77", // -`nftPrice`
                    autenticaBalance: "0" // no fees
                },
            },
            {
                input: {
                    nftPrice: "1.23", // AUT
                    royaltyFeePercentage: "0",
                    marketplaceFeePercentage: "2.34",
                },
                output: {
                    sellerBalance: "1.201218", // `nftPrice` minus 2.34% marketplace fee
                    buyerBalance: "999999.971218", // -`nftPrice` + (`nftPrice` minus 2.34% marketplace fee)
                    buyer2Balance: "999998.77", // -`nftPrice`
                    autenticaBalance: "0.057564" // 2.34% marketplace fee for 2 trades
                },
            },
            {
                input: {
                    nftPrice: "1.23", // AUT
                    royaltyFeePercentage: "12.34",
                    marketplaceFeePercentage: "2.34",
                },
                output: {
                    sellerBalance: "1.353", // (`nftPrice` - 2.34% marketplace fee) + 12.34% royalty fee from the second trade
                    buyerBalance: "999999.819436", // -`nftPrice` + (`nftPrice` - 2.34% marketplace fee - 12.34% royalty fee)
                    buyer2Balance: "999998.77", // -`nftPrice`
                    autenticaBalance: "0.057564" // 2.34% marketplace fee for 2 trades
                },
            },

            // Bigger values
            {
                input: {
                    nftPrice: "50", // AUT
                    royaltyFeePercentage: "0",
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
                    royaltyFeePercentage: "12.34",
                    marketplaceFeePercentage: "0",
                },
                output: {
                    sellerBalance: "56.17", // `nftPrice` from the first sale + 12.34% royalty from the second trade
                    buyerBalance: "999993.83", // 12.34% royalty goes to seller
                    buyer2Balance: "999950", // -`nftPrice`
                    autenticaBalance: "0" // no fees
                },
            },
            {
                input: {
                    nftPrice: "50", // AUT
                    royaltyFeePercentage: "0",
                    marketplaceFeePercentage: "0",
                },
                output: {
                    sellerBalance: "50", // `nftPrice`
                    buyerBalance: "01000000", // -`nftPrice` + `nftPrice` = 0
                    buyer2Balance: "999950", // -`nftPrice`
                    autenticaBalance: "0" // no fees
                },
            },
            {
                input: {
                    nftPrice: "50", // AUT
                    royaltyFeePercentage: "0",
                    marketplaceFeePercentage: "2.34",
                },
                output: {
                    sellerBalance: "48.83", // `nftPrice` minus 2.34% marketplace fee
                    buyerBalance: "999998.83", // -`nftPrice` + (`nftPrice` minus 2.34% marketplace fee)
                    buyer2Balance: "999950", // -`nftPrice`
                    autenticaBalance: "2.34" // 2.34% marketplace fee for 2 trades
                },
            },
            {
                input: {
                    nftPrice: "50", // AUT
                    royaltyFeePercentage: "12.34",
                    marketplaceFeePercentage: "2.34",
                },
                output: {
                    sellerBalance: "55", // (`nftPrice` - 2.34% marketplace fee) + 12.34% royalty fee from the second trade
                    buyerBalance: "999992.66", // -`nftPrice` + (`nftPrice` - 2.34% marketplace fee - 12.34% royalty fee)
                    buyer2Balance: "999950", // -`nftPrice`
                    autenticaBalance: "2.34" // 2.34% marketplace fee for 2 trades
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
                    sellerBalance: "0.000000000000000005", // `nftPrice` from the first sale, from the second sale he won't get anything because he doesn't have royalties
                    buyerBalance: "1000000", // -`nftPrice` + `nftPrice` = 0
                    buyer2Balance: "999999.999999999999999995", // -`nftPrice`
                    autenticaBalance: "0" // no fees
                }
            },
            {
                input: {
                    nftPrice: "0.000000000000000005", // 5 wei
                    royaltyFeePercentage: "12.34",
                    marketplaceFeePercentage: "0",
                },
                output: {
                    sellerBalance: "0.000000000000000005", // (technically the sum should be 0.000000000000000005617, but since we're using a single digit wei price, it can't add more digits)
                    buyerBalance: "1000000", // (technically the sum should be 1000000-0.000000000000000000617, but since we're using a single digit wei price, it can't add more digits)
                    buyer2Balance: "999999.999999999999999995", // -`nftPrice`
                    autenticaBalance: "0" // no fees
                },
            },
            {
                input: {
                    nftPrice: "0.000000000000000005",
                    royaltyFeePercentage: "0",
                    marketplaceFeePercentage: "0",
                },
                output: {
                    sellerBalance: "0.000000000000000005", // `nftPrice`
                    buyerBalance: "1000000", // -`nftPrice` + `nftPrice` = 0
                    buyer2Balance: "999999.999999999999999995", // -`nftPrice`
                    autenticaBalance: "0" // no fees
                },
            },
            {
                input: {
                    nftPrice: "0.000000000000000005",
                    royaltyFeePercentage: "0",
                    marketplaceFeePercentage: "2.34",
                },
                output: {
                    sellerBalance: "0.000000000000000005", // (technically the sum should be 0.000000000000000004883, but since we're using a single digit wei price, it can't add more digits)
                    buyerBalance: "1000000", // (technically the sum should be 1000000-0.000000000000000000117, but since we're using a single digit wei price, it can't add more digits)
                    buyer2Balance: "999999.999999999999999995", // -`nftPrice`
                    autenticaBalance: "0" // (technically the sum should be 0.000000000000000000234, but since we're using a single digit wei price, it can't add more digits)
                },
            },
            {
                input: {
                    nftPrice: "0.000000000000000005",
                    royaltyFeePercentage: "12.34",
                    marketplaceFeePercentage: "2.34",
                },
                output: {
                    sellerBalance: "0.000000000000000005", // (technically the sum should be 0.0000000000000000055, but since we're using a single digit wei price, it can't add more digits)
                    buyerBalance: "1000000", // (technically the sum should be 1000000-0.000000000000000000734, but since we're using a single digit wei price, it can't add more digits)
                    buyer2Balance: "999999.999999999999999995", // -`nftPrice`
                    autenticaBalance: "0" // (technically the sum should be 0.000000000000000000234, but since we're using a single digit wei price, it can't add more digits)
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
                    sellerBalance: "0",
                    buyerBalance: "1000000",
                    buyer2Balance: "1000000",
                    autenticaBalance: "0"
                }
            },
            {
                input: {
                    nftPrice: "0",
                    royaltyFeePercentage: "12.34",
                    marketplaceFeePercentage: "0",
                },
                output: {
                    sellerBalance: "0",
                    buyerBalance: "1000000",
                    buyer2Balance: "1000000",
                    autenticaBalance: "0"
                },
            },
            {
                input: {
                    nftPrice: "0",
                    royaltyFeePercentage: "0",
                    marketplaceFeePercentage: "0",
                },
                output: {
                    sellerBalance: "0",
                    buyerBalance: "1000000",
                    buyer2Balance: "1000000",
                    autenticaBalance: "0"
                },
            },
            {
                input: {
                    nftPrice: "0",
                    royaltyFeePercentage: "0",
                    marketplaceFeePercentage: "2.34",
                },
                output: {
                    sellerBalance: "0",
                    buyerBalance: "1000000",
                    buyer2Balance: "1000000",
                    autenticaBalance: "0"
                },
            },
            {
                input: {
                    nftPrice: "0",
                    royaltyFeePercentage: "12.34",
                    marketplaceFeePercentage: "2.34",
                },
                output: {
                    sellerBalance: "0",
                    buyerBalance: "1000000",
                    buyer2Balance: "1000000",
                    autenticaBalance: "0"
                },
            }
        ]

        let deployer, seller, buyer, buyer2, operator, autentica
        let autenticaERC20, erc721RoyaltiesMock, market

        let decimalsForToken, decimalsForNFT, marketplaceDecimals

        beforeEach("Deploying contracts and setting up wallets", async () => {
            [deployer, seller, buyer, buyer2, operator, autentica] = accounts;
            
            // Deployments
            autenticaERC20 = await AutenticaERC20.new({ from: deployer })
            erc721RoyaltiesMock = await ERC721RoyaltiesMock.new("Mock", "MCK")
            market = await NFTMarketplace.new(autentica, [autenticaERC20.address])

            // Info
            decimalsForToken = await autenticaERC20.decimals()
            decimalsForNFT = await erc721RoyaltiesMock.DECIMALS()
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
            let { nftPrice, royaltyFeePercentage, marketplaceFeePercentage } = dataSet.input
            let { sellerBalance, buyerBalance, buyer2Balance, autenticaBalance } = dataSet.output

            it(`Should see balances for seller: ${sellerBalance} AUT, buyer #1: ${buyerBalance} AUT, buyer #2: ${buyer2Balance} AUT, marketplace: ${autenticaBalance} AUT 
                for given royalty fee: ${royaltyFeePercentage}%, marketplace fee: ${marketplaceFeePercentage}%
                based on 2 trades at a price of ${nftPrice} AUT each`, async () => {
                // Parameters
                let nftId = new BN(1)
                let price = toWei(nftPrice)
                let token = autenticaERC20.address
                let royaltyFee = decimalsRepresentation(royaltyFeePercentage, decimalsForNFT)
                let investorFee = 0
                let marketplaceFee = decimalsRepresentation(marketplaceFeePercentage, marketplaceDecimals)

                // Mint
                await erc721RoyaltiesMock.mint(seller, royaltyFee, { from: seller })

                // First trade
                const expandedSig = await generateSignature(
                    marketplaceSignatureTypes,
                    [market.address, erc721RoyaltiesMock.address, nftId, seller, buyer, price, token, royaltyFee, investorFee, marketplaceFee],
                    operator)

                await erc721RoyaltiesMock.approve(market.address, nftId, { from: seller })
                const case1Trade = await market.tradeForTokens(erc721RoyaltiesMock.address, nftId, price, token, buyer, marketplaceFee, expandedSig, { from: buyer })
                expectEvent(case1Trade, 'TradedForTokens', {
                    collection: erc721RoyaltiesMock.address,
                    tokenId: nftId,
                    seller: seller,
                    buyer: buyer,
                    token: token,
                    price: price
                })

                // Second trade
                const expandedSig2 = await generateSignature(
                    marketplaceSignatureTypes,
                    [market.address, erc721RoyaltiesMock.address, nftId, buyer, buyer2, price, token, royaltyFee, investorFee, marketplaceFee],
                    operator)

                await erc721RoyaltiesMock.approve(market.address, nftId, { from: buyer })
                const case2Trade = await market.tradeForTokens(erc721RoyaltiesMock.address, nftId, price, token, buyer2, marketplaceFee, expandedSig2, { from: buyer2 })
                expectEvent(case2Trade, 'TradedForTokens', {
                    collection: erc721RoyaltiesMock.address,
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