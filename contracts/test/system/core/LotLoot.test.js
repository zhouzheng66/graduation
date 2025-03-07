const { expect } = require("chai");
const { ethers } = require("hardhat");
const { generateCalldataFromABI } = require("../../../utils/calldataGenerator");
describe("LotLoot", function () {
  const MINTER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("MINTER_ROLE"));
  const BURNER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("BURNER_ROLE"));
  let owner, user1, user2, users;
  let lotLoot,
    lltCar,
    lltPark,
    carStore,
    parkStore,
    erc6551R,
    erc6551A,
    componentStore,
    lltComponent,
    lltToken;
  beforeEach(async () => {
    [owner, user1, user2, ...users] = await ethers.getSigners();
    const LotLoot = await ethers.getContractFactory("LotLoot");
    const LLTCar = await ethers.getContractFactory("LLTCar");
    const LLTPark = await ethers.getContractFactory("LLTPark");
    const LLTComponent = await ethers.getContractFactory("LLTComponent");
    const CarStore = await ethers.getContractFactory("CarStore");
    const ParkStore = await ethers.getContractFactory("ParkStore");
    const ERC6551R = await ethers.getContractFactory("ERC6551Registry");
    const ERC6551A = await ethers.getContractFactory("StandardERC6551Account");
    const ComponentStore = await ethers.getContractFactory("ComponentStore");
    const LLTToken = await ethers.getContractFactory("LLTToken");
    lltToken = await LLTToken.deploy(owner.address, owner.address);
    erc6551R = await ERC6551R.deploy();
    erc6551A = await ERC6551A.deploy();
    lltCar = await LLTCar.deploy(owner.address, owner.address);
    lltPark = await LLTPark.deploy(owner.address, owner.address);
    lltComponent = await LLTComponent.deploy(owner.address, owner.address);
    carStore = await CarStore.deploy(
      lltCar.target,
      erc6551R.target,
      erc6551A.target
    );
    parkStore = await ParkStore.deploy(
      lltPark.target,
      erc6551R.target,
      erc6551A.target
    );
    componentStore = await ComponentStore.deploy(
      lltComponent.target,
      lltToken.target,
      100,
      owner.address
    );

    lotLoot = await LotLoot.deploy(
      lltToken.target,
      lltCar.target,
      lltPark.target,
      lltComponent.target,
      erc6551R.target,
      erc6551A.target
    );
    await lltToken.grantRole(MINTER_ROLE, lotLoot.target);
    await lltCar.grantRole(MINTER_ROLE, carStore.target);
    await lltCar.grantRole(MINTER_ROLE, carStore.target);
    await lltPark.grantRole(MINTER_ROLE, parkStore.target);
    await lltComponent.grantRole(MINTER_ROLE, componentStore.target);
    await lltToken.mint(owner.address, 1000);
    await lltToken.mint(user1.address, 1000);
    await lltToken.approve(componentStore, 1000);
    await lltToken.connect(user1).approve(componentStore, 1000);
  });
  describe("Deployment", async () => {
    it("Should be deployment", async () => {
      expect(await lltCar.hasRole(MINTER_ROLE, carStore.target)).to.equal(true);
      expect(await lltPark.hasRole(MINTER_ROLE, parkStore.target)).to.equal(
        true
      );
      expect(
        await lltComponent.hasRole(MINTER_ROLE, componentStore.target)
      ).to.equal(true);
    });
  });
  async function mintCarAndPark(user) {
    await carStore.connect(user).mint();
    await parkStore.connect(user).mint();
  }
  async function carAccount(tokenId) {
    return erc6551R.account(
      erc6551A.target,
      31337,
      lltCar.target,
      tokenId,
      tokenId
    );
  }
  describe("Park", async () => {
    it("Should be park", async () => {
      await mintCarAndPark(owner);
      await mintCarAndPark(user1);
      expect(await lltCar.ownerOf(1001)).to.equal(user1.address);
      expect(await lltCar.ownerOf(1000)).to.equal(owner.address);
      await lotLoot.parkCar(1000, 1001);
      expect(await lotLoot.viewCarOnPark(1000)).to.equal(1001);
    });
    it("Shoule be Unpark", async () => {
      await mintCarAndPark(owner);
      await mintCarAndPark(user1);
      await lotLoot.parkCar(1000, 1001);
      // 增加时间
      await ethers.provider.send("evm_increaseTime", [3600]); // 增加 1 小时
      await ethers.provider.send("evm_mine");
      await lotLoot.unParkCar(1000);
      expect(await lotLoot.viewCarOnPark(1000)).to.equal(0);
      carAddress = await carAccount(1000);
      carContract = await ethers.getContractAt(
        "StandardERC6551Account",
        carAddress
      );
      expect(await lltToken.balanceOf(owner.address)).not.to.equal(0);
    });
    it("Should be fine", async () => {
      await mintCarAndPark(owner);
      await mintCarAndPark(user1);
      await lotLoot.parkCar(1000, 1001);
      // 增加时间
      await ethers.provider.send("evm_increaseTime", [3600]); // 增加 1 小时
      await ethers.provider.send("evm_mine");
      await lotLoot.connect(user1).fineCar(1001);
      expect(await lotLoot.viewCarOnPark(1000)).to.equal(0);
      expect(await lltCar.balanceOf(user1.address)).not.to.equal(0);
    });
  });
  describe("Component", function () {
    it("Shoule get Account", async () => {
      await mintCarAndPark(owner);
      await mintCarAndPark(user1);
      let carAddress = await carAccount(1000);
      let carContract = await ethers.getContractAt(
        "StandardERC6551Account",
        carAddress
      );
      await carContract.token().then((token) => {
        expect(token.chainId).to.equal(31337);
        expect(token.tokenContract).to.equal(lltCar.target);
        expect(token.tokenId).to.equal(1000);
      });
    });
    it("Should load and unload", async () => {
      await mintCarAndPark(owner);
      await mintCarAndPark(user1);
      let carAddress = await carAccount(1000);
      await componentStore.mint(1, 100, 100);
      expect(await lltComponent.ownerOf(1000)).to.equal(owner.address);
      expect(await lltCar.ownerOf(1000)).to.be.equal(owner.address);
      await lltComponent.approve(lotLoot.target, 1000);
      await lotLoot.load(1000, 1000);
      expect(await lltComponent.ownerOf(1000)).to.be.equal(carAddress);
      carContract = await ethers.getContractAt(
        "StandardERC6551Account",
        carAddress
      );
      calldata = generateCalldataFromABI("approve(address,uint256)", [
        lotLoot.target,
        1000,
      ]);
      await carContract.executeCall(lltComponent.target, 0, calldata);
      await lotLoot.unload(1000, 1000);
      expect(await lltComponent.ownerOf(1000)).to.be.equal(owner.address);
    });
  });
});
