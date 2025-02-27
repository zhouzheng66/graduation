const { expect } = require("chai");
describe("LLTToken", function () {
  let lltToken;
  let owner;
  let addr1;
  let addr2;
  let addrs;

  beforeEach(async function () {
    [owner, addr1, addr2, ...addrs] = await ethers.getSigners();

    const LLTToken = await ethers.getContractFactory("LLTToken");
    lltToken = await LLTToken.deploy(owner.address, owner.address);
  });
  it("should be deployed", async () => {
    expect(lltToken.address).to.not.equal(0);
  });
  it("Should be mint with right Role", async function () {
    await expect(lltToken.connect(addr1).mint(addr1.address, 100)).to.be
      .reverted;
    await expect(lltToken.mint(addr1.address, 100)).to.not.be.reverted;
    await expect(await lltToken.balanceOf(addr1.address)).to.equal(100);
  });
  it("should be transfer with right Role", async () => {
    await lltToken.mint(addr1.address, 100);
    await expect(lltToken.connect(addr2).transfer(addr1.address, 100)).to.be
      .reverted;
    await expect(lltToken.transfer(addr1.address, 100)).to.not.be.reverted;
    await expect(await lltToken.balanceOf(addr1.address)).to.equal(200);
    // approve
    await expect(lltToken.approve(addr2.address, 100)).to.not.be.reverted;
    await expect(
      lltToken.connect(addr2).transferFrom(owner.address, addr2.address, 50)
    ).to.not.be.reverted;
    await expect(
      lltToken.connect(addr2).transferFrom(owner.address, addr1.address, 50)
    ).to.not.be.reverted;
    await expect(await lltToken.balanceOf(addr2.address)).to.equal(50);
    await expect(await lltToken.balanceOf(addr1.address)).to.equal(250);
  });
});
