//SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "hardhat/console.sol";
import "./Utility.sol";

enum AccountState {
    Locked,
    Open
}
struct AccountInfo {
    AccountState state;
    uint32 value;
    string name;
    address accountAddress;
}

struct InitializeAccount {
    string name;
}

contract Playground is Utility {
    uint32 private stateVariable;
    mapping(address => AccountInfo) private accounts;

    constructor(uint32 _constructorParam) {
        stateVariable = _constructorParam;
    }

    function returnStateVariable() public view returns (uint32) {
        return stateVariable;
    }

    function returnParam(string memory _param)
        public
        pure
        returns (string memory)
    {
        return _param;
    }

    function setParam(uint32 _val) public {
        console.log("changing state variable to %s", _val);
        stateVariable = _val;
    }

    function deposit(uint32 _value) public {
        require(
            accounts[msg.sender].state == AccountState.Open,
            "Account is not initialized"
        );
        accounts[msg.sender].value += _value;
    }

    function isInitialized() public view returns (bool) {
        return accounts[msg.sender].state == AccountState.Open;
    }

    function stringIsNotEmpty(string memory _str) private pure {
        require(bytes(_str).length > 0, "String must not be empty");
    }

    modifier onlyNotInitialized() {
        require(isInitialized() != true, "Account must not be initialized");
        _;
    }

    modifier onlyInitialized() {
        require(isInitialized() == true, "Account must be initialized");
        _;
    }

    function initializeAccount(InitializeAccount memory _request)
        public
        onlyNotInitialized
    {
        stringIsNotEmpty(_request.name);
        accounts[msg.sender] = AccountInfo({
            name: _request.name,
            state: AccountState.Open,
            value: 0,
            accountAddress: msg.sender
        });
    }

    function getAccountInfo()
        public
        view
        onlyInitialized
        returns (AccountInfo memory)
    {
        return accounts[msg.sender];
    }

    function callInherited() public view returns (string memory) {
        return Utility.functionFromOtherContract();
    }
    
    function callFree() public pure returns (string memory) {
        return functionWithoutContract();
    }
}
