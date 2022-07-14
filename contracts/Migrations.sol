// SPDX-License-Identifier: MIT
pragma solidity >=0.8.15 <0.9.0;

contract Migrations {
  address public owner = msg.sender;
  uint public last_completed_migration; // solhint-disable-line

  modifier restricted() {
    require(
      msg.sender == owner,
      "This function is restricted to the contract's owner"
    );
    _;
  }

  function setCompleted(uint completed) public restricted {
    last_completed_migration = completed;
  }
}