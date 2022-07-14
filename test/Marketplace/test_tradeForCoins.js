const { expectRevert } = require('@openzeppelin/test-helpers')

const AutenticaERC20 = artifacts.require("Autentica")
const AutenticaERC721 = artifacts.require("AutenticaERC721")
const NFTMarketplace = artifacts.require("NFTMarketplace")

const { toWei, generateSignature, marketplaceSignatureTypes, dummyTokenAddresses } = require('../utils/TestUtils.js')

let deployer, seller, buyer, buyer2, operator, autentica, creator
let erc20, autenticaERC721, market

contract("NFTMarketplace", accounts => {
    describe("tradeForCoins() - custom scenarios that are not covered in parameterized tests", () => {
        beforeEach("Tests", async () => {
            [deployer, seller, buyer, buyer2, operator, autentica, creator] = accounts;

            // Deployments
            erc20 = await AutenticaERC20.new()
            autenticaERC721 = await AutenticaERC721.new()
            market = await NFTMarketplace.new(autentica, dummyTokenAddresses)

            // Operations
            const role = await market.OPERATOR_ROLE()
            await market.grantRole(role, operator, { from: deployer })
        })

        it("Should test require: NFTMarketplace: Not enough coins sent", async () => {
            // Parameters
            let nftId = 1
            let sentPrice = toWei("99")
            let expectedPrice = toWei("100")
            let token = "0x0000000000000000000000000000000000000000"

            // Signature
            const expandedSig = await generateSignature(
                marketplaceSignatureTypes,
                [market.address, autenticaERC721.address, nftId, buyer, buyer2, expectedPrice, token, 0, 0, 0],
                operator)

            await expectRevert(
                market.tradeForCoins(autenticaERC721.address, nftId, expectedPrice, buyer2, [0, 0], expandedSig, { from: buyer, value: sentPrice }),
                "NFTMarketplace: Not enough coins sent"
            )
        })
    })
})