const { deployProxy, upgradeProxy, erc1967 } = require('@openzeppelin/truffle-upgrades')
const { BN, constants, expectEvent } = require('@openzeppelin/test-helpers')

const AutenticaERC721 = artifacts.require("AutenticaERC721")
const NFTMarketplace = artifacts.require("NFTMarketplace")
const NFTMarketplaceV2Mock = artifacts.require("NFTMarketplaceV2Mock")

const { generateSignature, marketplaceSignatureTypes, dummyTokenAddresses } = require('../utils/TestUtils.js')
const { expect } = require('chai')

let deployer, seller, buyer, operator, autentica
let autenticaERC721, market
let marketProxyAddress, marketImplementationAddress
const tokenId = new BN(1)
const royaltyFee = new BN(0)

async function trade(market, autenticaERC721, tokenId, seller, buyer, price, royaltyFee, expectedEventParameters) {
    const signature = await generateSignature(
        marketplaceSignatureTypes,
        [market.address, autenticaERC721.address, tokenId, seller, buyer, price, constants.ZERO_ADDRESS, royaltyFee, 0, 0],
        operator)

    await autenticaERC721.approve(market.address, tokenId, { from: seller })
    const receipt = await market.tradeForCoins(autenticaERC721.address, tokenId, price, buyer, 0, signature, { from: buyer, value: price })
    expectEvent(receipt, 'TradedForCoins', expectedEventParameters)
}

contract("NFTMarketplace", accounts => {
    describe("Upgradeability", () => {
        beforeEach("Tests", async () => {
            [deployer, seller, buyer, operator, autentica] = accounts;

            // Deployments
            autenticaERC721 = await AutenticaERC721.new()
            market = await deployProxy(NFTMarketplace, [autentica, dummyTokenAddresses])

            // Get addresses
            marketProxyAddress = market.address
            marketImplementationAddress = await erc1967.getImplementationAddress(market.address)

            // Operator
            const role = await market.OPERATOR_ROLE()
            await market.grantRole(role, operator, { from: deployer })
            await autenticaERC721.grantRole(role, operator, { from: deployer })

            // Marketplace
            await autenticaERC721.setMarketplace(market.address)

            // Mint and approve
            await autenticaERC721.mint(tokenId, "uri", royaltyFee, { from: seller })
            await autenticaERC721.approve(market.address, tokenId, { from: seller })
        })

        it("Should support upgradeability", async () => {
            // Parameters
            const price = new BN(1)
            
            // Check approval
            expect(market.address).to.be.equal(marketProxyAddress)
            expect(await autenticaERC721.getApproved(tokenId)).to.be.equal(marketProxyAddress) // Only the proxy should be approved
            expect(await autenticaERC721.getApproved(tokenId)).to.not.be.equal(marketImplementationAddress) // The implementation should not be approved

            // Should be possible to trade using the proxy
            await trade(market, autenticaERC721, tokenId, seller, buyer, price, royaltyFee, {
                collection: autenticaERC721.address,
                tokenId: tokenId,
                seller: seller,
                buyer: buyer,
                price: price
            })
            await autenticaERC721.approve(market.address, tokenId, { from: buyer }) // Re-approve the proxy because the approval got lost after the first trade

            // Deploy version 2
            const marketV2Mock = await upgradeProxy(market.address, NFTMarketplaceV2Mock, [autentica, dummyTokenAddresses])
            
            // Get addresses for version 2
            const marketV2MockProxyAddress = marketV2Mock.address
            const marketV2MockImplementationAddress = await erc1967.getImplementationAddress(marketV2Mock.address)

            // Check version 2
            expect(marketV2Mock.address).to.be.equal(marketV2MockProxyAddress)
            expect(marketV2MockProxyAddress).to.be.equal(marketProxyAddress)

            // Check approval again
            expect(await autenticaERC721.getApproved(tokenId)).to.be.equal(marketV2MockProxyAddress) // Only the proxy should be approved
            expect(await autenticaERC721.getApproved(tokenId)).to.not.be.equal(marketV2MockImplementationAddress) // The new implementation should also not be approved

            // Should be possible to trade again using the proxy which is now version 2
            await trade(marketV2Mock, autenticaERC721, tokenId, buyer, seller, price, royaltyFee, {
                collection: constants.ZERO_ADDRESS, // `NFTMarketplaceV2Mock` will zero this field
                tokenId: new BN(0), // `NFTMarketplaceV2Mock` will zero this field
                seller: constants.ZERO_ADDRESS, // `NFTMarketplaceV2Mock` will zero this field
                buyer: constants.ZERO_ADDRESS, // `NFTMarketplaceV2Mock` will zero this field
                price: new BN(0) // `NFTMarketplaceV2Mock` will zero this field
            })

            // Log
            console.table([
                {
                  name: 'NFT Marketplace (proxy)',
                  address: marketProxyAddress
                },
                {
                  name: 'NFT Marketplace (implementation)',
                  address: marketImplementationAddress
                },
                {
                    name: 'NFT Marketplace V2 Mock (proxy)',
                    address: marketV2MockProxyAddress
                  },
                  {
                    name: 'NFT Marketplace V2 Mock (implementation)',
                    address: marketV2MockImplementationAddress
                  },
              ]);
        })
    })
})