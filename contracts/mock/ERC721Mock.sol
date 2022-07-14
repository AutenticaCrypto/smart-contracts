// SPDX-License-Identifier: MIT
pragma solidity >=0.8.15 <0.9.0;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

/// @title Dummy ERC-721 smart contract used for testing purposes.
contract ERC721Mock is ERC721 {
    uint256 public currentSupply = 0;

    constructor(string memory _name, string memory _symbol) ERC721(_name, _symbol) {}

    function mint(address _to) public {
        _mint(_to, currentSupply + 1);
        currentSupply += 1;
    }
}