// SPDX-License-Identifier: MIT
pragma solidity >=0.8.15 <0.9.0;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "../IERC721Autentica.sol";

/// @title Dummy Autentica ERC-721 compatible smart contract used for testing purposes.
contract AutenticaERC721CompatibleMock is ERC721, IERC721Autentica {
    uint256 public currentSupply = 0;

    /// @dev See `AutenticaERC721.sol` for details.
    struct Details {
        address creator;
        address investor;
        uint256 royaltyFee;
        uint256 investorFee;
    }

    /// @dev See `AutenticaERC721.sol` for details.
    mapping(uint256 => Details) private _details;

    constructor(string memory _name, string memory _symbol) ERC721(_name, _symbol) {}

    function mint(address _to, uint256 royaltyFee, uint256 investorFee) public {
        _mint(_to, currentSupply + 1);
        _details[currentSupply + 1] = Details({
            creator: _to,
            investor: msg.sender,
            royaltyFee: royaltyFee,
            investorFee: investorFee
        });

        currentSupply += 1;
    }

    /**
     * @dev Number of decimals used for fees.
     */
    function decimals() external pure returns (uint8) {
        return 4;
    }

    /**
     * @dev Returns the Royalty fee of the `tokenId` token.
     * @param tokenId NFT ID.
     */
    function getRoyaltyFee(uint256 tokenId) external view returns (uint256) {
        return _details[tokenId].royaltyFee;
    }

    /**
     * @dev Returns the Investor fee of the `tokenId` token.
     * @param tokenId NFT ID.
     */
    function getInvestorFee(uint256 tokenId) external view returns (uint256) {
        return _details[tokenId].investorFee;
    }

    /**
     * @dev Returns the creator of the `tokenId` token.
     * @param tokenId NFT ID.
     *
     * NOTE: The Autentica Marketplace smart contract supports royalties, so in order for the
     * creator to be paid, we need to know who created the token and that information must
     * stay the same even if the person who owns the token changes.
     */
    function getCreator(uint256 tokenId) external view returns (address) {
        return _details[tokenId].creator;
    }

    /**
     * @dev Returns the investor of the `tokenId` token.
     * @param tokenId NFT ID.
     *
     * NOTE: Autentica lets other people to pay for the gas fees of the token minting so
     * in that case the minter is not the creator and owner of the token.
     */
    function getInvestor(uint256 tokenId) external view returns (address) {
        return _details[tokenId].investor;
    }

    /**
     * @dev See {IERC165-supportsInterface}.
     */
    function supportsInterface(bytes4 interfaceId)
        public
        view
        virtual
        override(ERC721, IERC165)
        returns (bool)
    {
        return
            interfaceId == type(IERC721Autentica).interfaceId ||
            super.supportsInterface(interfaceId);
    }
}