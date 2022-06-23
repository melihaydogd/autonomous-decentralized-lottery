// SPDX-License-Identifier: GPL-3.0

pragma solidity >=0.7.0 <0.9.0;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract LotteryTicket is ERC721, Ownable {

    address public lotteryContract;

    modifier onlyLotteryContract() {
        require(msg.sender == lotteryContract, "Sender is not lottery contract");
        _;
    }

    constructor() ERC721("Lottery Ticket", "LT") {
    }

    // Sets the lottery contract. It is only executable by the owner that deploys this contract
    function setLotteryContract(address _lotteryContract) public onlyOwner {
        lotteryContract = _lotteryContract;
    }

    // Creates the lottery ticket. It is only executable by lottery contract
    function createTicket(address to, uint256 tokenId) public onlyLotteryContract {
        _safeMint(to, tokenId);
    }
}