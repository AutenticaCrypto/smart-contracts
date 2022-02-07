const { deployProxy } = require('@openzeppelin/truffle-upgrades')
const { expect } = require('chai')
const { BN, expectEvent } = require('@openzeppelin/test-helpers')

const AutenticaERC20 = artifacts.require("Autentica")
const AutenticaERC721 = artifacts.require("AutenticaERC721")
const NFTMarketplace = artifacts.require("NFTMarketplace")

const {
    generateSignature,
    toWei,
    decimalsRepresentation,
    autenticaERC721SignatureTypes,
    marketplaceSignatureTypes
} = require('../utils/TestUtils.js')

contract("NFTMarketplace", accounts => {
    describe("Parameterized test for tradeForTokens with AutenticaERC721 - Balances", async () => {
        // NOTE: Both buyers start with a balance of 1.000.000 AUT tokens
        const testData = [
            // Decimals
            {
                input: {
                    nftPrice: "1.23", // AUT
                    royaltyFeePercentage: "0",
                    investorFeePercentage: "0",
                    marketplaceFeePercentage: "0",
                },
                output: {
                    // Formula: `nftPrice` - (`investorFeePercentage` + `marketplaceFeePercentage`)%) + (`royaltyFeePercentage - (`investorFeePercentage`% of `royaltyFeePercentage`)`)% of `nftPrice`
                    sellerBalance: "1.23", // `nftPrice` from the first sale, from the second sale he won't get anything because he doesn't have royalties

                    // Formula: `initialBalance` -`nftPrice` + (`nftPrice` - (`royaltyFeePercentage` + `marketplaceFeePercentage`)%)
                    buyerBalance: "1000000", // -`nftPrice` + `nftPrice` = 0

                    // Formula: `initialBalance` - `nftPrice`
                    buyer2Balance: "999998.77", // -`nftPrice`

                    // Formula: `investorFeePercentage`% of seller proceeds
                    investorBalance: "0", // no fees

                    // Formula: (`marketplaceFeePercentage`% of `nftPrice`) * 2
                    autenticaBalance: "0" // no fees
                }
            },
            {
                input: {
                    nftPrice: "1.23", // AUT
                    royaltyFeePercentage: "12.34",
                    investorFeePercentage: "0",
                    marketplaceFeePercentage: "0",
                },
                output: {
                    sellerBalance: "1.381782",
                    buyerBalance: "999999.848218",
                    buyer2Balance: "999998.77",
                    investorBalance: "0",
                    autenticaBalance: "0"
                },
            },
            {
                input: {
                    nftPrice: "1.23", // AUT
                    royaltyFeePercentage: "0",
                    investorFeePercentage: "43.12",
                    marketplaceFeePercentage: "0",
                },
                output: {
                    sellerBalance: "0.699624",
                    buyerBalance: "1000000",
                    buyer2Balance: "999998.77",
                    investorBalance: "0.530376",
                    autenticaBalance: "0"
                },
            },
            {
                input: {
                    nftPrice: "1.23", // AUT
                    royaltyFeePercentage: "0",
                    investorFeePercentage: "0",
                    marketplaceFeePercentage: "2.34",
                },
                output: {
                    sellerBalance: "1.201218",
                    buyerBalance: "999999.971218",
                    buyer2Balance: "999998.77",
                    investorBalance: "0",
                    autenticaBalance: "0.057564"
                },
            },
            {
                input: {
                    nftPrice: "1.23", // AUT
                    royaltyFeePercentage: "12.34",
                    investorFeePercentage: "43.12",
                    marketplaceFeePercentage: "2.34",
                },
                output: {
                    sellerBalance: "0.769611",
                    buyerBalance: "999999.819436",
                    buyer2Balance: "999998.77",
                    investorBalance: "0.583389",
                    autenticaBalance: "0.057564"
                },
            },

            // Bigger values
            {
                input: {
                    nftPrice: "50", // AUT
                    royaltyFeePercentage: "0",
                    investorFeePercentage: "0",
                    marketplaceFeePercentage: "0",
                },
                output: {
                    sellerBalance: "50",
                    buyerBalance: "1000000",
                    buyer2Balance: "999950",
                    investorBalance: "0",
                    autenticaBalance: "0"
                }
            },
            {
                input: {
                    nftPrice: "50", // AUT
                    royaltyFeePercentage: "12.34",
                    investorFeePercentage: "0",
                    marketplaceFeePercentage: "0",
                },
                output: {
                    sellerBalance: "56.17",
                    buyerBalance: "999993.83",
                    buyer2Balance: "999950",
                    investorBalance: "0",
                    autenticaBalance: "0"
                },
            },
            {
                input: {
                    nftPrice: "50", // AUT
                    royaltyFeePercentage: "0",
                    investorFeePercentage: "43.12",
                    marketplaceFeePercentage: "0",
                },
                output: {
                    sellerBalance: "28.44",
                    buyerBalance: "01000000",
                    buyer2Balance: "999950",
                    investorBalance: "21.56",
                    autenticaBalance: "0"
                },
            },
            {
                input: {
                    nftPrice: "50", // AUT
                    royaltyFeePercentage: "0",
                    investorFeePercentage: "0",
                    marketplaceFeePercentage: "2.34",
                },
                output: {
                    sellerBalance: "48.83",
                    buyerBalance: "999998.83",
                    buyer2Balance: "999950",
                    investorBalance: "0",
                    autenticaBalance: "2.34"
                },
            },
            {
                input: {
                    nftPrice: "50", // AUT
                    royaltyFeePercentage: "12.34",
                    investorFeePercentage: "43.12",
                    marketplaceFeePercentage: "2.34",
                },
                output: {
                    sellerBalance: "31.285",
                    buyerBalance: "999992.66",
                    buyer2Balance: "999950",
                    investorBalance: "23.715",
                    autenticaBalance: "2.34"
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
                    sellerBalance: "0.000000000000000005",
                    buyerBalance: "1000000",
                    buyer2Balance: "999999.999999999999999995",
                    investorBalance: "0",
                    autenticaBalance: "0"
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
                    sellerBalance: "0.000000000000000005",
                    buyerBalance: "1000000",
                    buyer2Balance: "999999.999999999999999995",
                    investorBalance: "0",
                    autenticaBalance: "0"
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
                    sellerBalance: "0.000000000000000003",
                    buyerBalance: "1000000",
                    buyer2Balance: "999999.999999999999999995",
                    investorBalance: "0.000000000000000002",
                    autenticaBalance: "0"
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
                    sellerBalance: "0.000000000000000005",
                    buyerBalance: "1000000",
                    buyer2Balance: "999999.999999999999999995",
                    investorBalance: "0",
                    autenticaBalance: "0"
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
                    sellerBalance: "0.000000000000000003",
                    buyerBalance: "1000000",
                    buyer2Balance: "999999.999999999999999995",
                    investorBalance: "0.000000000000000002",
                    autenticaBalance: "0"
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
                    sellerBalance: "0",
                    buyerBalance: "1000000",
                    buyer2Balance: "1000000",
                    investorBalance: "0",
                    autenticaBalance: "0"
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
                    sellerBalance: "0",
                    buyerBalance: "1000000",
                    buyer2Balance: "1000000",
                    investorBalance: "0",
                    autenticaBalance: "0"
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
                    sellerBalance: "0",
                    buyerBalance: "1000000",
                    buyer2Balance: "1000000",
                    investorBalance: "0",
                    autenticaBalance: "0"
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
                    sellerBalance: "0",
                    buyerBalance: "1000000",
                    buyer2Balance: "1000000",
                    investorBalance: "0",
                    autenticaBalance: "0"
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
                    sellerBalance: "0",
                    buyerBalance: "1000000",
                    buyer2Balance: "1000000",
                    investorBalance: "0",
                    autenticaBalance: "0"
                },
            }
        ]

        let deployer, seller, buyer, buyer2, operator, investor, autentica
        let autenticaERC20, autenticaERC721, market

        let decimalsForToken, decimalsForNFT, marketplaceDecimals

        beforeEach("Deploying contracts and setting up wallets", async () => {
            [deployer, seller, buyer, buyer2, operator, autentica, investor] = accounts;
            
            // Deployments
            autenticaERC20 = await AutenticaERC20.new({ from: deployer })
            autenticaERC721 = await AutenticaERC721.new()
            market = await deployProxy(NFTMarketplace, [autentica, [autenticaERC20.address]])

            // Info
            decimalsForToken = await autenticaERC20.decimals()
            decimalsForNFT = await autenticaERC721.decimals()
            marketplaceDecimals = await market.decimals()

            // Operator
            const role = await market.OPERATOR_ROLE()
            await market.grantRole(role, operator, { from: deployer })
            await autenticaERC721.grantRole(role, operator, { from: deployer })

            // Set the marketplace
            await autenticaERC721.setMarketplace(market.address)

            // Transfers and approvals
            await autenticaERC20.approve(market.address, decimalsRepresentation("2000000", decimalsForToken).toString())
            await autenticaERC20.transfer(buyer, decimalsRepresentation("1000000", decimalsForToken).toString())
            await autenticaERC20.approve(market.address, decimalsRepresentation("1000000", decimalsForToken).toString(), { from: buyer })
            await autenticaERC20.transfer(buyer2, decimalsRepresentation("1000000", decimalsForToken).toString())
            await autenticaERC20.approve(market.address, decimalsRepresentation("1000000", decimalsForToken).toString(), { from: buyer2 })
        })

        testData.forEach(async (dataSet) => {
            let { nftPrice, royaltyFeePercentage, investorFeePercentage, marketplaceFeePercentage } = dataSet.input
            let { sellerBalance, buyerBalance, buyer2Balance, investorBalance, autenticaBalance } = dataSet.output

            it(`Should see balances for seller: ${sellerBalance} AUT, buyer #1: ${buyerBalance} AUT, buyer #2: ${buyer2Balance} AUT, investor: ${investorBalance} AUT, marketplace: ${autenticaBalance} AUT 
                for given royalty fee: ${royaltyFeePercentage}%, investor fee: ${investorFeePercentage}%, marketplace fee: ${marketplaceFeePercentage}%
                based on 2 trades at a price of ${nftPrice} AUT each`, async () => {
                // Parameters
                let nftId = new BN(1)
                let price = toWei(nftPrice)
                let token = autenticaERC20.address
                let royaltyFee = decimalsRepresentation(royaltyFeePercentage, decimalsForNFT)
                let investorFee = decimalsRepresentation(investorFeePercentage, marketplaceDecimals)
                let marketplaceFee = decimalsRepresentation(marketplaceFeePercentage, marketplaceDecimals)

                // Seller is the creator
                let nftSig = await generateSignature(autenticaERC721SignatureTypes, [autenticaERC721.address, seller, nftId, royaltyFee, investorFee], operator)
                await autenticaERC721.investorMintingAndApproveMarketplace(seller, nftId, "uri", royaltyFee, investorFee, nftSig.v, nftSig.r, nftSig.s, { from: investor })

                // First trade
                const expandedSig = await generateSignature(
                    marketplaceSignatureTypes,
                    [market.address, autenticaERC721.address, nftId, seller, buyer, price, token, royaltyFee, investorFee, marketplaceFee],
                    operator)

                const case1Trade = await market.tradeForTokens(autenticaERC721.address, nftId, price, token, buyer, marketplaceFee, expandedSig, { from: buyer })
                expectEvent(case1Trade, 'TradedForTokens', {
                    collection: autenticaERC721.address,
                    tokenId: nftId,
                    seller: seller,
                    buyer: buyer,
                    token: token,
                    price: price
                })

                // Second trade
                const expandedSig2 = await generateSignature(
                    marketplaceSignatureTypes,
                    [market.address, autenticaERC721.address, nftId, buyer, buyer2, price, token, royaltyFee, investorFee, marketplaceFee],
                    operator)

                await autenticaERC721.approve(market.address, nftId, { from: buyer })
                const case2Trade = await market.tradeForTokens(autenticaERC721.address, nftId, price, token, buyer2, marketplaceFee, expandedSig2, { from: buyer2 })
                expectEvent(case2Trade, 'TradedForTokens', {
                    collection: autenticaERC721.address,
                    tokenId: nftId,
                    seller: buyer,
                    buyer: buyer2,
                    token: token,
                    price: price
                })

                expect(await autenticaERC20.balanceOf(seller)).to.bignumber.be.equal(decimalsRepresentation(sellerBalance, decimalsForToken).toString(), 'seller balance is not accurate')
                expect(await autenticaERC20.balanceOf(buyer)).to.bignumber.be.equal(decimalsRepresentation(buyerBalance, decimalsForToken).toString(), 'buyer #1 balance is not accurate')
                expect(await autenticaERC20.balanceOf(buyer2)).to.bignumber.be.equal(decimalsRepresentation(buyer2Balance, decimalsForToken).toString(), 'buyer #2 balance is not accurate')
                expect(await autenticaERC20.balanceOf(investor)).to.bignumber.be.equal(decimalsRepresentation(investorBalance, decimalsForToken).toString(), 'investor balance is not accurate')
                expect(await autenticaERC20.balanceOf(autentica)).to.bignumber.be.equal(decimalsRepresentation(autenticaBalance, decimalsForToken).toString(), 'marketplace balance is not accurate')
            })
        })
    })
})