const { expect } = require("chai");
describe("LotLoot", async () => {
  let owner, user1, user2, users;
  let lotLoot, ttlCar, lltPark, carStore, parkStore, erc6551R, erc6551A;
  beforeEach(async () => {
    [owner, user1, user2, ...users] = await ethers.getSigners();
    const LotLoot = await ethers.getContractFactory("LotLoot");
    lotLoot = await LotLoot.deploy();
    await lotLoot.deployed();
    const LLTCar = await ethers.getContractFactory("LLTCar");
    const LLTPark = await ethers.getContractFactory("LLTPark");
    const CarStore = await ethers.getContractFactory("CarStore");
    const ParkStore = await ethers.getContractFactory("ParkStore");
    const ERC6551R = await ethers.getContractFactory("ERC6551Registry");
    const ERC6551A = await ethers.getContractFactory("StandardERC6551Account");
    ttlCar = await LLTCar.deploy();
    lltPark = await LLTPark.deploy();
    carStore = await CarStore.deploy();
    parkStore = await ParkStore.deploy();
    erc6551R = await ERC6551R.deploy();
    erc6551A = await ERC6551A.deploy(erc6551R.address);
  });
});
