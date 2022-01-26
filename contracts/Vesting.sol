//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "hardhat/console.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./Owned.sol";

struct VestingWallet {
    uint256 vestedAt;
    uint256 amountToClaim;
    uint256 claimedAmount;
}

contract Vesting is Owned {
    IERC20 private token;
    mapping(address => VestingWallet) private vestings;
    uint256 private vestedCoins;
    uint256 private vestingPeriod = 30;
    uint256 private vestingStep = 1 days;

    constructor(address tokenAddress) Owned(msg.sender) {
        token = IERC20(tokenAddress);
    }

    function getVestedCoins() public view returns (uint256) {
        return vestedCoins;
    }

    function getVesting(address receiver) public view returns (uint256) {
        return vestings[receiver].amountToClaim;
    }

    function getVestingPeriod() public view returns (uint256) {
        return vestingPeriod;
    }

    function vest(address receiver, uint256 amount) public onlyOwner {
        uint256 contractBalance = token.balanceOf(address(this));
        uint256 freeFunds = contractBalance - vestedCoins;
        require(freeFunds >= amount, "Not enough funds to vest");

        vestedCoins += amount;
        VestingWallet storage receiverWallet = vestings[receiver];
        receiverWallet.vestedAt = block.timestamp;
        receiverWallet.amountToClaim += amount;
        receiverWallet.claimedAmount = 0;

        emit Vest(receiver, amount);
    }

    function getAmountAllowedToClaim(VestingWallet memory wallet) private view returns (uint256) {
        uint256 at = block.timestamp;
        uint256 elapsedTime = at - wallet.vestedAt;
        uint256 claimDays = elapsedTime / vestingStep;
        uint256 totalVest = wallet.amountToClaim + wallet.claimedAmount;

        return ((claimDays * totalVest) / vestingPeriod) - wallet.claimedAmount;
    }

    function claim(uint256 amount) public {
        VestingWallet storage claimingWallet = vestings[msg.sender];
        uint256 allowedToClaim = getAmountAllowedToClaim(claimingWallet);
        require(allowedToClaim >= amount, "Not allowed to claim this amount");
        require(claimingWallet.amountToClaim >= amount, "Amount is higher than amount left to claim");

        token.transfer(msg.sender, amount);
        claimingWallet.amountToClaim -= amount;
        claimingWallet.claimedAmount += amount;
        emit Claim(msg.sender, amount);
    }

    event Vest(address indexed receiver, uint256 amount);
    event Claim(address indexed receiver, uint256 amount);
}
