const { expect } = require('chai')
const { autenticaERC721SignatureTypes, generateSignature, decimalsRepresentation, convertedDecimalsRepresentation, dummyTokenAddresses } = require('../utils/TestUtils')
const { BN, expectRevert } = require('@openzeppelin/test-helpers')

const AutenticaERC721 = artifacts.require("AutenticaERC721")
const NFTMarketplace = artifacts.require("NFTMarketplace")
const ERC721Mock = artifacts.require("ERC721Mock")
const ERC721RoyaltiesMock = artifacts.require("ERC721RoyaltiesMock")
const AutenticaERC721CompatibleMock = artifacts.require("AutenticaERC721CompatibleMock")

let deployer, seller, buyer, buyer2, autentica, creator, investor, operator
let market, autenticaERC721, erc721Mock, erc721RoyaltiesMock, autenticaERC721CompatibleMock
let autenticaERC721Decimals, autenticaERC721CompatibleMockDecimals, erc721RoyaltiesMockDecimals, marketplaceDecimals

contract("NFTMarketplace", accounts => {
    describe("getRoyaltyFee()", () => {
        beforeEach("Tests", async () => {
            [deployer, seller, buyer, buyer2, autentica, creator] = accounts

            // Deployments
            market = await NFTMarketplace.new(autentica, dummyTokenAddresses)
            autenticaERC721 = await AutenticaERC721.new()
            erc721Mock = await ERC721Mock.new("Mock", "MCK")
            erc721RoyaltiesMock = await ERC721RoyaltiesMock.new("Mock", "MCK")
            autenticaERC721CompatibleMock = await AutenticaERC721CompatibleMock.new("Mock", "MCK")

            // Info
            autenticaERC721Decimals = await autenticaERC721.decimals()
            autenticaERC721CompatibleMockDecimals = await autenticaERC721CompatibleMock.decimals()
            erc721RoyaltiesMockDecimals = await erc721RoyaltiesMock.DECIMALS()
            marketplaceDecimals = await market.decimals()
        })

        it("Should test getRoyaltyFee() for AutenticaERC721", async () => {
            let royaltyPercentage = "2.5"
            let nftRoyaltyFee = decimalsRepresentation(royaltyPercentage, autenticaERC721Decimals)
            let nftId = 1
            await autenticaERC721.mint(nftId, "uri", nftRoyaltyFee)
            
            let marketplaceRoyaltyFee = await market.getRoyaltyFee(autenticaERC721.address, nftId)
            let expectedRoyaltyFee = new BN(convertedDecimalsRepresentation(nftRoyaltyFee, autenticaERC721Decimals, marketplaceDecimals).toString())
            expect(marketplaceRoyaltyFee).to.bignumber.equal(expectedRoyaltyFee)
        })

        it("Should test require: AutenticaERC721: Token doesn't exist", async () => {
            await expectRevert(
                market.getRoyaltyFee(autenticaERC721.address, 1),
                "AutenticaERC721: Token doesn't exist"
            )
        })

        it("Should test if the fee is 0 because it doesn't support IERC721Autentica", async () => {
            // royaltyFee should be 0
            let x = await market.getRoyaltyFee(erc721Mock.address, 100)
            let royaltyFee = new BN(0)
            expect(x).to.bignumber.equal(royaltyFee)
        })

        it("Should test getRoyaltyFee() for AutenticaERC721CompatibleMock", async () => {
            let royaltyPercentage = "2.5"
            let nftRoyaltyFee = decimalsRepresentation(royaltyPercentage, autenticaERC721CompatibleMockDecimals)
            let nftId = 1
            await autenticaERC721CompatibleMock.mint(seller, nftRoyaltyFee, 0)
            
            let marketplaceRoyaltyFee = await market.getRoyaltyFee(autenticaERC721CompatibleMock.address, nftId)
            let expectedRoyaltyFee = new BN(convertedDecimalsRepresentation(nftRoyaltyFee, autenticaERC721CompatibleMockDecimals, marketplaceDecimals).toString())
            expect(marketplaceRoyaltyFee).to.bignumber.equal(expectedRoyaltyFee)
        })

        it("Should test getRoyaltyFee() for ERC721RoyaltiesMock", async () => {
            let royaltyPercentage = "2.5"
            let nftRoyaltyFee = decimalsRepresentation(royaltyPercentage, erc721RoyaltiesMockDecimals)
            let nftId = 1
            await erc721RoyaltiesMock.mint(seller, nftRoyaltyFee)
            let result = await erc721RoyaltiesMock.royaltyInfo(nftId, new BN(10000))
            
            let marketplaceRoyaltyFee = await market.getRoyaltyFee(erc721RoyaltiesMock.address, nftId)
            let expectedRoyaltyFee = new BN(convertedDecimalsRepresentation(nftRoyaltyFee, erc721RoyaltiesMockDecimals, marketplaceDecimals).toString())
            expect(marketplaceRoyaltyFee).to.bignumber.equal(expectedRoyaltyFee)
        })
    })

    describe("getInvestorFee()", () => {
        beforeEach("Tests", async () => {
            [deployer, seller, buyer, buyer2, autentica, creator, investor, operator] = accounts

            // Deployments
            market = await NFTMarketplace.new(autentica, dummyTokenAddresses)
            autenticaERC721 = await AutenticaERC721.new()
            erc721Mock = await ERC721Mock.new("Mock", "MCK")
            autenticaERC721CompatibleMock = await AutenticaERC721CompatibleMock.new("Mock", "MCK")

            // Initialization
            const role = await autenticaERC721.OPERATOR_ROLE()
            await autenticaERC721.setMarketplace(market.address)
            await autenticaERC721.grantRole(role, operator)

            // Info
            autenticaERC721Decimals = await autenticaERC721.decimals()
            marketplaceDecimals = await market.decimals()
        })

        it("Should test getInvestorFee() for AutenticaERC721", async () => {
            let royaltyPercentage = "2.5"
            let nftRoyaltyFee = decimalsRepresentation(royaltyPercentage, autenticaERC721Decimals)
            let investorPercentage = "5"
            let nftInvestorFee = decimalsRepresentation(investorPercentage, autenticaERC721Decimals)
            let nftId = 1

            // Mint
            let signature = await generateSignature(autenticaERC721SignatureTypes, [autenticaERC721.address, creator, nftId, nftRoyaltyFee, nftInvestorFee], operator)
            await autenticaERC721.investorMintingAndApproveMarketplace(creator, nftId, "", nftRoyaltyFee, nftInvestorFee, signature.v, signature.r, signature.s, { from: investor })

            // Test
            let marketplaceInvestorFee = await market.getInvestorFee(autenticaERC721.address, nftId)
            let expectedInvestorFee = new BN(convertedDecimalsRepresentation(nftInvestorFee, autenticaERC721Decimals, marketplaceDecimals).toString())
            expect(marketplaceInvestorFee).to.bignumber.equal(expectedInvestorFee)
        })

        it("Should test require: AutenticaERC721: Token doesn't exist", async () => {
            await expectRevert(
                market.getInvestorFee(autenticaERC721.address, 1),
                "AutenticaERC721: Token doesn't exist"
            )
        })

        it("Should test if the fee is 0 because it doesn't support IERC721Autentica", async () => {
            // investorFee should be 0
            let x = await market.getInvestorFee(erc721Mock.address, 100)
            let investorFee = new BN(0)
            expect(x).to.bignumber.equal(investorFee)
        })

        it("Should test getInvestorFee() for AutenticaERC721CompatibleMock", async () => {
            let investorPercentage = "5.25"
            let nftInvestorFee = decimalsRepresentation(investorPercentage, autenticaERC721CompatibleMockDecimals)
            let nftId = 1
            await autenticaERC721CompatibleMock.mint(seller, 0, nftInvestorFee)

            let marketplaceInvestorFee = await market.getInvestorFee(autenticaERC721CompatibleMock.address, nftId)
            let expectedInvestorFee = new BN(convertedDecimalsRepresentation(nftInvestorFee, autenticaERC721CompatibleMockDecimals, marketplaceDecimals).toString())
            expect(marketplaceInvestorFee).to.bignumber.equal(expectedInvestorFee)
        })
    })
})