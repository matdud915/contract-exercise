//SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "hardhat/console.sol";

function functionWithoutContract() pure returns (string memory) {
    return "free";
}

contract Utility {
    function functionFromOtherContract() public view returns (string memory) {
        console.log("Test");
        return "functionFromOtherContract";
    }
}
