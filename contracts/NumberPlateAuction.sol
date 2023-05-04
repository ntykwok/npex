// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "../node_modules/@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "../node_modules/@openzeppelin/contracts/utils/Address.sol" ;

contract NumberPlateAuction is ERC721 {
    using Address for address payable;

    struct Auction {
        address payable creator;
        uint256 endTime;
        uint256 highestBid;
        address highestBidder;
        bool ended;
    }

    struct NumberPlate {
        bool forSale;
        uint256 price;
        string destination;
    }

    struct AuctionData {
        string numberPlate;
        //uint256 tokenid;
        uint256 endtime;
        uint256 highestBid;
    }

    struct ForSaleData {
        string numberPlate;
        //uint256 tokenid;
        uint256 price;
    }

    uint256 private auctionDuration = 3 minutes;
    uint256 private constant minCreationFee = 1000000000000000; // 1 Finney
    uint256 private constant minBid = 1000000000000000; // 1 Finney
    uint256 private constant commissionPercentage = 1;

    address private contractOwner;

    mapping(string => uint256) public numberPlateToTokenId;
    mapping(uint256 => Auction) public auctions;
    mapping(uint256 => NumberPlate) public numberPlates;
    mapping(uint256 => string) public tokenToNumberPlate;

    string[] private auctionNumberPlates;
    string[] private forSaleNumberPlates;

    constructor() ERC721("Number Plate", "NP") {
        contractOwner = msg.sender;
    }

    modifier onlyContractOwner() {
        require(msg.sender == contractOwner, "Only contract owner can call this function.");
        _;
    }

    function createNumberPlate(string memory np) external payable {
        uint256 tokenId = uint256(keccak256(abi.encodePacked(np)));
        require(!_exists(tokenId), "Number plate already exists.");
        require(msg.value >= minCreationFee, "Creation fee not met.");

        _safeMint(msg.sender, tokenId);
        tokenToNumberPlate[tokenId] = np;
        numberPlateToTokenId[np] = tokenId;

        uint256 endTime = block.timestamp + auctionDuration;
        auctions[tokenId] = Auction(payable(msg.sender), endTime, minCreationFee, address(0), false);
        auctionNumberPlates.push(np);

        if (msg.value > minCreationFee) {
            uint256 refund = msg.value - minCreationFee;
            payable(msg.sender).sendValue(refund);
        }

        address payable contractOwnerPayable = payable(contractOwner);
        contractOwnerPayable.sendValue(minCreationFee);
    }

    function withdrawBalance() external onlyContractOwner {
        address payable contractOwnerPayable = payable(contractOwner);
        contractOwnerPayable.sendValue(address(this).balance);
    }

    function bidOnAuction(string memory np) external payable {
        uint256 tokenId = numberPlateToTokenId[np];
        Auction storage auction = auctions[tokenId];
        require(block.timestamp <= auction.endTime, "Auction has ended.");
        require(msg.value >= minBid, "Bid must be at least 1 Finney.");
        require(msg.value > auction.highestBid, "Bid must be higher than the current highest bid.");

        if (auction.highestBidder != address(0)) {
            payable(auction.highestBidder).sendValue(auction.highestBid);
        }

        auction.highestBid = msg.value;
        auction.highestBidder = msg.sender;
    }

    function endAuction(string memory np) external {
        uint256 tokenId = numberPlateToTokenId[np];
        Auction storage auction = auctions[tokenId];
        require(block.timestamp >= auction.endTime, "Auction has not ended yet.");
        require(!auction.ended, "Auction has already been ended.");

        auction.ended = true;
        if (auction.highestBidder != address(0)) {
            uint256 commission = (auction.highestBid * commissionPercentage) / 100;
            uint256 payment = auction.highestBid - commission;

            payable(auction.creator).sendValue(payment);
            address payable contractOwnerPayable = payable(contractOwner);
            contractOwnerPayable.sendValue(commission);
            _safeTransfer(auction.creator, auction.highestBidder, tokenId, "");
        } 
        // Remove the number plate from the auction list
        for (uint256 i = 0; i < auctionNumberPlates.length; i++) {
            if (keccak256(abi.encodePacked(auctionNumberPlates[i])) == keccak256(abi.encodePacked(np))) {
                auctionNumberPlates[i] = auctionNumberPlates[auctionNumberPlates.length - 1];
                auctionNumberPlates.pop();
                break;
            }
        }
    }

    function setForSale(string memory np, uint256 price) external {
        uint256 tokenId = numberPlateToTokenId[np];
        require(_isApprovedOrOwner(msg.sender, tokenId), "Caller is not owner nor approved.");

        NumberPlate storage numberPlate = numberPlates[tokenId];
        numberPlate.forSale = true;
        numberPlate.price = price;
        forSaleNumberPlates.push(np);
    }

    function removeFromSale(string memory np) external {
        uint256 tokenId = numberPlateToTokenId[np];
        require(_isApprovedOrOwner(msg.sender, tokenId), "Caller is not owner nor approved.");

        NumberPlate storage numberPlate = numberPlates[tokenId];
        numberPlate.forSale = false;

        // Remove the number plate from the for sale list
        for (uint256 i = 0; i < forSaleNumberPlates.length; i++) {
            if (keccak256(abi.encodePacked(forSaleNumberPlates[i])) == keccak256(abi.encodePacked(np))) {
                forSaleNumberPlates[i] = forSaleNumberPlates[forSaleNumberPlates.length - 1];
                forSaleNumberPlates.pop();
                break;
            }
        }
    }

    function setDestination(string memory np, string calldata dest) external {
        uint256 tokenId = numberPlateToTokenId[np];
        require(_isApprovedOrOwner(msg.sender, tokenId), "Caller is not owner nor approved.");

        NumberPlate storage numberPlate = numberPlates[tokenId];
        numberPlate.destination=dest;
    }

    function buyNumberPlate(string memory np) external payable {
        uint256 tokenId = numberPlateToTokenId[np];
        NumberPlate storage numberPlate = numberPlates[tokenId];
        require(numberPlate.forSale, "Number plate is not for sale.");
        require(msg.value >= numberPlate.price, "Price not met.");

        address seller = ownerOf(tokenId);
        _safeTransfer(seller, msg.sender, tokenId, "");

        numberPlate.forSale = false;

        // Remove the number plate from the for sale list
        for (uint256 i = 0; i < forSaleNumberPlates.length; i++) {
            if (keccak256(abi.encodePacked(forSaleNumberPlates[i])) == keccak256(abi.encodePacked(np))) {
                forSaleNumberPlates[i] = forSaleNumberPlates[forSaleNumberPlates.length - 1];
                forSaleNumberPlates.pop();
                break;
            }
        }

        uint256 commission = (numberPlate.price * commissionPercentage) / 100;
        uint256 payment = numberPlate.price - commission;
        payable(seller).sendValue(payment);
        address payable contractOwnerPayable = payable(contractOwner);
        contractOwnerPayable.sendValue(commission);

        if (msg.value > numberPlate.price) {
            uint256 refund = msg.value - numberPlate.price;
            payable(msg.sender).sendValue(refund);
        }
    }

    function getAuctionData() external view returns (AuctionData[] memory) {
        uint256 count = auctionNumberPlates.length;
        AuctionData[] memory auctionData = new AuctionData[](count);

        for (uint256 i = 0; i < count; i++) {
            uint256 tokenId = numberPlateToTokenId[auctionNumberPlates[i]];
            uint256 highestBid = auctions[tokenId].highestBid;
            uint256 endtime=auctions[tokenId].endTime;
            
            auctionData[i] = AuctionData(auctionNumberPlates[i], endtime-block.timestamp, highestBid);
        }

        return auctionData;
    }

    function getForSaleData() external view returns (ForSaleData[] memory) {
        uint256 count = forSaleNumberPlates.length;
        ForSaleData[] memory forSaleData = new ForSaleData[](count);

        for (uint256 i = 0; i < count; i++) {
            uint256 tokenId = numberPlateToTokenId[forSaleNumberPlates[i]];
            uint256 price = numberPlates[tokenId].price;
            forSaleData[i] = ForSaleData(forSaleNumberPlates[i], price);
        }

        return forSaleData;
    }


}