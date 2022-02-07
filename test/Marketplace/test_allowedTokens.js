const { deployProxy } = require('@openzeppelin/truffle-upgrades')
const expectEvent = require('@openzeppelin/test-helpers/src/expectEvent')
const { expect } = require('chai')
const { BN, constants, expectRevert } = require('@openzeppelin/test-helpers')
const { dummyTokenAddresses } = require('../utils/TestUtils')

const NFTMarketplace = artifacts.require("NFTMarketplace")

const anotherDummyTokenAddress = "0x0000000000000000000000000000000000000005"

let deployer, user, autentica
let market

contract("NFTMarketplace", accounts => {
    describe("numberOfAllowedTokens()", () => {
        beforeEach("Tests", async () => {
            [deployer, user, autentica] = accounts

            // Deployments
            market = await deployProxy(NFTMarketplace, [autentica, dummyTokenAddresses])
        })

        it("Should have the correct length", async () => {
            expect(await market.numberOfAllowedTokens()).to.bignumber.be.equal(new BN(dummyTokenAddresses.length))
        })
    })

    describe("allowedTokenAtIndex()", () => {
        beforeEach("Tests", async () => {
            [deployer, user, autentica] = accounts

            // Deployments
            market = await deployProxy(NFTMarketplace, [autentica, dummyTokenAddresses])
        })

        it("Should have the same elements", async () => {
            for (let i = 0; i < dummyTokenAddresses.length; i++) {
                expect(await market.allowedTokenAtIndex(i)).to.be.equal(dummyTokenAddresses[i], "Token at index " + i + " is not the same")
            }
        })

        it("Should fail with: NFTMarketplace: Index out of bounds", async () => {
            let count = await market.numberOfAllowedTokens()
            await expectRevert(
                market.allowedTokenAtIndex(count),
                "NFTMarketplace: Index out of bounds"
            )
        })
    })

    describe("isTokenAllowed()", () => {
        beforeEach("Tests", async () => {
            [deployer, user, autentica] = accounts

            // Deployments
            market = await deployProxy(NFTMarketplace, [autentica, dummyTokenAddresses])
        })

        it("Should be allowed", async () => {
            let address = dummyTokenAddresses[0]
            expect(await market.isTokenAllowed(address)).to.be.equal(true)
        })

        it("Should not be allowed", async () => {
            let address = anotherDummyTokenAddress
            expect(await market.isTokenAllowed(address)).to.not.be.equal(address)
        })
    })

    describe("addAllowedToken()", () => {
        beforeEach("Tests", async () => {
            [deployer, user, autentica] = accounts

            // Deployments
            market = await deployProxy(NFTMarketplace, [autentica, dummyTokenAddresses])
        })

        it("Should fail with: NFTMarketplace: Only admins can add allowed tokens", async () => {
            await expectRevert(
                market.addAllowedToken(anotherDummyTokenAddress, { from: user }),
                "NFTMarketplace: Only admins can add allowed tokens"
            )
        })

        it("Should fail with: NFTMarketplace: Token address is the zero address", async () => {
            await expectRevert(
                market.addAllowedToken(constants.ZERO_ADDRESS),
                "NFTMarketplace: Token address is the zero address"
            )
        })

        it("Should fail with: NFTMarketplace: Token address is already allowed", async () => {
            await expectRevert(
                market.addAllowedToken(dummyTokenAddresses[0]),
                "NFTMarketplace: Token address is already allowed"
            )
        })

        it("Should be possible to allow a token", async () => {
            let receipt = await market.addAllowedToken(anotherDummyTokenAddress)
            expectEvent(receipt, 'AllowedTokenAdded', {
                tokenAddress: anotherDummyTokenAddress
            })
        })
    })

    describe("removeAllowedTokenAtIndex()", () => {
        beforeEach("Tests", async () => {
            [deployer, user, autentica] = accounts

            // Deployments
            market = await deployProxy(NFTMarketplace, [autentica, dummyTokenAddresses])
        })

        it("Should fail with: NFTMarketplace: Only admins can remove allowed tokens", async () => {
            await expectRevert(
                market.removeAllowedTokenAtIndex(0, { from: user }),
                "NFTMarketplace: Only admins can remove allowed tokens"
            )
        })

        it("Should fail with: NFTMarketplace: Index out of bounds", async () => {
            let count = await market.numberOfAllowedTokens()
            await expectRevert(
                market.removeAllowedTokenAtIndex(count),
                "NFTMarketplace: Index out of bounds"
            )
        })

        it("Should be possible to remove an allowed token", async () => {
            let receipt = await market.removeAllowedTokenAtIndex(0)
            expectEvent(receipt, 'AllowedTokenRemoved')
        })

        it("Should be possible to remove all allowed tokens", async () => {
            let count = await market.numberOfAllowedTokens()

            // Remove all elements using the switch method
            for (let i = 0; i < count - 1; i++) {
                let receipt = await market.removeAllowedTokenAtIndex(i)
                expectEvent(receipt, 'AllowedTokenRemoved')
            }

            // Remove the last element
            let receipt = await market.removeAllowedTokenAtIndex(0)
            expectEvent(receipt, 'AllowedTokenRemoved')

            // Should have the correct length
            expect(await market.numberOfAllowedTokens()).to.bignumber.be.equal(new BN(0))
        })
    })
})