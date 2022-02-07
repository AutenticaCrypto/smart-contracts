const { deployProxy } = require('@openzeppelin/truffle-upgrades')
const { BN, expectEvent, expectRevert } = require('@openzeppelin/test-helpers')

const AutenticaERC721 = artifacts.require("AutenticaERC721")
const NFTMarketplace = artifacts.require("NFTMarketplace")

const { dummyTokenAddresses, dummySignature } = require('../utils/TestUtils.js')

let deployer, buyer, operator, autentica, user
let autenticaERC721, market

contract("NFTMarketplace", accounts => {
    describe("pause()", () => {
        beforeEach("Tests", async () => {
            [deployer, buyer, operator, autentica, user] = accounts;

            // Deployments
            autenticaERC721 = await AutenticaERC721.new()
            market = await deployProxy(NFTMarketplace, [autentica, dummyTokenAddresses])
        })

        it("Should test require: NFTMarketplace: Only admins can pause", async () => {
            await expectRevert(
                market.pause({ from: user }),
                "NFTMarketplace: Only admins can pause"
            )
        })

        it("Should pause", async () => {
            let account = deployer
            let receipt = await market.pause({ from: account })
            expectEvent(receipt, 'Paused', {
                account: account
            })
        })
    })

    describe("unpause()", () => {
        beforeEach("Tests", async () => {
            [deployer, buyer, operator, autentica, user] = accounts;

            // Deployments
            autenticaERC721 = await AutenticaERC721.new()
            market = await deployProxy(NFTMarketplace, [autentica, dummyTokenAddresses])
        })

        it("Should test require: NFTMarketplace: Only admins can unpause", async () => {
            // Pause first
            await market.pause()
            
            // Try to unpause
            await expectRevert(
                market.unpause({ from: user }),
                "NFTMarketplace: Only admins can unpause"
            )
        })

        it("Should pause", async () => {
            let account = deployer

            // Pause first
            await market.pause({ from: deployer })

            // Unpause
            let receipt = await market.unpause({ from: account })
            expectEvent(receipt, 'Unpaused', {
                account: account
            })
        })
    })

    describe("tradeForCoins()", () => {
        beforeEach("Tests", async () => {
            [deployer, buyer, operator, autentica, user] = accounts;

            // Deployments
            autenticaERC721 = await AutenticaERC721.new()
            market = await deployProxy(NFTMarketplace, [autentica, dummyTokenAddresses])
        })

        it("Should test require: NFTMarketplace: Contract is paused", async () => {
            // Pause first
            await market.pause()

            // Parameters
            let nftId = 1
            let price = new BN(1)
            
            // Signature
            await expectRevert(
                market.tradeForCoins(autenticaERC721.address, nftId, price, buyer, 0, dummySignature, { from: buyer, value: price }),
                "NFTMarketplace: Contract is paused"
            )
        })
    })

    describe("tradeForTokens()", () => {
        beforeEach("Tests", async () => {
            [deployer, buyer, operator, autentica, user] = accounts;

            // Deployments
            autenticaERC721 = await AutenticaERC721.new()
            market = await deployProxy(NFTMarketplace, [autentica, dummyTokenAddresses])
        })

        it("Should test require: NFTMarketplace: Contract is paused", async () => {
            // Pause first
            await market.pause()

            // Parameters
            let nftId = 1
            let price = new BN(1)
            let token = dummyTokenAddresses[0]
            
            // Signature
            await expectRevert(
                market.tradeForTokens(autenticaERC721.address, nftId, price, token, buyer, 0, dummySignature, { from: buyer }),
                "NFTMarketplace: Contract is paused"
            )
        })
    })
})