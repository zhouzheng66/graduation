const { expect } = require("chai");
const { ethers } = require("hardhat");
describe("ComponentStore", function () {
  let owner, addr1, addr2, addrs;
  let componentStore, testERC721, lltToken;
  const roleHash = ethers.keccak256(ethers.toUtf8Bytes("ADMIN_ROLE"));
  const MinterRole = ethers.keccak256(ethers.toUtf8Bytes("MINTER_ROLE"));
  beforeEach(async () => {
    [owner, addr1, addr2, ...addrs] = await ethers.getSigners();
    const TestERC721 = await ethers.getContractFactory("LLTComponent");
    testERC721 = await TestERC721.deploy(owner.address, owner.address);

    const LLTToken = await ethers.getContractFactory("LLTToken");
    lltToken = await LLTToken.deploy(owner.address, owner.address);

    const ComponentStore = await ethers.getContractFactory("ComponentStore");
    componentStore = await ComponentStore.deploy(
      testERC721.target,
      lltToken.target,
      100,
      owner.address
    );
    // 给商店mint的权限
    await testERC721.grantRole(MinterRole, componentStore.target);
    // 分配lltToken
    await lltToken.mint(owner.address, 1000);
    await lltToken.mint(addr1.address, 1000);
    await lltToken.mint(addr2.address, 1000);
  });
  describe("Deployment", async () => {
    it("Should set the right owner", async function () {
      expect(await componentStore.hasRole(roleHash, owner.address)).to.equal(
        true
      );
      expect(await componentStore.hasRole(roleHash, addr1.address)).to.equal(
        false
      );
      expect(
        await testERC721.hasRole(MinterRole, componentStore.target)
      ).to.equal(true);
    });
  });
  describe("Mint", async () => {
    it("Should be mint only", async () => {
      await expect(componentStore.mint(1, 100, 200)).to.be.reverted;
      await lltToken.approve(componentStore.target, 1000);
      await expect(componentStore.mint(1, 100, 200))
        .to.emit(componentStore, "Minted")
        .withArgs(1000, owner.address);
      expect(await testERC721.balanceOf(owner.address)).to.equal(1);
      expect(await testERC721.totalSupply()).to.equal(1);
    });
    it("Should mint by store", async () => {
      await lltToken.approve(componentStore.target, 1000);
      await expect(componentStore.mintAndList(1, 100, 200, 300))
        .to.emit(componentStore, "MintedAndListed")
        .withArgs(1000, owner.address, 300);
      expect(await testERC721.balanceOf(owner.address)).to.equal(1);
      expect(await testERC721.totalSupply()).to.equal(1);
    });
    it("Should get Attribute", async () => {
      await lltToken.approve(componentStore.target, 1000);
      await componentStore.mintAndList(1, 100, 200, 300);
      const attribute = [1, 100, 200];
      expect(await testERC721.getAttributes(1000)).to.deep.equal(attribute);
    });
  });
  describe("List", async () => {
    it("Shoudle be list info", async () => {
      await lltToken.approve(componentStore.target, 1000);
      await componentStore.mintAndList(1, 100, 200, 300);
      expect(await componentStore.getListingInfo(1000)).to.be.deep.equal([
        owner.address,
        300,
        true,
      ]);
    });
    it("Should get Seller Listing ", async () => {
      await lltToken.approve(componentStore.target, 1000);
      await componentStore.mintAndList(1, 100, 200, 300);
      await componentStore.mintAndList(2, 100, 200, 300);
      expect(await testERC721.totalSupply()).to.equal(2);
      const list = [BigInt(1000), BigInt(1001)];
      expect(await componentStore.getListingInfo(1000)).to.be.deep.equal([
        owner.address,
        300,
        true,
      ]);
      expect(
        await componentStore.getSellerListings(owner.address)
      ).to.be.deep.equal(list);
    });
    it("Should get All Listing", async () => {
      await lltToken.approve(componentStore.target, 1000);
      await componentStore.mintAndList(1, 100, 200, 300);
      await componentStore.mintAndList(2, 100, 200, 300);
      await lltToken.connect(addr1).approve(componentStore.target, 1000);
      await componentStore.connect(addr1).mintAndList(1, 100, 200, 300);
      await componentStore.connect(addr1).mintAndList(1, 100, 200, 300);
      expect(await testERC721.totalSupply()).to.equal(4);
      expect(await componentStore.getAllActiveListings()).to.be.deep.equal([
        BigInt(1000),
        BigInt(1001),
        BigInt(1002),
        BigInt(1003),
      ]);
    });
  });
  describe("Buy and Sell", function () {});
});
