const { expect } = require("chai");
const { ethers } = require("hardhat");
describe("ERC6551Register", function () {
  let erc6551Registry, standardERC6551Account, testToken721;
  let owner, addr1, addr2, addrs;
  beforeEach(async function () {
    [owner, addr1, addr2, ...addrs] = await ethers.getSigners();
    const Erc6551Registry = await ethers.getContractFactory("ERC6551Registry");
    erc6551Registry = await Erc6551Registry.deploy();

    const StandardERC6551Account = await ethers.getContractFactory(
      "StandardERC6551Account"
    );
    standardERC6551Account = await StandardERC6551Account.deploy();

    const TestToken721 = await ethers.getContractFactory("LLTCar");
    testToken721 = await TestToken721.deploy(owner.address, owner.address);
  });

  it("Should be able to register an account", async function () {
    expect(erc6551Registry.target).to.not.be.null;
  });
  describe("Account", async () => {
    it("Should be able to register an account", async () => {
      // mint an token to owner
      await testToken721.safeMint(owner.address, 1);
      expect(await testToken721.ownerOf(1)).to.equal(owner.address);

      // register an account
      const salt = ethers.keccak256(ethers.toUtf8Bytes("salt"));
      const accountAddress = await erc6551Registry.account(
        standardERC6551Account.target,
        80001,
        testToken721.target,
        0,
        salt
      );
      expect(accountAddress).to.not.equal(null);
      console.log("accountAddress" + accountAddress);
      // create a new account
      await expect(
        erc6551Registry.createAccount(
          standardERC6551Account.target,
          80001,
          testToken721.target,
          0,
          salt,
          "0x"
        )
      )
        .to.emit(erc6551Registry, "AccountCreated")
        .withArgs(
          accountAddress,
          standardERC6551Account.target,
          80001,
          testToken721.target,
          0,
          salt
        );
    });
  });
});
