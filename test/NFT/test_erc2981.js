const { expect } = require('chai')
const { expectRevert, constants, BN } = require('@openzeppelin/test-helpers')

const AutenticaERC721 = artifacts.require("AutenticaERC721")

let deployer
let autenticaERC721
let decimals

const tokenId = new BN(1)
const royalties = 10
const _INTERFACE_ID_ERC2981 = "0x2a55205a"

contract("AutenticaERC721", accounts => {
    describe("ERC-2981 support", () => {
        beforeEach("Tests", async () => {
            [deployer] = accounts

            // Deployments
            autenticaERC721 = await AutenticaERC721.new()
        })

        it("Should support ERC-2981()", async () => {
            expect(await autenticaERC721.supportsInterface(_INTERFACE_ID_ERC2981)).to.be.true
        })
    })

    describe("royaltyInfo()", () => {
        beforeEach("Tests", async () => {
            [deployer] = accounts

            // Deployments
            autenticaERC721 = await AutenticaERC721.new()

            // Information
            decimals = await autenticaERC721.decimals()

            // Mint
            let royaltyFee = new Number(royalties * 10 ** decimals).toString()
            await autenticaERC721.mint(tokenId, "uri", royaltyFee)
        })

        it("Should return 0", async () => {
            let anotherTokenId = new BN(2)
            let royaltyFee = new BN(0)

            // Mint first
            await autenticaERC721.mint(anotherTokenId, "uri", royaltyFee)

            // Check
            let result = await autenticaERC721.royaltyInfo(anotherTokenId, new BN(100))
            expect(result.receiver).to.equal(constants.ZERO_ADDRESS)
            expect(result.royaltyAmount).to.bignumber.equal(new BN(0))
        })

        it("Should return the correct values", async () => {
            let price = new BN(100)
            let expectedResult = price.mul(new BN(royalties).mul(new BN(10**decimals))).div(new BN(100).mul(new BN(10**decimals)))
            
            // Check
            let result = await autenticaERC721.royaltyInfo(tokenId, price)
            expect(result.receiver).to.equal(deployer)
            expect(result.royaltyAmount).to.bignumber.equal(expectedResult)
        })
    })
})