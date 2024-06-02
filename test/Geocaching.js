const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Geocaching", function () {
  let Geocaching;
  let geocaching;
  let owner;
  let addr1;
  let addr2;

  beforeEach(async function () {
    Geocaching = await ethers.getContractFactory("Geocaching");
    [owner, addr1, addr2, _] = await ethers.getSigners();
    geocaching = await Geocaching.deploy();
    await geocaching.waitForDeployment();
  });

  it("Should create a cache", async function () {
    await geocaching.createCache("First Cache", "This is the first cache", "N 47° 30.000 E 019° 03.000");
    const cache = await geocaching.caches(0);
    expect(cache.name).to.equal("First Cache");
    expect(cache.description).to.equal("This is the first cache");
    expect(cache.coordinates).to.equal("N 47° 30.000 E 019° 03.000");
    expect(cache.owner).to.equal(owner.address);
    expect(cache.exists).to.be.true;
  });

  it("Should log a cache find with trackables added and removed", async function () {
    await geocaching.createCache("First Cache", "This is the first cache", "N 47° 30.000 E 019° 03.000");
    await geocaching.addTrackable("Trackable 1", 0);
    await geocaching.addTrackable("Trackable 2", 0);

    const addr1Address = await addr1.getAddress();
    const messageHash = ethers.solidityPackedKeccak256(["uint256", "address"], [0, addr1Address]);
    const signature = await owner.signMessage(ethers.getBytes(messageHash));

    await geocaching.connect(addr1).logCacheFind(0, [0], [1], signature);
    const logs = await geocaching.getCacheLogs(0);
    expect(logs.length).to.equal(1);
    expect(logs[0].finder).to.equal(addr1.address);
    expect(logs[0].trackablesAdded.length).to.equal(1);
    expect(logs[0].trackablesAdded[0]).to.equal(0);
    expect(logs[0].trackablesRemoved.length).to.equal(1);
    expect(logs[0].trackablesRemoved[0]).to.equal(1);
  });

  it("Should not log a cache find with incorrect signature", async function () {
    await geocaching.createCache("First Cache", "This is the first cache", "N 47° 30.000 E 019° 03.000");
    await geocaching.addTrackable("Trackable 1", 0);
    await geocaching.addTrackable("Trackable 2", 0);

    const messageHash = ethers.solidityPackedKeccak256(["uint256", "string"], [0, "wrongsecret"]);
    const signature = await addr1.signMessage(ethers.getBytes(messageHash));

    await expect(
      geocaching.connect(addr1).logCacheFind(0, [0], [1], signature)
    ).to.be.revertedWith("Invalid signature");
  });

  it("Should add a trackable to a cache", async function () {
    await geocaching.createCache("First Cache", "This is the first cache", "N 47° 30.000 E 019° 03.000");
    await geocaching.addTrackable("Trackable 1", 0);
    const trackable = await geocaching.trackables(0);
    expect(trackable.name).to.equal("Trackable 1");
    expect(trackable.cacheId).to.equal(0);
    expect(trackable.owner).to.equal(owner.address);
  });

  it("Should move a trackable to a new cache", async function () {
    await geocaching.createCache("First Cache", "This is the first cache", "N 47° 30.000 E 019° 03.000");
    await geocaching.createCache("Second Cache", "This is the second cache", "N 48° 30.000 E 020° 03.000");
    await geocaching.addTrackable("Trackable 1", 0);
    await geocaching.moveTrackable(0, 1);
    const trackable = await geocaching.trackables(0);
    expect(trackable.cacheId).to.equal(1);
  });

  it("Should report and resolve a cache problem", async function () {
    await geocaching.createCache("First Cache", "This is the first cache", "N 47° 30.000 E 019° 03.000");
    await geocaching.connect(addr1).reportCacheProblem(0);
    let problem = await geocaching.cacheProblems(0);
    expect(problem).to.be.true;
    await geocaching.resolveCacheProblem(0);
    problem = await geocaching.cacheProblems(0);
    expect(problem).to.be.false;
  });

  it("Should only allow cache owner to resolve problem", async function () {
    await geocaching.createCache("First Cache", "This is the first cache", "N 47° 30.000 E 019° 03.000");
    await geocaching.connect(addr1).reportCacheProblem(0);
    await expect(
      geocaching.connect(addr1).resolveCacheProblem(0)
    ).to.be.revertedWith("Only the owner can resolve the problem");
  });

  it("Should only allow trackable owner to move trackable", async function () {
    await geocaching.createCache("First Cache", "This is the first cache", "N 47° 30.000 E 019° 03.000");
    await geocaching.createCache("Second Cache", "This is the second cache", "N 48° 30.000 E 020° 03.000");
    await geocaching.addTrackable("Trackable 1", 0);
    await expect(
      geocaching.connect(addr1).moveTrackable(0, 1)
    ).to.be.revertedWith("Only the owner can move the trackable");
  });
});
