const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Vesting", function () {
  let coinContract;
  let vestingContract;
  const oneDay = 86400;

  beforeEach(async () => {
    coinContract = await deployCoinContract();
    vestingContract = await deployVestingContract(coinContract);
  });

  const deployVestingContract = async (coinContract) => {
    const vestingContractFactory = await ethers.getContractFactory("Vesting");
    const vesting = await vestingContractFactory.deploy(coinContract.address);
    await vesting.deployed();

    return vesting;
  };

  const deployCoinContract = async () => {
    const exerciseCoinContractFactory = await ethers.getContractFactory("ExerciseCoin");
    const exerciseCoin = await exerciseCoinContractFactory.deploy();
    await exerciseCoin.deployed();

    return exerciseCoin;
  };

  const transferCoins = async (wallet, amount) => {
    const mintTx = await coinContract.mint(amount);
    await mintTx.wait();

    const transferTx = await coinContract.transfer(wallet.address, amount);
    await transferTx.wait();
  };

  const now = () => ethers.provider.getBlock("latest").then((x) => x.timestamp);

  const setTimestamp = async (timestamp) => {
    await ethers.provider.send("evm_setNextBlockTimestamp", [timestamp]);
    await ethers.provider.send("evm_mine");
  };

  it("vest when action is performed not by the owner it throws error", async () => {
    const [_, notOwner] = await ethers.getSigners();
    await expect(vestingContract.connect(notOwner).vest(notOwner.address, 100)).to.be.revertedWith(
      "Only owner can execute this action"
    );
  });

  it("vest not enough funds on the contract account should throw error", async () => {
    const [owner] = await ethers.getSigners();
    await expect(vestingContract.vest(owner.address, 100)).to.be.revertedWith("Not enough funds to vest");
  });

  it("vest when enough funds should add funds to vesting wallet", async () => {
    const [owner] = await ethers.getSigners();
    const vestingAmount = 100;
    await transferCoins(vestingContract, vestingAmount);

    const vestTx = await vestingContract.vest(owner.address, vestingAmount);
    await vestTx.wait();

    expect(await vestingContract.getVestedCoins()).to.be.equal(vestingAmount);
    expect(await vestingContract.getVesting(owner.address)).to.be.equal(vestingAmount);
    await expect(vestTx).to.emit(vestingContract, "Vest").withArgs(owner.address, vestingAmount);
  });

  it("vest when enough funds should add funds to vesting wallet", async () => {
    const [owner] = await ethers.getSigners();
    const vestingAmount = 100;
    await transferCoins(vestingContract, vestingAmount);

    const vestTx = await vestingContract.vest(owner.address, vestingAmount);
    await vestTx.wait();

    expect(await vestingContract.getVestedCoins()).to.be.equal(vestingAmount);
    expect(await vestingContract.getVesting(owner.address)).to.be.equal(vestingAmount);
    await expect(vestTx).to.emit(vestingContract, "Vest").withArgs(owner.address, vestingAmount);
  });

  it("getVestingPeriod returns 30", async () => {
    expect(await vestingContract.getVestingPeriod()).to.be.equal(30);
  });

  it("claim when not allowed to claim that amount throws error", async () => {
    await expect(vestingContract.claim(100)).to.be.revertedWith("Not allowed to claim this amount");
  });

  it("claim when amount is higher than amount left to claim throws error", async () => {
    const [_, claimer] = await ethers.getSigners();
    const vestingAmount = 300;
    await transferCoins(vestingContract, vestingAmount);

    await vestingContract.vest(claimer.address, vestingAmount).then((x) => x.wait());
    const blockTimestamp = await now();
    await setTimestamp(blockTimestamp + oneDay * 61);

    await expect(vestingContract.connect(claimer).claim(vestingAmount + 1)).to.be.revertedWith(
      "Amount is higher than amount left to claim"
    );
  });

  it("claim when claiming whole amount after full period should allow to claim", async () => {
    const [_, claimer] = await ethers.getSigners();
    const vestingAmount = 300;
    await transferCoins(vestingContract, vestingAmount);

    await vestingContract.vest(claimer.address, vestingAmount).then((x) => x.wait());
    const blockTimestamp = await now();
    await setTimestamp(blockTimestamp + oneDay * 30);

    const claimTx = await vestingContract.connect(claimer).claim(vestingAmount);
    await claimTx.wait();

    await expect(claimTx).to.emit(vestingContract, "Claim").withArgs(claimer.address, vestingAmount);
    expect(await coinContract.balanceOf(claimer.address)).to.be.equal(vestingAmount);
    expect(await vestingContract.getVesting(claimer.address)).to.be.equal(0);
  });

  it("claim when claiming after 10 days and 20 days should allow to claim whole amount with 2 transactions", async () => {
    const [_, claimer] = await ethers.getSigners();
    const vestingAmount = 300;
    await transferCoins(vestingContract, vestingAmount);

    await vestingContract.vest(claimer.address, vestingAmount).then((x) => x.wait());
    const blockTimestamp = await now();

    await setTimestamp(blockTimestamp + oneDay * 10);
    const firstClaimTx = await vestingContract.connect(claimer).claim(vestingAmount * 1/3);
    await firstClaimTx.wait()

    await setTimestamp(blockTimestamp + oneDay * 30);
    const secondClaimTx = await vestingContract.connect(claimer).claim(vestingAmount * 2/3);
    await secondClaimTx.wait()

    await expect(firstClaimTx).to.emit(vestingContract, "Claim").withArgs(claimer.address, vestingAmount * 1/3);
    await expect(secondClaimTx).to.emit(vestingContract, "Claim").withArgs(claimer.address, vestingAmount * 2/3);
    expect(await coinContract.balanceOf(claimer.address)).to.be.equal(vestingAmount);
    expect(await vestingContract.getVesting(claimer.address)).to.be.equal(0);
  });
});
