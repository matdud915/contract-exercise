const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("ExerciseCoin", function () {
  const deployContract = async () => {
    const contract = await ethers.getContractFactory("ExerciseCoin");
    const coin = await contract.deploy();
    await coin.deployed();

    return coin;
  };

  it("totalSupply returns total supply of the coin", async () => {
    const contract = await deployContract();
    expect(await contract.totalSupply()).to.be.equal(1_000_000);
  });

  it("balanceOf for all accounts without coins returns 0", async () => {
    const contract = await deployContract();

    const account = await ethers.getSigner().then((s) => s.address);

    expect(await contract.balanceOf(account)).to.be.equal(0);
  });

  it("mint when generated amount does not exceed total supply limit adds amount to account", async () => {
    const sender = await ethers.getSigner().then((s) => s.address);
    const mintAmount = 1000;
    const contract = await deployContract();
    const preTxBalance = await contract.balanceOf(sender);

    const mintTx = await contract.mint(mintAmount);
    await mintTx.wait();

    const postTxBalance = await contract.balanceOf(sender);
    await expect(mintTx)
      .to.emit(contract, "Transfer")
      .withArgs("0x0000000000000000000000000000000000000000", sender, mintAmount);
    expect(postTxBalance).to.be.equal(preTxBalance + mintAmount);
  });

  it("mint when generated amount does exceed total supply limit throws error", async () => {
    const mintAmount = 1_000_001;
    const contract = await deployContract();

    await expect(contract.mint(mintAmount)).to.be.revertedWith("Amount exceeds supply limit");
  });

  it("transfer when not enough funds on the account returns false and does not changes accounts balances", async () => {
    const contract = await deployContract();

    const sender = await ethers.getSigner().then((s) => s.address);
    const recipient = ethers.Wallet.createRandom().address;
    const senderPreTxBalance = await contract.balanceOf(sender);
    const recipientPreTxBalance = await contract.balanceOf(recipient);

    await expect(contract.transfer(recipient, 100)).to.be.revertedWith("Not enough funds");

    expect(await contract.balanceOf(sender)).to.be.equal(senderPreTxBalance);
    expect(await contract.balanceOf(recipient)).to.be.equal(recipientPreTxBalance);
  });

  it("transfer when enough funds on the account returns true and transfers amount to recipient", async () => {
    const contract = await deployContract();
    const [sender, recipient] = await ethers.getSigners();

    const mintSenderTx = await contract.mint(200);
    const mintRecipientTx = await contract.connect(recipient).mint(100);
    await Promise.all([mintSenderTx.wait(), mintRecipientTx.wait()]);

    const transferStatic = await contract.callStatic.transfer(recipient.address, 50);
    const transferTx = await contract.transfer(recipient.address, 50);
    await transferTx.wait();

    expect(await contract.balanceOf(sender.address)).to.be.equal(150);
    expect(await contract.balanceOf(recipient.address)).to.be.equal(150);
    await expect(transferTx).to.emit(contract, "Transfer").withArgs(sender.address, recipient.address, 50);
    expect(transferStatic).to.be.equal(true);
  });

  it("allowance when no allowance is specified should return 0", async () => {
    const contract = await deployContract();
    const [sender, addressToAllow] = await ethers.getSigners();

    expect(await contract.allowance(sender.address, addressToAllow.address)).to.be.equal(0);
  });

  it("approve should add value to allowances and return true", async () => {
    const contract = await deployContract();
    const [sender, addressToAllow] = await ethers.getSigners();
    const amountToApprove = 100;

    const approveStatic = await contract.callStatic.approve(addressToAllow.address, amountToApprove);
    const approveTx = await contract.approve(addressToAllow.address, amountToApprove);
    await approveTx.wait(0);

    await expect(approveTx)
      .to.emit(contract, "Approval")
      .withArgs(sender.address, addressToAllow.address, amountToApprove);
    expect(await contract.allowance(sender.address, addressToAllow.address)).to.be.equal(amountToApprove);
    expect(approveStatic).to.be.equal(true);
  });

  it("transferFrom when not allowed to transfer funds revert with error", async () => {
    const contract = await deployContract();
    const [_, addressFrom, addressTo] = await ethers.getSigners();

    await expect(contract.transferFrom(addressFrom.address, addressTo.address, 1)).to.be.revertedWith(
      "Allowed amount is less than transfer amount"
    );
  });

  it("transferFrom when from accounts does not have enough funds it should revert with error", async () => {
    const contract = await deployContract();
    const [owner, addressFrom, addressTo] = await ethers.getSigners();
    const amountToTransfer = 100;

    const approveTx = await contract.approve(addressFrom.address, amountToTransfer);
    await approveTx.wait();

    await expect(
      contract.connect(addressFrom).transferFrom(owner.address, addressTo.address, amountToTransfer)
    ).to.be.revertedWith("From account does not have enough funds");
  });

  it("transferFrom when everything is ok should transfer amounts, send transfer event and return true", async () => {
    const contract = await deployContract();
    const [sender, allowedAddress, addressTo] = await ethers.getSigners();
    const amountToTransfer = 100;

    const approveTx = await contract.approve(allowedAddress.address, amountToTransfer);
    await approveTx.wait();
    const mintTx = await contract.mint(amountToTransfer);
    await mintTx.wait();

    const transferFromStaticTx = await contract
      .connect(allowedAddress)
      .callStatic.transferFrom(sender.address, addressTo.address, amountToTransfer);
    const transferFromTx = await contract
      .connect(allowedAddress)
      .transferFrom(sender.address, addressTo.address, amountToTransfer);
    await transferFromTx.wait();

    expect(await contract.allowance(sender.address, allowedAddress.address)).to.be.equal(0);
    expect(transferFromStaticTx).to.be.equal(true);
    expect(await contract.balanceOf(addressTo.address)).to.be.equal(amountToTransfer);
    expect(await contract.balanceOf(sender.address)).to.be.equal(0);
    await expect(transferFromTx)
      .to.emit(contract, "Transfer")
      .withArgs(sender.address, addressTo.address, amountToTransfer);
  });
});
