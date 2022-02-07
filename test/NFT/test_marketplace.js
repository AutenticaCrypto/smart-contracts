const { expect } = require('chai')
const { expectRevert, expectEvent } = require('@openzeppelin/test-helpers')

const AutenticaERC721 = artifacts.require("AutenticaERC721")

let deployer, marketplace, user
let autenticaERC721

contract("AutenticaERC721", accounts => {
    describe("marketplace()", () => {
        beforeEach("Tests", async () => {
            [deployer] = accounts

            // Deployments
            autenticaERC721 = await AutenticaERC721.new()
        })

        it("Should test marketplace()", async () => {
            expect(await autenticaERC721.marketplace()).to.not.throw
        })
    })

    describe("setMarketplace()", () => {
        beforeEach("Tests", async () => {
            [deployer, marketplace, user] = accounts

            // Deployments
            autenticaERC721 = await AutenticaERC721.new()
        })

        it("Should fail with: AutenticaERC721: Only admins can change this", async () => {
            await expectRevert(
                autenticaERC721.setMarketplace(marketplace, { from: user }),
                "AutenticaERC721: Only admins can change this"
            )
        })

        it("Should be allowed", async () => {
            let oldMarketplace = await autenticaERC721.marketplace()
            let receipt = await autenticaERC721.setMarketplace(marketplace)
            expectEvent(receipt, 'ChangedMarketplace', {
                oldAddress: oldMarketplace,
                newAddress: marketplace
            })
        })
    })
})