const { BN, expectEvent } = require('@openzeppelin/test-helpers')
const { deployProxy } = require('@openzeppelin/truffle-upgrades')

const AutenticaERC20 = artifacts.require("Autentica")
const AutenticaERC721 = artifacts.require("AutenticaERC721")
const NFTMarketplace = artifacts.require("NFTMarketplace")

const { marketplaceSignatureTypes, convertedDecimalsRepresentation, decimalsRepresentation, generateSignature, autenticaERC721SignatureTypes } = require('../utils/TestUtils.js')

let deployer, seller, buyer, operator, investor, autentica
let autenticaERC20, autenticaERC721, market
let autenticaERC721Decimals, marketDecimals, decimalsForToken

contract("NFTMarketplace", accounts => {
    describe("tradeForTokens() - proceeds testing", () => {
        beforeEach("Tests", async () => {
            [deployer, seller, buyer, operator, investor, autentica] = accounts;

            // Deployments
            autenticaERC20 = await AutenticaERC20.new()
            autenticaERC721 = await AutenticaERC721.new()
            market = await deployProxy(NFTMarketplace, [autentica, [autenticaERC20.address]])

            // Information
            autenticaERC721Decimals = await autenticaERC721.decimals()
            marketDecimals = await market.decimals()
            decimalsForToken = await autenticaERC20.decimals()

            // Operator
            const role = await market.OPERATOR_ROLE()
            await market.grantRole(role, operator, { from: deployer })
            await autenticaERC721.grantRole(role, operator, { from: deployer })

            // Set the marketplace address
            await autenticaERC721.setMarketplace(market.address)

            // Transfers and approvals
            await autenticaERC20.transfer(buyer, decimalsRepresentation("1000000", decimalsForToken).toString())
            await autenticaERC20.approve(market.address, decimalsRepresentation("1000000", decimalsForToken).toString(), { from: buyer })
            await autenticaERC20.transfer(seller, decimalsRepresentation("1000000", decimalsForToken).toString())
            await autenticaERC20.approve(market.address, decimalsRepresentation("1000000", decimalsForToken).toString(), { from: seller })
        })

        it("Should test creator and investor proceeds (no investor)", async () => {
            // Parameters
            let nftId = new BN(1)
            let price = new BN(1000)
            let royaltyFee = new BN(10 * 10 ** autenticaERC721Decimals)
            let investorFee = new BN(0)
            let marketplaceFee = new BN(2.5 * 10 ** autenticaERC721Decimals)

            // Mint
            await autenticaERC721.mint(nftId, "", royaltyFee, { from: seller })
            
            // Trade 1
            const tradeSignature1 = await generateSignature(
                marketplaceSignatureTypes,
                [market.address, autenticaERC721.address, nftId, seller, buyer, price, autenticaERC20.address, convertedDecimalsRepresentation(royaltyFee, autenticaERC721Decimals, marketDecimals), investorFee, marketplaceFee],
                operator)

            await autenticaERC721.approve(market.address, nftId, { from: seller })
            const trade1 = await market.tradeForTokens(autenticaERC721.address, nftId, price, autenticaERC20.address, buyer, marketplaceFee, tradeSignature1, { from: buyer })
            expectEvent(trade1, 'TradedForTokens', {
                collection: autenticaERC721.address,
                tokenId: nftId,
                seller: seller,
                buyer: buyer,
                token: autenticaERC20.address,
                price: price,
                ownerProceeds: new BN(975),
                creatorProceeds: new BN(0), // Creator doesn't take any royalties because this is the first trade where the creator is actually the owner
                investorProceeds: new BN(0) // 0 because there is no investor
            })

            // Trade 2 (buy back)
            const tradeSignature2 = await generateSignature(
                marketplaceSignatureTypes,
                [market.address, autenticaERC721.address, nftId, buyer, seller, price, autenticaERC20.address, convertedDecimalsRepresentation(royaltyFee, autenticaERC721Decimals, marketDecimals), investorFee, marketplaceFee],
                operator)

            await autenticaERC721.approve(market.address, nftId, { from: buyer })
            const trade2 = await market.tradeForTokens(autenticaERC721.address, nftId, price, autenticaERC20.address, seller, marketplaceFee, tradeSignature2, { from: seller })
            expectEvent(trade2, 'TradedForTokens', {
                collection: autenticaERC721.address,
                tokenId: nftId,
                seller: buyer,
                buyer: seller,
                token: autenticaERC20.address,
                price: price,
                ownerProceeds: new BN(875),
                creatorProceeds: new BN(100), // 10% of the price
                investorProceeds: new BN(0), // 0 because there is no investor
            })
        })

        it("Should test creator and investor proceeds (having investor)", async () => {
            // Parameters
            let nftId = new BN(1)
            let price = new BN(1000)
            let royaltyFee = new BN(10 * 10 ** autenticaERC721Decimals)
            let investorFee = new BN(10 * 10 ** autenticaERC721Decimals)
            let marketplaceFee = new BN(2.5 * 10 ** autenticaERC721Decimals)

            // Mint
            let nftSig = await generateSignature(autenticaERC721SignatureTypes, [autenticaERC721.address, seller, nftId, royaltyFee, investorFee], operator)
            await autenticaERC721.investorMintingAndApproveMarketplace(seller, nftId, "uri", royaltyFee, investorFee, nftSig.v, nftSig.r, nftSig.s, { from: investor })
            
            // Trade 1
            const tradeSignature1 = await generateSignature(
                marketplaceSignatureTypes,
                [market.address, autenticaERC721.address, nftId, seller, buyer, price, autenticaERC20.address, convertedDecimalsRepresentation(royaltyFee, autenticaERC721Decimals, marketDecimals), investorFee, marketplaceFee],
                operator)

            await autenticaERC721.approve(market.address, nftId, { from: seller })
            const trade1 = await market.tradeForTokens(autenticaERC721.address, nftId, price, autenticaERC20.address, buyer, marketplaceFee, tradeSignature1, { from: buyer })
            expectEvent(trade1, 'TradedForTokens', {
                collection: autenticaERC721.address,
                tokenId: nftId,
                seller: seller,
                buyer: buyer,
                token: autenticaERC20.address,
                price: price,
                ownerProceeds: new BN(878),
                creatorProceeds: new BN(0), // Creator doesn't take any royalties because this is the first trade where the creator is actually the owner
                investorProceeds: new BN(97), // 10% of the owner's proceeds (97.5)
            })

            // Trade 2 (buy back)
            const tradeSignature2 = await generateSignature(
                marketplaceSignatureTypes,
                [market.address, autenticaERC721.address, nftId, buyer, seller, price, autenticaERC20.address, convertedDecimalsRepresentation(royaltyFee, autenticaERC721Decimals, marketDecimals), investorFee, marketplaceFee],
                operator)

            await autenticaERC721.approve(market.address, nftId, { from: buyer })
            const trade2 = await market.tradeForTokens(autenticaERC721.address, nftId, price, autenticaERC20.address, seller, marketplaceFee, tradeSignature2, { from: seller })
            expectEvent(trade2, 'TradedForTokens', {
                collection: autenticaERC721.address,
                tokenId: nftId,
                seller: buyer,
                buyer: seller,
                token: autenticaERC20.address,
                price: price,
                ownerProceeds: new BN(875),
                creatorProceeds: new BN(90), // 10% of the price - investor's proceeds
                investorProceeds: new BN(10), // 10% of the creator's proceeds (10)
            })
        })
    })
})