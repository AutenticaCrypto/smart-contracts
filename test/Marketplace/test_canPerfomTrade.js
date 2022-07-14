const { expect, assert } = require('chai')
const { BN, expectRevert } = require('@openzeppelin/test-helpers')
const { 
    autenticaERC721SignatureTypes, 
    generateSignature, 
    decimalsRepresentation, 
    marketplaceSignatureTypes, 
    dummyAddress, dummySignature, dummyTokenAddresses
} = require('../utils/TestUtils.js')

const AutenticaERC20 = artifacts.require("Autentica")
const AutenticaERC721 = artifacts.require("AutenticaERC721")
const NFTMarketplace = artifacts.require("NFTMarketplace")
const ERC721Mock = artifacts.require("ERC721Mock")

let deployer, seller, buyer, buyer2, operator, autentica, creator, investor
let autenticaERC20, autenticaERC721, erc721Mock, market
let decimals

const baseNftId = new BN(1)
const baseNftId2 = new BN(2)
const baseNftRoyaltyFee = "2.5"
const baseNftInvestorFee = "50"

contract("NFTMarketplace", accounts => {
    describe("canPerformTrade()", () => {
        beforeEach("Tests", async () => {
            [deployer, seller, buyer, buyer2, operator, autentica, creator, investor] = accounts

            // Deploy contracts
            autenticaERC20 = await AutenticaERC20.new()
            autenticaERC721 = await AutenticaERC721.new()
            erc721Mock = await ERC721Mock.new("Mock", "MCK")
            market = await NFTMarketplace.new(autentica, dummyTokenAddresses)

            // Info
            decimals = await autenticaERC721.decimals()

            // Custom settings
            const role = await market.OPERATOR_ROLE()
            await market.grantRole(role, operator)
            await autenticaERC721.grantRole(role, operator)
            await autenticaERC721.setMarketplace(market.address)

            await autenticaERC20.approve(market.address, 100000)
            await autenticaERC20.transfer(buyer, 50000)
            await autenticaERC20.approve(market.address, 50000, { from: buyer })
            await autenticaERC20.transfer(buyer2, 50000)
            await autenticaERC20.approve(market.address, 50000, { from: buyer2 })

            // Normal mint an NFT in the Autentica ERC-721 contract
            await autenticaERC721.mint(baseNftId, "uri", decimalsRepresentation(baseNftRoyaltyFee, decimals), { from: seller })
            await autenticaERC721.approve(market.address, baseNftId, { from: seller })

            // Investor mint an NFT in the Autentica ERC-721 contract
            let signature = await generateSignature(
                autenticaERC721SignatureTypes, 
                [autenticaERC721.address, creator, baseNftId2, decimalsRepresentation(baseNftRoyaltyFee, decimals), decimalsRepresentation(baseNftInvestorFee, decimals)],
                operator
            )
            await autenticaERC721.investorMintingAndApproveMarketplace(
                creator, baseNftId2, "uri", 
                decimalsRepresentation(baseNftRoyaltyFee, decimals), decimalsRepresentation(baseNftInvestorFee, decimals),
                signature.v, signature.r, signature.s,
                { from: investor }
            )

            // Mint an NFT in the Standard ERC-721 contract
            await erc721Mock.mint(seller, { from: seller })
            await erc721Mock.approve(market.address, 1, { from: seller })
        })

        it("Should test - _validateERC721() - require: NFTMarketplace: Collection does not support the ERC-721 interface", async () => {
            await expectRevert(
                market.canPerformTrade(autenticaERC20.address, 0, 0, dummyAddress, dummyAddress, 0, dummySignature),
                "NFTMarketplace: Collection does not support the ERC-721 interface"
            )
        })

        it("Should test - _validateNFTApproval() - require: Market: NFTMarketplace: Owner has not approved us for managing its NFTs", async () => {
            // Parameters
            let nftId = 3

            // Mint NFT
            await autenticaERC721.mint(nftId, "uri", 0, { from: seller });
            // Note: `seller` does not approve the `nftId`

            await expectRevert(
                market.canPerformTrade(autenticaERC721.address, nftId, 0, dummyAddress, dummyAddress, 0, dummySignature),
                "NFTMarketplace: Owner has not approved us for managing its NFTs"
            )
        })

        it("Should test - _validateFees() - require: NFTMarketplace: Total fees cannot be greater than 100%", async () => {
            // Parameters
            let nftId = baseNftId2
            
            // Info
            const decimals = await market.decimals()
            const marketplaceFee = decimalsRepresentation("100", decimals)
            // Note: `baseNftRoyaltyFee` + `marketplaceFee` = 102.5%

            await expectRevert(
                market.canPerformTrade(autenticaERC721.address, nftId, 0, dummyAddress, dummyAddress, marketplaceFee, dummySignature),
                "NFTMarketplace: Total fees cannot be greater than 100%"
            )
        })

        it("Should test - _validateFees() - ok (exact)", async () => {
            // Parameters
            let nftId = baseNftId2
            
            // Info
            const decimals = await market.decimals()
            const marketplaceFee = decimalsRepresentation("97.5", decimals)
            // Note: `baseNftRoyaltyFee` + `marketplaceFee` = 100%

            try {
                await market.canPerformTrade(autenticaERC721.address, nftId, 0, dummyAddress, dummyAddress, marketplaceFee, dummySignature)
                assert.isTrue(true)
            } catch (error) {
                expect(error.message).to.not.include("NFTMarketplace: Total fees cannot be greater than 100%")
            }
        })

        it("Should test - _validateFees() - ok (lower)", async () => {
            // Parameters
            let nftId = baseNftId2
            
            // Info
            const decimals = await market.decimals()
            const marketplaceFee = decimalsRepresentation("2.5", decimals)
            // Note: `baseNftRoyaltyFee` + `marketplaceFee` = 5%

            try {
                await market.canPerformTrade(autenticaERC721.address, nftId, 0, dummyAddress, dummyAddress, marketplaceFee, dummySignature)
                assert.isTrue(true)
            } catch (error) {
                expect(error.message).to.not.include("NFTMarketplace: Total fees cannot be greater than 100%")
            }
        })

        it("Should test - _validateTrade() - require: NFTMarketplace: Invalid signature", async () => {
            // Parameters
            let nftId = 1
            let price = 0
            let token = autenticaERC20.address
            let marketplaceFee = 0
            let invalidCollectionAddress = erc721Mock.address

            // Generate signature
            const expandedSig = await generateSignature(
                marketplaceSignatureTypes,
                [market.address, invalidCollectionAddress, nftId, seller, buyer, price, token, 0, 0, 0],
                operator
            )

            await expectRevert(
                market.canPerformTrade(autenticaERC721.address, nftId, price, token, buyer, marketplaceFee, expandedSig, { from: buyer }),
                "NFTMarketplace: Invalid signature"
            )
        })

        it("Should test ok", async () => {
            // Parameters
            let nftId = new BN(1)
            let price = new BN(0)
            let token = autenticaERC20.address
            let marketplaceFee = 0

            // Generate signature
            const expandedSig = await generateSignature(
                marketplaceSignatureTypes,
                [market.address, autenticaERC721.address, nftId, seller, buyer, price, token, decimalsRepresentation(baseNftRoyaltyFee, decimals), 0, marketplaceFee],
                operator
            )

            expect(await market.canPerformTrade(autenticaERC721.address, nftId, price, token, buyer, marketplaceFee, expandedSig, { from: buyer, gas: 1000000 })).to.be.true
        })
    })
})
