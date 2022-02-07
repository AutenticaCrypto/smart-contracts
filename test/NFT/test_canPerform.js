const { expect } = require('chai')
const { BN, constants, expectRevert } = require('@openzeppelin/test-helpers')
const { autenticaERC721SignatureTypes, generateSignature, dummySignature } = require('../utils/TestUtils')

const AutenticaERC721 = artifacts.require("AutenticaERC721")

let deployer, marketplace, creator, investor, operator, user
let autenticaERC721
let decimals
let tokenId = new BN(1)

contract("AutenticaERC721", accounts => {
    describe("canPerformMint()", () => {
        beforeEach("Tests", async () => {
            [deployer] = accounts

            // Deployments
            autenticaERC721 = await AutenticaERC721.new()
            decimals = await autenticaERC721.decimals()

            // Mint
            await autenticaERC721.mint(tokenId, "", new Number(2.5 * 10 ** decimals).toString())
        })

        it("Should fail with: AutenticaERC721: Token already minted", async () => {
            await expectRevert(
                autenticaERC721.canPerformMint(tokenId, new Number(5 * 10 ** decimals).toString()),
                "AutenticaERC721: Token already minted"
            )
        })

        it("Should fail with: AutenticaERC721: Fee must be less than or equal to 100%", async () => {
            await expectRevert(
                autenticaERC721.canPerformMint(2, new Number(100.1 * 10 ** decimals).toString()),
                "AutenticaERC721: Fee must be less than or equal to 100%"
            )
        })

        it("Should be able to perform mint", async () => {
            expect(await autenticaERC721.canPerformMint(2, new Number(2.5 * 10 ** decimals).toString())).to.be.true
        })
    })

    describe("canPerformInvestorMinting()", () => {
        beforeEach("Tests", async () => {
            [deployer, marketplace, creator, investor, operator, user] = accounts

            // Deployments
            autenticaERC721 = await AutenticaERC721.new()

            // Initialization
            const role = await autenticaERC721.OPERATOR_ROLE()
            await autenticaERC721.setMarketplace(marketplace)
            await autenticaERC721.grantRole(role, operator)

            // Mint
            await autenticaERC721.mint(tokenId, "", new Number(2.5 * 10 ** decimals).toString())
        })

        it("Should fail with: AutenticaERC721: Token already minted", async () => {
            // Parameters
            let royaltyFee = 0
            let investorFee = 0

            await expectRevert(
                autenticaERC721.canPerformInvestorMinting(creator, tokenId, royaltyFee, investorFee, dummySignature.v, dummySignature.r, dummySignature.s),
                "AutenticaERC721: Token already minted"
            )
        })

        it("Should fail with: AutenticaERC721: Fee must be less than or equal to 100% (#1 royalty)", async () => {
            // Parameters
            let newTokenId = new BN(2)
            let royaltyFee = new Number(100.1 * 10 ** decimals).toString() // 100.1%
            let investorFee = 0

            await expectRevert(
                autenticaERC721.canPerformInvestorMinting(creator, newTokenId, royaltyFee, investorFee, dummySignature.v, dummySignature.r, dummySignature.s),
                "AutenticaERC721: Fee must be less than or equal to 100%"
            )
        })

        it("Should fail with: AutenticaERC721: Fee must be less than or equal to 100% (#2 investor)", async () => {
            // Parameters
            let newTokenId = new BN(2)
            let royaltyFee = 0
            let investorFee = new Number(100.1 * 10 ** decimals).toString() // 100.1%

            await expectRevert(
                autenticaERC721.canPerformInvestorMinting(creator, newTokenId, royaltyFee, investorFee, dummySignature.v, dummySignature.r, dummySignature.s),
                "AutenticaERC721: Fee must be less than or equal to 100%"
            )
        })

        it("Should fail with: AutenticaERC721: Investor can't be the creator", async () => {
            // Parameters
            let newTokenId = new BN(2)
            let royaltyFee = new Number(2.5 * 10 ** decimals).toString() // 2.5%
            let investorFee = new BN(10 * 10 ** decimals).toString() // 10%

            await expectRevert(
                autenticaERC721.canPerformInvestorMinting(investor, newTokenId, royaltyFee, investorFee, dummySignature.v, dummySignature.r, dummySignature.s, { from: investor }),
                "AutenticaERC721: Investor can't be the creator"
            )
        })

        it("Should fail with: AutenticaERC721: Invalid signature", async () => {
            // Parameters
            let newTokenId = new BN(2)
            let royaltyFee = new Number(2.5 * 10 ** decimals).toString() // 2.5%
            let investorFee = new BN(10 * 10 ** decimals).toString() // 10%

            await expectRevert(
                autenticaERC721.canPerformInvestorMinting(creator, newTokenId, royaltyFee, investorFee, dummySignature.v, dummySignature.r, dummySignature.s, { from: investor }),
                "AutenticaERC721: Invalid signature"
            )
        })

        it("Should fail with: AutenticaERC721: Marketplace address not set", async () => {
            // Parameters
            let newTokenId = new BN(2)
            let royaltyFee = new Number(2.5 * 10 ** decimals).toString() // 2.5%
            let investorFee = new BN(10 * 10 ** decimals).toString() // 10%

            // Change the marketplace address
            await autenticaERC721.setMarketplace(constants.ZERO_ADDRESS)

            // Signature
            let signature = await generateSignature(autenticaERC721SignatureTypes, [autenticaERC721.address, creator, newTokenId, royaltyFee, investorFee], operator)
            
            await expectRevert(
                autenticaERC721.canPerformInvestorMinting(creator, newTokenId, royaltyFee, investorFee, signature.v, signature.r, signature.s, { from: investor }),
                "AutenticaERC721: Marketplace address not set"
            )
        })

        it("Should test mint()", async () => {
            // Parameters
            let newTokenId = new BN(2)
            let royaltyFee = new Number(2.5 * 10 ** decimals).toString() // 2.5%
            let investorFee = new BN(10 * 10 ** decimals).toString() // 10%

            // Signature
            let signature = await generateSignature(autenticaERC721SignatureTypes, [autenticaERC721.address, creator, newTokenId, royaltyFee, investorFee], operator)

            expect(await autenticaERC721.canPerformInvestorMinting(creator, newTokenId, royaltyFee, investorFee, signature.v, signature.r, signature.s, { from: investor })).to.be.true
        })
    })
})