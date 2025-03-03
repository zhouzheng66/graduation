const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("CarStore", function () {
  let carStore, carERC721, erc6551Registry, erc6551Account;
  let owner, addr1, addr2;
  const MINTER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("MINTER_ROLE"));

  beforeEach(async () => {
    [owner, addr1, addr2] = await ethers.getSigners();

    // 部署模拟的 ERC721 合约
    const CarERC721 = await ethers.getContractFactory("LLTCar");
    carERC721 = await CarERC721.deploy(owner.address, owner.address);

    // 部署模拟的 ERC6551 注册表和账户合约
    const ERC6551Registry = await ethers.getContractFactory("ERC6551Registry");
    erc6551Registry = await ERC6551Registry.deploy();
    const ERC6551Account = await ethers.getContractFactory(
      "StandardERC6551Account"
    );
    erc6551Account = await ERC6551Account.deploy();

    // 部署 CarStore 合约
    const CarStore = await ethers.getContractFactory("CarStore");
    carStore = await CarStore.deploy(
      carERC721.target,
      erc6551Registry.target,
      erc6551Account.target
    );
  });

  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      expect(await carStore.hasRole(MINTER_ROLE, owner.address)).to.equal(true);
    });
  });

  describe("Minting", function () {
    it("Should mint a new car and create an account", async function () {
      await carERC721.grantRole(MINTER_ROLE, carStore.target);
      await carStore.mint();
      expect(await carERC721.ownerOf(1000)).to.equal(owner.address);
    });

    it("Should not mint if caller does not have MINTER_ROLE", async function () {
      await expect(carStore.connect(addr1).mint()).to.be.reverted;
    });
  });
});
