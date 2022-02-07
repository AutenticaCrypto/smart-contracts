const { BN, expectEvent, constants } = require('@openzeppelin/test-helpers')
const { deployProxy } = require('@openzeppelin/truffle-upgrades')

const AutenticaERC721 = artifacts.require("AutenticaERC721")
const NFTMarketplace = artifacts.require("NFTMarketplace")

const { marketplaceSignatureTypes, convertedDecimalsRepresentation, generateSignature, autenticaERC721SignatureTypes, dummyTokenAddresses } = require('../utils/TestUtils.js')

let deployer, seller, buyer, operator, investor, autentica
let autenticaERC721, market
let autenticaERC721Decimals, marketDecimals

contract("NFTMarketplace", accounts => {
    describe("tradeForCoins() - proceeds testing", () => {
        beforeEach("Tests", async () => {
            [deployer, seller, buyer, operator, investor, autentica] = accounts;

            // Deployments
            autenticaERC721 = await AutenticaERC721.new()
            market = await deployProxy(NFTMarketplace, [autentica, dummyTokenAddresses])

            // Information
            autenticaERC721Decimals = await autenticaERC721.decimals()
            marketDecimals = await market.decimals()

            // Operator
            const role = await market.OPERATOR_ROLE()
            await market.grantRole(role, operator, { from: deployer })
            await autenticaERC721.grantRole(role, operator, { from: deployer })

            // Set the marketplace address
            await autenticaERC721.setMarketplace(market.address)
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
                [market.address, autenticaERC721.address, nftId, seller, buyer, price, constants.ZERO_ADDRESS, convertedDecimalsRepresentation(royaltyFee, autenticaERC721Decimals, marketDecimals), investorFee, marketplaceFee],
                operator)

            await autenticaERC721.approve(market.address, nftId, { from: seller })
            const trade1 = await market.tradeForCoins(autenticaERC721.address, nftId, price, buyer, marketplaceFee, tradeSignature1, { from: buyer, value: price })
            expectEvent(trade1, 'TradedForCoins', {
                collection: autenticaERC721.address,
                tokenId: nftId,
                seller: seller,
                buyer: buyer,
                price: price,
                creatorProceeds: new BN(0), // Creator doesn't take any royalties because this is the first trade where the creator is actually the owner
                investorProceeds: new BN(0) // 0 because there is no investor
            })

            // Trade 2 (buy back)
            const tradeSignature2 = await generateSignature(
                marketplaceSignatureTypes,
                [market.address, autenticaERC721.address, nftId, buyer, seller, price, constants.ZERO_ADDRESS, convertedDecimalsRepresentation(royaltyFee, autenticaERC721Decimals, marketDecimals), investorFee, marketplaceFee],
                operator)

            await autenticaERC721.approve(market.address, nftId, { from: buyer })
            const trade2 = await market.tradeForCoins(autenticaERC721.address, nftId, price, seller, marketplaceFee, tradeSignature2, { from: seller, value: price })
            expectEvent(trade2, 'TradedForCoins', {
                collection: autenticaERC721.address,
                tokenId: nftId,
                seller: buyer,
                buyer: seller,
                price: price,
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
                [market.address, autenticaERC721.address, nftId, seller, buyer, price, constants.ZERO_ADDRESS, convertedDecimalsRepresentation(royaltyFee, autenticaERC721Decimals, marketDecimals), investorFee, marketplaceFee],
                operator)

            await autenticaERC721.approve(market.address, nftId, { from: seller })
            const trade1 = await market.tradeForCoins(autenticaERC721.address, nftId, price, buyer, marketplaceFee, tradeSignature1, { from: buyer, value: price })
            expectEvent(trade1, 'TradedForCoins', {
                collection: autenticaERC721.address,
                tokenId: nftId,
                seller: seller,
                buyer: buyer,
                price: price,
                creatorProceeds: new BN(0), // Creator doesn't take any royalties because this is the first trade where the creator is actually the owner
                investorProceeds: new BN(97), // 10% of the owner's proceeds (97.5)
            })

            // Trade 2 (buy back)
            const tradeSignature2 = await generateSignature(
                marketplaceSignatureTypes,
                [market.address, autenticaERC721.address, nftId, buyer, seller, price, constants.ZERO_ADDRESS, convertedDecimalsRepresentation(royaltyFee, autenticaERC721Decimals, marketDecimals), investorFee, marketplaceFee],
                operator)

            await autenticaERC721.approve(market.address, nftId, { from: buyer })
            const trade2 = await market.tradeForCoins(autenticaERC721.address, nftId, price, seller, marketplaceFee, tradeSignature2, { from: seller, value: price })
            expectEvent(trade2, 'TradedForCoins', {
                collection: autenticaERC721.address,
                tokenId: nftId,
                seller: buyer,
                buyer: seller,
                price: price,
                creatorProceeds: new BN(90), // 10% of the price - investor's proceeds
                investorProceeds: new BN(10), // 10% of the creator's proceeds (10)
            })
        })
    })
})