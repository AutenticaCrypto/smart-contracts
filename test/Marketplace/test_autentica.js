const { deployProxy } = require('@openzeppelin/truffle-upgrades')
const { expect } = require('chai')
const { dummyTokenAddresses } = require('../utils/TestUtils')

const NFTMarketplace = artifacts.require("NFTMarketplace")

let autentica

contract("NFTMarketplace", accounts => {
    describe("autentica()", () => {
        beforeEach("Tests", async () => {
            [autentica] = accounts
        })

        it("Should test autentica()", async () => {
            const market = await deployProxy(NFTMarketplace, [autentica, dummyTokenAddresses])
            expect(await market.autentica()).to.equal(autentica)
        })
    })
})