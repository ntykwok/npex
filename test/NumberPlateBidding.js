const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("NumberPlateAuction", () => {
  let NumberPlateAuction, numberPlateAuction, owner, addr1, addr2;
  const minCreationFee = ethers.utils.parseEther("0.001"); // 1 Finney
  const minBid = ethers.utils.parseEther("0.001"); // 1 Finney
  const numberPlate = "ABC123";

  beforeEach(async () => {
    NumberPlateAuction = await ethers.getContractFactory("NumberPlateAuction");
    [owner, addr1, addr2, addr3, _] = await ethers.getSigners();
    numberPlateAuction = await NumberPlateAuction.deploy();
    await numberPlateAuction.deployed();
  });

  describe("createNumberPlate", () => {
    it("should create a number plate and start an auction", async () => {
      await numberPlateAuction.connect(addr1).createNumberPlate(numberPlate, { value: minCreationFee });

      const tokenId = ethers.BigNumber.from(ethers.utils.keccak256(ethers.utils.toUtf8Bytes(numberPlate)));
      expect(await numberPlateAuction.ownerOf(tokenId)).to.equal(addr1.address);

      const auction = await numberPlateAuction.auctions(tokenId);
      expect(auction.creator).to.equal(addr1.address);
      expect(auction.highestBid).to.equal(minCreationFee);
    });
    it("should revert if number plate already exists", async () => {
      await numberPlateAuction.connect(addr1).createNumberPlate(numberPlate, { value: minCreationFee });
  
      await expect(
        numberPlateAuction.connect(addr2).createNumberPlate(numberPlate, { value: minCreationFee })
      ).to.be.revertedWith("Number plate already exists.");
    });
  });
  describe("bidOnAuction", () => {
    beforeEach(async () => {
      await numberPlateAuction.connect(addr1).createNumberPlate(numberPlate, { value: minCreationFee });
    });

    it("should place a valid bid", async () => {
      const tokenId = ethers.BigNumber.from(ethers.utils.keccak256(ethers.utils.toUtf8Bytes(numberPlate)));
      await numberPlateAuction.connect(addr2).bidOnAuction(numberPlate, { value: minBid.add(minBid) });

      const auction = await numberPlateAuction.auctions(tokenId);
      expect(auction.highestBidder).to.equal(addr2.address);
      expect(auction.highestBid).to.equal(minBid.add(minBid));
    });
    it("should revert if bid is less than minBid", async () => {
      await expect(
        numberPlateAuction.connect(addr2).bidOnAuction(numberPlate, { value: minBid.sub(1) })
      ).to.be.revertedWith("Bid must be at least 1 Finney.");
    });
    it("should revert if auction has ended", async () => {
      const tokenId = ethers.BigNumber.from(ethers.utils.keccak256(ethers.utils.toUtf8Bytes(numberPlate)));
      const auction = await numberPlateAuction.auctions(tokenId);
      await ethers.provider.send("evm_setNextBlockTimestamp", [auction.endTime.toNumber() + 1]);

      await expect(
        numberPlateAuction.connect(addr2).bidOnAuction(numberPlate, { value: minBid.add(minBid) })
      ).to.be.revertedWith("Auction has ended.");
    });
  });
  describe("endAuction", () => {
    beforeEach(async () => {
      await numberPlateAuction.connect(addr1).createNumberPlate(numberPlate, { value: minCreationFee });
    });
    it("should end the auction and transfer the number plate", async () => {
      const tokenId = ethers.BigNumber.from(ethers.utils.keccak256(ethers.utils.toUtf8Bytes(numberPlate)));
      await numberPlateAuction.connect(addr2).bidOnAuction(numberPlate, { value: minBid.add(minBid) });

      const auction = await numberPlateAuction.auctions(tokenId);
      await ethers.provider.send("evm_setNextBlockTimestamp", [auction.endTime.toNumber() + 1]);

      await numberPlateAuction.connect(addr1).endAuction(numberPlate);
      expect(await numberPlateAuction.ownerOf(tokenId)).to.equal(addr2.address);
    });
    it("should revert if auction has not ended yet", async () => {
      await expect(
        numberPlateAuction.connect(addr1).endAuction(numberPlate)
      ).to.be.revertedWith("Auction has not ended yet.");
    });
    it("should revert if auction has already been ended", async ()=> {
      const tokenId = ethers.BigNumber.from(ethers.utils.keccak256(ethers.utils.toUtf8Bytes(numberPlate)));
      await numberPlateAuction.connect(addr2).bidOnAuction(numberPlate, { value: minBid.add(minBid) });

      const auction = await numberPlateAuction.auctions(tokenId);
      await ethers.provider.send("evm_setNextBlockTimestamp", [auction.endTime.toNumber() + 1]);

      await numberPlateAuction.connect(addr1).endAuction(numberPlate);
      await expect(
        numberPlateAuction.connect(addr1).endAuction(numberPlate)
      ).to.be.revertedWith("Auction has already been ended.");
    });
  }); 
  describe("setForSale", () => {
    beforeEach(async () => {
      await numberPlateAuction.connect(addr1).createNumberPlate(numberPlate, { value: minCreationFee });
    });
  
    it("should set a number plate for sale", async () => {
      const tokenId = ethers.BigNumber.from(ethers.utils.keccak256(ethers.utils.toUtf8Bytes(numberPlate)));
      await numberPlateAuction.connect(addr1).setForSale(numberPlate, minCreationFee);
  
      const numberPlateData = await numberPlateAuction.numberPlates(tokenId);
      expect(numberPlateData.forSale).to.equal(true);
      expect(numberPlateData.price).to.equal(minCreationFee);
    });
  
    it("should revert if caller is not owner nor approved", async () => {
      await expect(
        numberPlateAuction.connect(addr2).setForSale(numberPlate, minCreationFee)
      ).to.be.revertedWith("Caller is not owner nor approved.");
    });
  });
  
  describe("buyNumberPlate", () => {
    beforeEach(async () => {
      await numberPlateAuction.connect(addr1).createNumberPlate(numberPlate, { value: minCreationFee });
      await numberPlateAuction.connect(addr1).setForSale(numberPlate, minCreationFee);
    });
  
    it("should buy a number plate and transfer ownership", async () => {
      await numberPlateAuction.connect(addr2).buyNumberPlate(numberPlate, { value: minCreationFee });
  
      const tokenId = ethers.BigNumber.from(ethers.utils.keccak256(ethers.utils.toUtf8Bytes(numberPlate)));
      expect(await numberPlateAuction.ownerOf(tokenId)).to.equal(addr2.address);
  
      const numberPlateData = await numberPlateAuction.numberPlates(tokenId);
      expect(numberPlateData.forSale).to.equal(false);
    });
  
    it("should revert if number plate is not for sale", async () => {
      await numberPlateAuction.connect(addr1).removeFromSale(numberPlate);
  
      await expect(
        numberPlateAuction.connect(addr2).buyNumberPlate(numberPlate, { value: minCreationFee })
      ).to.be.revertedWith("Number plate is not for sale.");
    });
  
    it("should revert if price is not met", async () => {
      await expect(
        numberPlateAuction.connect(addr2).buyNumberPlate(numberPlate, { value: minCreationFee.sub(1) })
      ).to.be.revertedWith("Price not met.");
    });
  });
  describe("setDestination", () => {
    const destination = "Moon";
  
    beforeEach(async () => {
      await numberPlateAuction.connect(addr1).createNumberPlate(numberPlate, { value: minCreationFee });
    });
  
    it("should set the destination of a number plate", async () => {
      const tokenId = ethers.BigNumber.from(ethers.utils.keccak256(ethers.utils.toUtf8Bytes(numberPlate)));
      await numberPlateAuction.connect(addr1).setDestination(numberPlate, destination);
  
      const numberPlateData = await numberPlateAuction.numberPlates(tokenId);
      expect(numberPlateData.destination).to.equal(destination);
    });
  
    it("should revert if caller is not owner nor approved", async () => {
      await expect(
        numberPlateAuction.connect(addr2).setDestination(numberPlate, destination)
      ).to.be.revertedWith("Caller is not owner nor approved.");
    });
  });
  describe("getAuctionData", () => {
    beforeEach(async () => {
      await numberPlateAuction.connect(addr1).createNumberPlate(numberPlate, { value: minCreationFee });
    });
  
    it("should return auction data for number plates", async () => {
      const auctionData = await numberPlateAuction.getAuctionData();
      expect(auctionData.length).to.equal(1);
      expect(auctionData[0].numberPlate).to.equal(numberPlate);
      expect(auctionData[0].highestBid).to.equal(minCreationFee);
    });
  });
  
  describe("getForSaleData", () => {
    beforeEach(async () => {
      await numberPlateAuction.connect(addr1).createNumberPlate(numberPlate, { value: minCreationFee });
      await numberPlateAuction.connect(addr1).setForSale(numberPlate, minCreationFee);
    });
  
    it("should return for sale data for number plates", async () => {
      const forSaleData = await numberPlateAuction.getForSaleData();
      expect(forSaleData.length).to.equal(1);
      expect(forSaleData[0].numberPlate).to.equal(numberPlate);
      expect(forSaleData[0].price).to.equal(minCreationFee);
    });
  });
  describe("removeFromSale", () => {
    beforeEach(async () => {
      await numberPlateAuction.connect(addr1).createNumberPlate(numberPlate, { value: minCreationFee });
      await numberPlateAuction.connect(addr1).setForSale(numberPlate, minCreationFee);
    });
  
    it("should remove a number plate from sale", async () => {
      const tokenId = ethers.BigNumber.from(ethers.utils.keccak256(ethers.utils.toUtf8Bytes(numberPlate)));
      await numberPlateAuction.connect(addr1).removeFromSale(numberPlate);
  
      const numberPlateData = await numberPlateAuction.numberPlates(tokenId);
      expect(numberPlateData.forSale).to.equal(false);
      expect(numberPlateData.price).to.equal(minCreationFee);
    });
  
    it("should revert if caller is not owner nor approved", async () => {
      await expect(
        numberPlateAuction.connect(addr2).removeFromSale(numberPlate)
      ).to.be.revertedWith("Caller is not owner nor approved.");
    });
  }); 
  describe("placeBid", () => {
    beforeEach(async () => {
      await numberPlateAuction.connect(addr1).createNumberPlate(numberPlate, { value: minCreationFee });
    });
  
    it("should revert if bid is lower than the current highest bid", async () => {
      await numberPlateAuction.connect(addr2).bidOnAuction(numberPlate, { value: minCreationFee.mul(2) });
  
      await expect(
        numberPlateAuction.connect(addr3).bidOnAuction(numberPlate, { value: minCreationFee })
      ).to.be.revertedWith("Bid must be higher than the current highest bid.");
    });
  });
});