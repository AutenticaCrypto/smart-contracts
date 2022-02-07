const { expect } = require('chai')
const { BN } = require('@openzeppelin/test-helpers')

const AutenticaERC721 = artifacts.require("AutenticaERC721")

let deployer
let autenticaERC721

contract("AutenticaERC721", accounts => {
    describe("exists()", () => {
        beforeEach("Tests", async () => {
            [deployer] = accounts

            // Deployments
            autenticaERC721 = await AutenticaERC721.new()
        })

        it("Should test exists() #1", async () => {
            expect(await autenticaERC721.exists(0)).to.be.false
        })

        it("Should test exists() #2", async () => {
            // Parameters
            let tokenId = new BN(1)

            // Mint first
            await autenticaERC721.mint(tokenId, "", 0)

            // Check
            expect(await autenticaERC721.exists(tokenId)).to.be.true
        })
    })
})