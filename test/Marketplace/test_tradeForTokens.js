const { expectRevert, BN } = require('@openzeppelin/test-helpers')

const AutenticaERC721 = artifacts.require("AutenticaERC721")
const NFTMarketplace = artifacts.require("NFTMarketplace")

const { dummyTokenAddresses, dummySignature } = require('../utils/TestUtils.js')

let deployer, buyer, operator, autentica
let autenticaERC721, market

contract("NFTMarketplace", accounts => {
    describe("tradeForTokens() - custom scenarios that are not covered in parameterized tests", () => {
        beforeEach("Tests", async () => {
            [deployer, buyer, operator, autentica] = accounts;

            // Deployments
            autenticaERC721 = await AutenticaERC721.new()
            market = await NFTMarketplace.new(autentica, dummyTokenAddresses)
        })

        it("Should test require: NFTMarketplace: Token not allowed", async () => {
            // Parameters
            let nftId = 1
            let price = new BN(1)
            let token = "0x0000000000000000000000000000000000000000"

            // Signature
            await expectRevert(
                market.tradeForTokens(autenticaERC721.address, nftId, price, token, buyer, [0, 0], dummySignature, { from: buyer }),
                "NFTMarketplace: Token not allowed"
            )
        })
    })
})