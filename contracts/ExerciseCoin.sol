//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "hardhat/console.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract ExerciseCoin is IERC20 {
    uint256 private totalCoinSupply = 1_000_000;
    uint256 private mintedCoins = 0;
    mapping(address => uint256) accounts;
    mapping(address => mapping(address => uint256)) allowances;

    constructor() {}

    function totalSupply() external view override returns (uint256) {
        return totalCoinSupply;
    }

    function balanceOf(address account) external view override returns (uint256) {
        return accounts[account];
    }

    function mint(uint256 amount) public {
        // to sprawdzenie jest valid?
        require(totalCoinSupply >= (mintedCoins + amount), "Amount exceeds supply limit");
        accounts[msg.sender] += amount;
        mintedCoins += amount;
        emit Transfer(0x0000000000000000000000000000000000000000, msg.sender, amount);
    }

    function transfer(address recipient, uint256 amount) external override returns (bool) {
        uint256 fromBalance = accounts[msg.sender];
        require(fromBalance >= amount, "Not enough funds");

        accounts[msg.sender] -= amount;
        accounts[recipient] += amount;
        emit Transfer(msg.sender, recipient, amount);
        return true;
    }

    function allowance(address owner, address spender) external view override returns (uint256) {
        return allowances[owner][spender];
    }

    function approve(address spender, uint256 amount) external override returns (bool) {
        allowances[msg.sender][spender] += amount;

        emit Approval(msg.sender, spender, amount);
        return true;
    }

    function transferFrom(
        address sender,
        address recipient,
        uint256 amount
    ) external override returns (bool) {
        require(this.allowance(sender, msg.sender) >= amount, "Allowed amount is less than transfer amount");
        require(this.balanceOf(sender) >= amount, "From account does not have enough funds");

        allowances[sender][msg.sender] -= amount;
        accounts[recipient] += amount;
        accounts[sender] -= amount;

        emit Transfer(sender, recipient, amount);
        return true;
    }
}
