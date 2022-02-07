const { expect } = require('chai')
const { BN, constants, expectRevert, expectEvent } = require('@openzeppelin/test-helpers')
const { autenticaERC721SignatureTypes, generateSignature } = require('../utils/TestUtils')

const AutenticaERC721 = artifacts.require("AutenticaERC721")

let deployer, marketplace, creator, investor, operator, user
let autenticaERC721
let decimals

contract("AutenticaERC721", accounts => {
    describe("mint()", () => {
        beforeEach("Tests", async () => {
            [deployer] = accounts

            // Deployments
            autenticaERC721 = await AutenticaERC721.new()
            decimals = await autenticaERC721.decimals()
        })

        it("Should fail with: AutenticaERC721: Fee must be less than or equal to 100%", async () => {
            await expectRevert(
                autenticaERC721.mint(1, "", new Number(100.1 * 10 ** decimals).toString()),
                "AutenticaERC721: Fee must be less than or equal to 100%"
            )
        })

        it("Should test mint()", async () => {
            // Parameters
            let tokenId = new BN(1)
            let uri = "https://www.example.com"
            let royaltyFee = new Number(2.5 * 10 ** decimals).toString() // 2.5%
            let creator = deployer
            let investor = constants.ZERO_ADDRESS

            // Mint
            let receipt = await autenticaERC721.mint(tokenId, uri, royaltyFee, { from: creator })

            // Check event
            expectEvent(receipt, 'Transfer', {
                from: constants.ZERO_ADDRESS,
                to: creator,
                tokenId: tokenId,
            })

            // Check token
            expect(await autenticaERC721.ownerOf(tokenId)).to.be.equal(creator)
            expect(await autenticaERC721.tokenURI(tokenId)).to.be.equal(uri)
            expect(await autenticaERC721.getCreator(tokenId)).to.be.equal(creator)
            expect(await autenticaERC721.getRoyaltyFee(tokenId)).to.bignumber.be.equal(royaltyFee)
            expect(await autenticaERC721.getInvestor(tokenId)).to.be.equal(investor)
        })
    })

    describe("investorMintingAndApproveMarketplace()", () => {
        beforeEach("Tests", async () => {
            [deployer, marketplace, creator, investor, operator, user] = accounts

            // Deployments
            autenticaERC721 = await AutenticaERC721.new()

            // Initialization
            const role = await autenticaERC721.OPERATOR_ROLE()
            await autenticaERC721.setMarketplace(marketplace)
            await autenticaERC721.grantRole(role, operator)
        })

        it("Should fail with: AutenticaERC721: Fee must be less than or equal to 100% (#1 royalty)", async () => {
            // Parameters
            let tokenId = new BN(1)
            let uri = "https://www.example.com"
            let royaltyFee = new Number(100.1 * 10 ** decimals).toString()
            let investorFee = new BN(10 * 10 ** decimals).toString()

            // Signature
            let signature = await generateSignature(autenticaERC721SignatureTypes, [autenticaERC721.address, creator, tokenId, royaltyFee, investorFee], operator)

            await expectRevert(
                autenticaERC721.investorMintingAndApproveMarketplace(creator, tokenId, uri, royaltyFee, investorFee, signature.v, signature.r, signature.s, { from: investor }),
                "AutenticaERC721: Fee must be less than or equal to 100%"
            )
        })

        it("Should fail with: AutenticaERC721: Fee must be less than or equal to 100% (#2 investor)", async () => {
            // Parameters
            let tokenId = new BN(1)
            let uri = "https://www.example.com"
            let royaltyFee = new Number(2.5 * 10 ** decimals).toString()
            let investorFee = new BN(100.1 * 10 ** decimals).toString()

            // Signature
            let signature = await generateSignature(autenticaERC721SignatureTypes, [autenticaERC721.address, creator, tokenId, royaltyFee, investorFee], operator)

            await expectRevert(
                autenticaERC721.investorMintingAndApproveMarketplace(creator, tokenId, uri, royaltyFee, investorFee, signature.v, signature.r, signature.s, { from: investor }),
                "AutenticaERC721: Fee must be less than or equal to 100%"
            )
        })

        it("Should fail with: AutenticaERC721: Investor can't be the creator", async () => {
            // Parameters
            let tokenId = new BN(1)
            let uri = "https://www.example.com"
            let royaltyFee = new Number(2.5 * 10 ** decimals).toString() // 2.5%
            let investorFee = new BN(10 * 10 ** decimals).toString() // 10%

            // Signature
            let signature = await generateSignature(autenticaERC721SignatureTypes, [autenticaERC721.address, investor, tokenId, royaltyFee, investorFee], operator)

            await expectRevert(
                autenticaERC721.investorMintingAndApproveMarketplace(investor, tokenId, uri, royaltyFee, investorFee, signature.v, signature.r, signature.s, { from: investor }),
                "AutenticaERC721: Investor can't be the creator"
            )
        })

        it("Should fail with: AutenticaERC721: Invalid signature", async () => {
            // Parameters
            let tokenId = new BN(1)
            let uri = "https://www.example.com"
            let royaltyFee = new Number(2.5 * 10 ** decimals).toString() // 2.5%
            let investorFee = new BN(10 * 10 ** decimals).toString() // 10%

            // Signature
            let signature = await generateSignature(autenticaERC721SignatureTypes, [autenticaERC721.address, creator, tokenId, royaltyFee, investorFee], user)

            await expectRevert(
                autenticaERC721.investorMintingAndApproveMarketplace(creator, tokenId, uri, royaltyFee, investorFee, signature.v, signature.r, signature.s, { from: investor }),
                "AutenticaERC721: Invalid signature"
            )
        })

        it("Should test mint()", async () => {
            // Parameters
            let tokenId = new BN(1)
            let uri = "https://www.example.com"
            let royaltyFee = new Number(2.5 * 10 ** decimals).toString() // 2.5%
            let investorFee = new BN(10 * 10 ** decimals).toString() // 10%

            // Mint
            let signature = await generateSignature(autenticaERC721SignatureTypes, [autenticaERC721.address, creator, tokenId, royaltyFee, investorFee], operator)
            let receipt = await autenticaERC721.investorMintingAndApproveMarketplace(creator, tokenId, uri, royaltyFee, investorFee, signature.v, signature.r, signature.s, { from: investor })

            // Check transfer event
            expectEvent(receipt, 'Transfer', {
                from: constants.ZERO_ADDRESS,
                to: creator,
                tokenId: tokenId,
            })

            // Check token
            expect(await autenticaERC721.ownerOf(tokenId)).to.be.equal(creator)
            expect(await autenticaERC721.tokenURI(tokenId)).to.be.equal(uri)
            expect(await autenticaERC721.getCreator(tokenId)).to.be.equal(creator)
            expect(await autenticaERC721.getRoyaltyFee(tokenId)).to.bignumber.be.equal(royaltyFee)
            expect(await autenticaERC721.getInvestor(tokenId)).to.be.equal(investor)

            // Check approval event
            expectEvent(receipt, 'Approval', {
                owner: creator,
                approved: marketplace,
                tokenId: tokenId,
            })
        })
    })
})