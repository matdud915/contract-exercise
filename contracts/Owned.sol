//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "hardhat/console.sol";

contract Owned {
    address private owner;

    constructor(address contractOwner) {
        owner = contractOwner;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can execute this action");
        _;
    }
}
