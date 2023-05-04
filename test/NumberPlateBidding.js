const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");

describe("NumberPlateAuction", function () {
    // fixture to be called from tests
    async function deployNumberPlateBiddingFixture() {
      const addresses = await ethers.getSigners(); // Get all addresses
      const CM = await ethers.getContractFactory("NumberPlateAuction"); // deploy sol 
      const cm = await CM.deploy(addresses[0].address);//start deploy to contract owner
      await CM.deployed();
      return { cm, addresses };//return cm: deployed contract instance; addresses: all addresses in the network
    };

    
/*
    it("Should set the right owner", async function () {
      const { cm, addresses } = await loadFixture(deployNumberPlateBiddingFixture);
      // get default signer, in Signer abstraction form
      signer = ethers.provider.getSigner(0);
      // get default signer, but just the address!
      [signerAddress] = await ethers.provider.listAccounts();
      assert.equal(await CM.owner(), signerAddress);
    });


*/
/*
    it("should mint tokens for the user", async function () {
        // rewritten to use fixtures
        const { cm, addresses } = await loadFixture(deployNumberPlateBiddingFixture);
        const [owner, addr1] = addresses;
        await expect(
          cm.connect(addr1).createNumberPlate({
            value: ethers.utils.parseEther("0.0012"),
          })
        )
          .to.changeEtherBalance(owner, ethers.utils.parseEther("0.001"))
          .to.changeEtherBalance(addr1, ethers.utils.parseEther("-0.001"));
        //expect(await cm.connect(addr1).getTokenBalance()).to.equal(1);
      });
*/
    /*
      it("should not mint tokens for the owner", async function () {
        // rewritten to use fixtures
        const { cm } = await loadFixture(deployCoffeeMachineFixture);
        await expect(
          cm.mintTokens({
            value: ethers.utils.parseEther("0.001"),
          })
        ).to.be.revertedWith("cant mint tokens for the owner");
      });
      */
    });