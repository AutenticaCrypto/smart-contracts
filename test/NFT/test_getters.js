const { expect } = require('chai')
const { BN, constants, expectRevert } = require('@openzeppelin/test-helpers')
const { autenticaERC721SignatureTypes, generateSignature } = require('../utils/TestUtils')

const AutenticaERC721 = artifacts.require("AutenticaERC721")

let deployer, creator, investor, operator, marketplace
let autenticaERC721

contract("AutenticaERC721", accounts => {
    describe("decimals()", () => {
        beforeEach("Tests", async () => {
            [deployer] = accounts

            // Deployments
            autenticaERC721 = await AutenticaERC721.new()
        })

        it("Should test decimals()", async () => {
            expect(await autenticaERC721.decimals()).to.not.throw
        })
    })

    describe("getRoyaltyFee()", () => {
        beforeEach("Tests", async () => {
            [deployer] = accounts

            // Deployments
            autenticaERC721 = await AutenticaERC721.new()
        })

        it("Should fail with: AutenticaERC721: Token doesn't exist", async () => {
            await expectRevert(
                autenticaERC721.getRoyaltyFee(0),
                "AutenticaERC721: Token doesn't exist"
            )
        })

        it("Should return the correct information", async () => {
            let tokenId = 1
            let royaltyFee = new BN(10)

            // Mint first
            await autenticaERC721.mint(tokenId, "", royaltyFee)

            // Get royalty fee
            expect(await autenticaERC721.getRoyaltyFee(tokenId)).to.bignumber.be.equal(royaltyFee)
        })
    })

    describe("getCreator()", () => {
        beforeEach("Tests", async () => {
            [deployer] = accounts

            // Deployments
            autenticaERC721 = await AutenticaERC721.new()
        })

        it("Should fail with: AutenticaERC721: Token doesn't exist", async () => {
            await expectRevert(
                autenticaERC721.getCreator(0),
                "AutenticaERC721: Token doesn't exist"
            )
        })

        it("Should return the correct information", async () => {
            let creator = deployer
            let tokenId = 1

            // Mint first
            await autenticaERC721.mint(tokenId, "", 0, { from: creator })

            // Get creator
            expect(await autenticaERC721.getCreator(tokenId)).to.equal(creator)
        })
    })

    describe("getInvestorFee()", () => {
        beforeEach("Tests", async () => {
            [deployer, creator, investor, operator, marketplace] = accounts

            // Deployments
            autenticaERC721 = await AutenticaERC721.new()

            // Initialization
            const role = await autenticaERC721.OPERATOR_ROLE()
            await autenticaERC721.grantRole(role, operator)
            await autenticaERC721.setMarketplace(marketplace)
        })

        it("Should fail with: AutenticaERC721: Token doesn't exist", async () => {
            await expectRevert(
                autenticaERC721.getInvestorFee(0),
                "AutenticaERC721: Token doesn't exist"
            )
        })

        it("Should return 0 for normal minting", async () => {
            let tokenId = 1
            let royaltyFee = new BN(10)

            // Mint first
            await autenticaERC721.mint(tokenId, "", royaltyFee)

            // Get investor fee
            expect(await autenticaERC721.getInvestorFee(tokenId)).to.bignumber.be.equal(new BN(0))
        })

        it("Should return the correct value for investor minting", async () => {
            let tokenId = 1
            let royaltyFee = new BN(10)
            let investorFee = new BN(25)

            // Mint first
            let signature = await generateSignature(autenticaERC721SignatureTypes, [autenticaERC721.address, creator, tokenId, royaltyFee, investorFee], operator)
            await autenticaERC721.investorMintingAndApproveMarketplace(creator, tokenId, "", royaltyFee, investorFee, signature.v, signature.r, signature.s, { from: investor })

            // Get investor fee
            expect(await autenticaERC721.getInvestorFee(tokenId)).to.bignumber.be.equal(investorFee)
        })
    })

    describe("getInvestor()", () => {
        beforeEach("Tests", async () => {
            [deployer] = accounts

            // Deployments
            autenticaERC721 = await AutenticaERC721.new()
        })

        it("Should fail with: AutenticaERC721: Token doesn't exist", async () => {
            await expectRevert(
                autenticaERC721.getInvestor(0),
                "AutenticaERC721: Token doesn't exist"
            )
        })

        it("Should return the correct information", async () => {
            let creator = deployer
            let investor = constants.ZERO_ADDRESS // the below function will not use the investor minting route
            let tokenId = 1

            // Mint first
            await autenticaERC721.mint(tokenId, "", 0, { from: creator })

            // Get creator
            expect(await autenticaERC721.getInvestor(tokenId)).to.equal(investor)
        })
    })

    describe("getDetails()", () => {
        beforeEach("Tests", async () => {
            [deployer] = accounts

            // Deployments
            autenticaERC721 = await AutenticaERC721.new()
        })

        it("Should fail with: AutenticaERC721: Token doesn't exist", async () => {
            await expectRevert(
                autenticaERC721.getTokenDetails(0),
                "AutenticaERC721: Token doesn't exist"
            )
        })

        it("Should return the correct information", async () => {
            let tokenId = 1
            let royaltyFee = new BN(10)

            // Mint first
            await autenticaERC721.mint(tokenId, "", royaltyFee)

            // Get the details
            let details = await autenticaERC721.getTokenDetails(tokenId)
            expect(details.creator).to.equal(deployer)
            expect(details.investor).to.equal(constants.ZERO_ADDRESS)
            expect(details.royaltyFee).to.bignumber.equal(royaltyFee)
            expect(details.investorFee).to.bignumber.equal(new BN(0))
        })
    })
})