const { expect } = require('chai')
const { dummyTokenAddresses } = require('../utils/TestUtils')

const NFTMarketplace = artifacts.require("NFTMarketplace")

let autentica

contract("NFTMarketplace", accounts => {
    describe("decimals()", () => {
        beforeEach("Tests", async () => {
            [autentica] = accounts
        })

        it("Should test view decimals()", async () => {
            const market = await NFTMarketplace.new(autentica, dummyTokenAddresses)
            let expected = 2
            let actual = await market.decimals()
            expect(actual.toNumber()).to.equal(expected)
        })
    })
})
