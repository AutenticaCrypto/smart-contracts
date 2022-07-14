const expectEvent = require('@openzeppelin/test-helpers/src/expectEvent')
const { expect } = require('chai')
const { expectRevert } = require('@openzeppelin/test-helpers')
const { dummyTokenAddresses } = require('../utils/TestUtils')

const NFTMarketplace = artifacts.require("NFTMarketplace")
const AutenticaERC721 = artifacts.require("AutenticaERC721")

let deployer, autentica1, autentica2, user
let autenticaERC721, market

contract("NFTMarketplace", accounts => {
    describe("setAutentica()", () => {
        beforeEach("Tests", async () => {
            [deployer, autentica1, autentica2, user] = accounts

            // Deployments
            autenticaERC721 = await AutenticaERC721.new()
            market = await NFTMarketplace.new(autentica1, dummyTokenAddresses)
        })

        it("Should test require: NFTMarketplace: Only admins can change this", async () => {
            await expectRevert(
                market.setAutentica(autentica2, { from: user }),
                "NFTMarketplace: Only admins can change this"
            )
        })

        it("Should test setAutentica()", async () => {
            expect(await market.autentica()).to.equal(autentica1)

            let receipt = await market.setAutentica(autentica2)
            expectEvent(receipt, 'ChangedAutentica', {
                oldAddress: autentica1,
                newAddress: autentica2
            })
            expect(await market.autentica()).to.equal(autentica2)
        })
    })
})