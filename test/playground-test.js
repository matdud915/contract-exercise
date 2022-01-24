const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Playground", function () {
  const constructorParam = 1234;
  const deployContract = async () => {
    const contract = await ethers.getContractFactory("Playground");
    const playground = await contract.deploy(constructorParam);
    await playground.deployed();

    return playground;
  };

  it("returnParam should return passed param", async function () {
    const playground = await deployContract();

    const param = "test";
    expect(await playground.returnParam(param)).to.equal(param);
  });

  it("returnStateVariable should return param passed in constructor", async function () {
    const playground = await deployContract();

    expect(await playground.returnStateVariable()).to.equal(constructorParam);
  });

  it("returnStateVariable should return changed param if setParam was invoked", async function () {
    const playground = await deployContract();

    const newParamValue = 999;
    const setParamTx = await playground.setParam(newParamValue);
    await setParamTx.wait();
    expect(await playground.returnStateVariable()).to.equal(newParamValue);
  });

  it("deposit, when account is not initialized deposit should throw error ", async function () {
    const playground = await deployContract();

    const newParamValue = 999;
    await expect(playground.deposit(newParamValue)).to.be.revertedWith("Account is not initialized");
  });

  it("isInitialized when account is not initialized should return false", async function () {
    const playground = await deployContract();

    const isInitialzed = await playground.isInitialized();
    expect(isInitialzed).to.equal(false);
  });

  it("initializeAccount when name is empty should return error", async function () {
    const playground = await deployContract();

    await expect(playground.initializeAccount({ name: "" })).to.be.revertedWith("String must not be empty");
  });

  it("initializeAccount should initialize account", async function () {
    const playground = await deployContract();

    const initializeAccountTx = await playground.initializeAccount({ name: "nice account" });
    await initializeAccountTx.wait();

    const isInitialzed = await playground.isInitialized();
    expect(isInitialzed).to.equal(true);
  });

  it("initializeAccount when you try initialization twice it should throw error", async function () {
    const playground = await deployContract();

    const initializeAccountTx = await playground.initializeAccount({ name: "nice account" });
    await initializeAccountTx.wait();

    await expect(playground.initializeAccount({ name: "nice account" })).to.be.revertedWith(
      "Account must not be initialized"
    );
  });

  it("getAccountInfo when account is initialized, should return data", async function () {
    const owner = await ethers.getSigner();
    const playground = await deployContract();

    const initializeAccountTx = await playground.initializeAccount({ name: "nice account" });
    await initializeAccountTx.wait();

    const { state, name, value, accountAddress } = await playground.getAccountInfo();
    expect(state).to.equal(1);
    expect(value).to.equal(0);
    expect(name).to.equal("nice account");
    expect(accountAddress).to.equal(owner.address);
  });

  it("callInherited should call inherited function", async function () {
    const playground = await deployContract();
    expect(await playground.callInherited()).to.equal("functionFromOtherContract");
  });

  it("callFree, should call free function", async function () {
    const playground = await deployContract();
    expect(await playground.callFree()).to.equal("free");
  });
});
