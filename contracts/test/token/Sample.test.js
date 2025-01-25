const { expect } = require("chai");
describe("Sample", function () {
  let sample;
  describe("deploment", () => {
    it("should deploy", async () => {
      const Sample = await ethers.getContractFactory("Sample");
      sample = await Sample.deploy("hello");
    });
    it("should say hello", async () => {
      expect(await sample.sayHello()).to.be.equal("hello");
    });
  });
});
