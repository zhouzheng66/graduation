const { expect } = require("chai");
const { ethers } = require("hardhat");
describe("LLTComponent", function () {
  const MINTER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("MINTER_ROLE"));
  let owner, addr1, addr2, addrs;
  let lltComponent;
  beforeEach(async () => {
    [owner, addr1, addr2, ...addrs] = await ethers.getSigners();
    const LltComponent = await ethers.getContractFactory("LLTComponent");
    lltComponent = await LltComponent.deploy(owner.address, owner.address);
  });
  describe("Deployment", async () => {
    it("Should set the right owner", async () => {
      expect(await lltComponent.hasRole(MINTER_ROLE, owner.address)).to.equal(
        true
      );
      expect(await lltComponent.symbol()).to.equal("LLTCOM");
    });
  });
  describe("Mint", async () => {
    it("Should mint tokens", async () => {
      await lltComponent.safeMint(addr1.address, 100, 1, 100, 100);
      expect(await lltComponent.balanceOf(addr1.address)).to.equal(1);
    });
  });
  describe("Transfer", async () => {
    it("Should transfer tokens", async () => {
      await lltComponent.safeMint(addr1.address, 100, 1, 100, 100);
      await lltComponent
        .connect(addr1)
        .transferFrom(addr1.address, addr2.address, 100);
      expect(await lltComponent.ownerOf(100)).to.be.equal(addr2.address);
    });
  });
  describe("Approve", async () => {
    it("Should approve tokens", async () => {
      await lltComponent.safeMint(addr1.address, 100, 1, 100, 100);
      await lltComponent.connect(addr1).approve(addr2.address, 100);
      expect(await lltComponent.getApproved(100)).to.equal(addr2.address);
      await lltComponent
        .connect(addr2)
        .transferFrom(addr1.address, addr2.address, 100);
      expect(await lltComponent.ownerOf(100)).to.be.equal(addr2.address);
    });
  });
  describe("Attribute", async () => {
    it("Should get attribute", async () => {
      await lltComponent.safeMint(addr1.address, 100, 1, 100, 100);
      let attribute = [1, 100, 100];
      expect(await lltComponent.getAttributes(100)).to.deep.equal(attribute);
    });
  });
});
