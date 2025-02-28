const { expect } = require("chai");
const { ethers } = require("hardhat");
const { generateCalldataFromABI } = require("../../../utils/callDataGenerator");
describe("StanrdERC6551Account", function () {
  let erc6551Registry, standardERC6551Account, testToken721;
  let owner, addr1, addr2, addrs;
  let chainId;
  beforeEach(async function () {
    [owner, addr1, addr2, ...addrs] = await ethers.getSigners();
    //deploy ERC6551Registry
    const Erc6551Registry = await ethers.getContractFactory("ERC6551Registry");
    erc6551Registry = await Erc6551Registry.deploy();

    //deploy StandardERC6551Account
    const StandardERC6551Account = await ethers.getContractFactory(
      "StandardERC6551Account"
    );
    standardERC6551Account = await StandardERC6551Account.deploy();

    const TestToken721 = await ethers.getContractFactory("LLTCar");
    testToken721 = await TestToken721.deploy(owner.address, owner.address);

    chainId = await ethers.provider.getNetwork().then((res) => {
      return res.chainId;
    });
  });
  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      expect(erc6551Registry.target).to.not.equal(null);
    });
  });
  async function createAccount(userAddress, userChainId, tokenId) {
    // mint a token to owner
    await testToken721.safeMint(userAddress, tokenId || 0);
    const accountChainId = userChainId || chainId;
    const salt = ethers.keccak256(ethers.toUtf8Bytes("salt"));
    const accountAddress = await erc6551Registry.account(
      standardERC6551Account.target,
      accountChainId,
      testToken721.target,
      tokenId || 0,
      salt
    ); // create account

    // create a new account
    await erc6551Registry.createAccount(
      standardERC6551Account.target,
      accountChainId,
      testToken721.target,
      tokenId || 0,
      salt,
      "0x"
    );
    return accountAddress;
  }
  describe("token", async () => {
    it("Shoule be get token info", async () => {
      const contractAddress = await createAccount(owner.address);
      expect(contractAddress).to.not.equal(null);
      console.log("accountAddress" + contractAddress);
      contract1 = await ethers.getContractAt(
        "StandardERC6551Account",
        contractAddress
      );
      await contract1.token().then((token) => {
        expect(token.chainId).to.equal(chainId);
        expect(token.tokenContract).to.equal(testToken721.target);
        expect(token.tokenId).to.equal(0);
      });
    });
  });
  describe("Owner", async () => {
    it("Should be get owner info", async () => {
      const accountAddress = await createAccount(owner.address);
      const accountContract = await ethers.getContractAt(
        "StandardERC6551Account",
        accountAddress
      );

      await accountContract.owner().then((res) => {
        expect(res).to.equal(owner.address);
      });
    });
    it("fail to get owner if chainId is wrong", async function () {
      //mint a token to owner
      const [owner] = await ethers.getSigners();
      const accountAddress = await createAccount(owner.address, 80000);

      //get owner
      const accountContract = await ethers.getContractAt(
        "StandardERC6551Account",
        accountAddress
      );

      await accountContract.owner().then((res) => {
        expect(res).to.equal(ethers.ZeroAddress);
      });
    });
  });
  describe("ExecuteCall", () => {
    it("Should be call transfer ETH", async () => {
      const accountAddress = await createAccount(owner.address);
      const accountContract = await ethers.getContractAt(
        "StandardERC6551Account",
        accountAddress
      );
      await owner.sendTransaction({
        to: accountAddress,
        value: ethers.parseEther("1"),
      });

      // check banlance
      await ethers.provider.getBalance(accountAddress).then((res) => {
        expect(res).to.equal(ethers.parseEther("1"));
      });
      // ececute call
      //transfer 1 Eth to addr1 from accountAddress
      await accountContract
        .connect(owner)
        .executeCall(addr1.address, ethers.parseEther("1"), "0x");
      // check banlance
      await ethers.provider.getBalance(accountAddress).then((res) => {
        expect(res).to.equal(ethers.parseEther("0"));
      });
      // check nonce
      await accountContract.nonce().then((res) => {
        expect(res).to.equal(1);
      });
    });
    it("Should be execute call nft owner of", async () => {
      const accountAddress = await createAccount(owner.address);

      //get owner
      const accountContract = await ethers.getContractAt(
        "StandardERC6551Account",
        accountAddress
      );

      //execute call NFT ownerOf(uint256 tokenId)
      //create call data with function selector and tokenId
      const callData = generateCalldataFromABI("ownerOf(uint256)", [0]);

      //check nonce
      await accountContract.nonce().then((res) => {
        expect(res).to.equal(0);
      });

      //execute call
      await accountContract
        .connect(owner)
        .executeCall(testToken721.target, 0, callData);

      //check nonce
      await accountContract.nonce().then((res) => {
        expect(res).to.equal(1);
      });
    });
    it("Fail to execute call if owner if wrong", async () => {
      const accountAddress = await createAccount(owner.address);
      expect(await testToken721.ownerOf(0)).to.equal(owner.address);
      //get owner
      const accountContract = await ethers.getContractAt(
        "StandardERC6551Account",
        accountAddress
      );
      const callData = generateCalldataFromABI(
        "safeTransferFrom(address,address,uint256)",
        [accountAddress, addr1.address, 1]
      );

      //execute call

      expect(
        accountContract
          .connect(addr1)
          .executeCall(testToken721.target, 0, callData)
      ).to.be.revertedWith("Not token owner");
      await testToken721.safeMint(accountAddress, 1);
      await accountContract.executeCall(testToken721.target, 0, callData);
      expect(await testToken721.ownerOf(1)).to.equal(addr1.address);
    });
  });
});
