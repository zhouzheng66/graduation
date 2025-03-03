const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("ParkStore", function () {
  let parkStore, parkERC721, erc6551Registry, erc6551Account;
  let owner, addr1, addr2;
  const MINTER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("MINTER_ROLE"));

  beforeEach(async () => {
    [owner, addr1, addr2] = await ethers.getSigners();

    // 部署模拟的 ERC721 合约
    const CarERC721 = await ethers.getContractFactory("LLTCar");
    parkERC721 = await CarERC721.deploy(owner.address, owner.address);

    // 部署模拟的 ERC6551 注册表和账户合约
    const ERC6551Registry = await ethers.getContractFactory("ERC6551Registry");
    erc6551Registry = await ERC6551Registry.deploy();
    const ERC6551Account = await ethers.getContractFactory(
      "StandardERC6551Account"
    );
    erc6551Account = await ERC6551Account.deploy();

    // 部署 CarStore 合约
    const CarStore = await ethers.getContractFactory("CarStore");
    parkStore = await CarStore.deploy(
      parkERC721.target,
      erc6551Registry.target,
      erc6551Account.target
    );
  });

  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      expect(await parkStore.hasRole(MINTER_ROLE, owner.address)).to.equal(
        true
      );
    });
  });

  describe("Minting", function () {
    it("Should mint a new park and create an account", async function () {
      await parkERC721.grantRole(MINTER_ROLE, parkStore.target);
      await parkStore.mint();
      expect(await parkERC721.ownerOf(1000)).to.equal(owner.address);
    });

    it("Should not mint if caller does not have MINTER_ROLE", async function () {
      await expect(parkStore.connect(addr1).mint()).to.be.reverted;
    });
  });
});
