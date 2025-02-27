const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("LLTCar", function () {
  const roleHash = ethers.keccak256(ethers.toUtf8Bytes("ADMIN_ROLE"));
  const MINTER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("MINTER_ROLE"));
  let owner, addr1, addr2, addrs;
  let lltCar;
  this.beforeEach(async () => {
    [owner, addr1, addr2, ...addrs] = await ethers.getSigners();

    const LLTCar = await ethers.getContractFactory("LLTCar");
    lltCar = await LLTCar.deploy(owner.address, owner.address);
  });
  describe("Deployment", async () => {
    it("Should set the right owner", async function () {
      expect(await lltCar.hasRole(MINTER_ROLE, owner.address)).to.equal(true);
      expect(await lltCar.hasRole(MINTER_ROLE, addr1.address)).to.equal(false);
    });
  });
  describe("Mint", async () => {
    it("Should mint", async () => {
      await lltCar.safeMint(addr1.address, 100);
      expect(await lltCar.balanceOf(addr1.address)).to.equal(1);
      expect(await lltCar.ownerOf(100)).to.equal(addr1.address);
    });
    it("Should fail mint", async () => {
      expect(lltCar.connect(addr1).safeMint(addr1.address, 100)).to.be
        .revertedWithCustomError;
    });
    it("Should grentRole mint", async () => {
      await lltCar.grantRole(MINTER_ROLE, addr1.address);
      await lltCar.connect(addr1).safeMint(addr1.address, 100);
      expect(await lltCar.balanceOf(addr1.address)).to.equal(1);
      expect(await lltCar.ownerOf(100)).to.equal(addr1.address);
    });
  });
  describe("Transfer", async () => {
    beforeEach(async () => {
      await lltCar.safeMint(addr1.address, 100);
    });
    it("Should transfer", async () => {
      await lltCar
        .connect(addr1)
        .transferFrom(addr1.address, addr2.address, 100);
      expect(await lltCar.balanceOf(addr2.address)).to.equal(1);
      expect(await lltCar.ownerOf(100)).to.equal(addr2.address);
    });
    it("Should fail transfer", async () => {
      expect(
        lltCar.connect(addr2).transferFrom(addr1.address, addr2.address, 100)
      ).to.be.revertedWithCustomError(lltCar, "ERC721InsufficientApproval");
    });
  });
  describe("Approve", async () => {
    beforeEach(async () => {
      await lltCar.safeMint(addr1.address, 100);
    });
    it("Should approve", async () => {
      await lltCar.connect(addr1).approve(addr2.address, 100);
      expect(await lltCar.getApproved(100)).to.equal(addr2.address);
      await lltCar
        .connect(addr2)
        .transferFrom(addr1.address, addr2.address, 100);
      expect(await lltCar.balanceOf(addr2.address)).to.equal(1);
    });
    it("Should fail approve", async () => {
      expect(
        lltCar.connect(addr2).approve(addr2.address, 100)
      ).to.be.revertedWithCustomError(lltCar, "ERC721InvalidApprover");
    });
  });
});
// TODO: Add test
