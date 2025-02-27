const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("LLTPark", function () {
  const roleHash = ethers.keccak256(ethers.toUtf8Bytes("ADMIN_ROLE"));
  const MINTER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("MINTER_ROLE"));
  let owner, addr1, addr2, addrs;
  let lltPark;
  this.beforeEach(async () => {
    [owner, addr1, addr2, ...addrs] = await ethers.getSigners();

    const LLTPark = await ethers.getContractFactory("LLTPark");
    lltPark = await LLTPark.deploy(owner.address, owner.address);
  });
  describe("Deployment", async () => {
    it("Should set the right owner", async function () {
      expect(await lltPark.hasRole(MINTER_ROLE, owner.address)).to.equal(true);
      expect(await lltPark.hasRole(MINTER_ROLE, addr1.address)).to.equal(false);
    });
  });
  describe("Mint", async () => {
    it("Should mint", async () => {
      await lltPark.safeMint(addr1.address, 100);
      expect(await lltPark.balanceOf(addr1.address)).to.equal(1);
      expect(await lltPark.ownerOf(100)).to.equal(addr1.address);
    });
    it("Should fail mint", async () => {
      expect(lltPark.connect(addr1).safeMint(addr1.address, 100)).to.be
        .revertedWithCustomError;
    });
    it("Should grentRole mint", async () => {
      await lltPark.grantRole(MINTER_ROLE, addr1.address);
      await lltPark.connect(addr1).safeMint(addr1.address, 100);
      expect(await lltPark.balanceOf(addr1.address)).to.equal(1);
      expect(await lltPark.ownerOf(100)).to.equal(addr1.address);
    });
  });
  describe("Transfer", async () => {
    beforeEach(async () => {
      await lltPark.safeMint(addr1.address, 100);
    });
    it("Should transfer", async () => {
      await lltPark
        .connect(addr1)
        .transferFrom(addr1.address, addr2.address, 100);
      expect(await lltPark.balanceOf(addr2.address)).to.equal(1);
      expect(await lltPark.ownerOf(100)).to.equal(addr2.address);
    });
    it("Should fail transfer", async () => {
      expect(
        lltPark.connect(addr2).transferFrom(addr1.address, addr2.address, 100)
      ).to.be.revertedWithCustomError(lltPark, "ERC721InsufficientApproval");
    });
  });
  describe("Approve", async () => {
    beforeEach(async () => {
      await lltPark.safeMint(addr1.address, 100);
    });
    it("Should approve", async () => {
      await lltPark.connect(addr1).approve(addr2.address, 100);
      expect(await lltPark.getApproved(100)).to.equal(addr2.address);
      await lltPark
        .connect(addr2)
        .transferFrom(addr1.address, addr2.address, 100);
      expect(await lltPark.balanceOf(addr2.address)).to.equal(1);
    });
    it("Should fail approve", async () => {
      expect(
        lltPark.connect(addr2).approve(addr2.address, 100)
      ).to.be.revertedWithCustomError(lltPark, "ERC721InvalidApprover");
    });
  });
});
// TODO: Add test
