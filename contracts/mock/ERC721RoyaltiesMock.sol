// SPDX-License-Identifier: MIT
pragma solidity 0.8.11;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/interfaces/IERC2981.sol";

/// @title Dummy ERC-721 smart contract with support for ERC-2981 used for testing purposes.
contract ERC721RoyaltiesMock is ERC721, IERC2981 {
    uint8 public constant DECIMALS = 2;
    uint256 public currentSupply = 0;

    struct Royalties {
        address creator;
        uint256 fee;
    }

    mapping(uint256 => Royalties) private _royalties;

    constructor(string memory _name, string memory _symbol) ERC721(_name, _symbol) {}

    function mint(address _to, uint256 royaltyFee) public {
        _mint(_to, currentSupply + 1);
        _royalties[currentSupply + 1] = Royalties({
            creator: msg.sender, 
            fee: royaltyFee
        });
        currentSupply += 1;
    }

    function royaltyInfo(uint256 tokenId, uint256 salePrice)
        external
        view
        returns (address receiver, uint256 royaltyAmount)
    {
        if (_exists(tokenId) == false || _royalties[tokenId].creator == address(0x0) || _royalties[tokenId].fee == 0) {
            // Zero out everything
            return (address(0x0), 0);
        } else {
            // Return the address of the creator and the royalty proceeds
            return (_royalties[tokenId].creator, (salePrice * _royalties[tokenId].fee) / (100 * 10**DECIMALS));
        }
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        virtual
        override(ERC721, IERC165)
        returns (bool)
    {
        return
            interfaceId == type(IERC2981).interfaceId ||
            super.supportsInterface(interfaceId);
    }
}