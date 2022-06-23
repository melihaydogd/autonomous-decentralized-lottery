// SPDX-License-Identifier: GPL-3.0

pragma solidity >=0.7.0 <0.9.0;

import "./LotteryTicket.sol";
import "./TLToken.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract LotteryContract is Ownable {

    mapping (address => uint) public balance;
    TLToken public erc20;
    LotteryTicket public erc721;
    uint public beginTime;
    uint public createTimeInWeek;
    uint public lotteryNo;
    uint public ticketNo;
    Lottery[] public lotteries;
    Ticket[] public tickets;
    uint public difficulty;

    struct Ticket {
        bytes32 revealHash;
        uint revealedNumber;
        bool revealed;
        bool redeemed;
        bool refunded;
        uint lotteryno;
    }

    struct Lottery {
        uint winner;
        uint startTime;
        uint firstTicketNo;
        uint lastTicketNo;
        uint totalMoney;
    }
    
    modifier purchaseStage() {	
        if (block.timestamp - beginTime > 7 days) {
            beginTime += 7 days;
            lotteryNo += 1;
            Lottery storage lottery = lotteries.push();
            lottery.startTime = beginTime;
        }
        require(block.timestamp-beginTime < 4 days, "Purchase stage is over");
        _;
    }

    modifier revealStage() {	
        require(block.timestamp-beginTime > 4 days && block.timestamp-beginTime < 7 days, "It is not reveal stage");
        _;
    }

    modifier currentLottery(uint ticketno) {	
        require(tickets[ticketno-1].lotteryno == lotteryNo, "Current lottery does not match");
        _;
    }

    modifier revealNumberCheck(uint ticketno, uint rnd_number, bytes32 commitment_key) {
        require(tickets[ticketno-1].revealHash == keccak256(abi.encodePacked(rnd_number, commitment_key)), "Random numbers does not match");
        _;
    }

    modifier notRevealed(uint ticket_no) {	
        require(tickets[ticket_no-1].revealed == false, "Ticket already revealed");
        _;
    }

    modifier isRevealed(uint ticket_no) {	
        require(tickets[ticket_no-1].revealed == true, "Ticket is not revealed");
        _;
    }

    modifier notRefunded(uint ticket_no) {	
        require(tickets[ticket_no-1].refunded == false, "Ticket already refunded");
        _;
    }

    modifier notRedeemed(uint ticket_no) {	
        require(tickets[ticket_no-1].redeemed == false, "Ticket already redeemed");
        _;
    }

    modifier lotteryNotEnded(uint ticket_no) {	
        require(block.timestamp < (lotteries[tickets[ticket_no-1].lotteryno - 1].startTime + 7 days), "Lottery is ended - cannot refund");
        _;
    }

    modifier onlyCheckLotteryEndedTicket(uint ticket_no) {
        require(block.timestamp > (lotteries[tickets[ticket_no-1].lotteryno - 1].startTime + 7 days), "Lottery is not ended");
        _;
    }

    modifier onlyCheckLotteryEndedLottery(uint lottery_no) {	
        require(block.timestamp > (lotteries[lottery_no-1].startTime + 7 days), "Lottery is not ended");
        _;
    }

    modifier balanceCheck(uint amnt) {	
        require(balance[msg.sender] >= amnt, "Balance is not enough");
        _;
    }

    modifier ticketOwner(uint ticket_no) {	
        require(msg.sender == erc721.ownerOf(ticket_no), "Sender is not owner");
        _;
    }

    modifier positive(uint i) {	
        require(i > 0, "Please provide a positive number");
        _;
    }

    constructor(address _erc20ContractAddress, address _erc721ContractAddress) {
        erc20 = TLToken(_erc20ContractAddress);
        erc721 = LotteryTicket(_erc721ContractAddress);
        beginTime = block.timestamp;
        createTimeInWeek = beginTime / 604800;
        lotteryNo = 1;
        ticketNo = 1;
        Lottery storage lottery = lotteries.push();
        lottery.startTime = beginTime;
        difficulty = 2 ** 20;
    }

    // Sets the difficulty of the lottery. It is only executable by the owner of this contract
    function setDifficulty(uint _difficulty) public onlyOwner {
        difficulty = _difficulty;
    }

    // Buys the ticket with given hash
    function buyTicket(bytes32 hash_rnd_number) public purchaseStage balanceCheck(10)
        returns (uint ticketNumber) {

        balance[msg.sender] -= 10;

        erc721.createTicket(msg.sender, ticketNo);
        
        lotteries[lotteryNo-1].totalMoney += 10;

        if (lotteries[lotteryNo-1].firstTicketNo == 0) {
            lotteries[lotteryNo-1].firstTicketNo = ticketNo;
        }
        lotteries[lotteryNo-1].lastTicketNo = ticketNo;

        tickets.push(Ticket({
            revealHash : hash_rnd_number,
            revealedNumber : 0,
            revealed : false,
            redeemed : false,
            refunded : false,
            lotteryno : lotteryNo
        }));
        ticketNumber = ticketNo;
        ticketNo += 1;
    }

    // Deposits money to the contract
    function depositTL(uint amnt) public {
        erc20.transferFrom(msg.sender, address(this), amnt);
        balance[msg.sender] += amnt;
    }

    // Withdraws money from the contract
    function withdrawTL(uint amnt) public balanceCheck(amnt) {
        erc20.transfer(msg.sender, amnt);
        balance[msg.sender] -= amnt;
    }

    // Refunds the given ticket
    function collectTicketRefund(uint ticket_no) public ticketOwner(ticket_no) lotteryNotEnded(ticket_no) notRefunded(ticket_no) notRevealed(ticket_no) {
        balance[msg.sender] += 5;
        lotteries[tickets[ticket_no-1].lotteryno-1].totalMoney -= 5;
        tickets[ticket_no-1].refunded = true;
    }

    // Reveals the random number of the given ticket
    function revealRndNumber(uint ticketno, uint rnd_number, bytes32 commitment_key) public ticketOwner(ticketno) revealStage currentLottery(ticketno) revealNumberCheck(ticketno, rnd_number, commitment_key) notRefunded(ticketno) notRevealed(ticketno) {
        tickets[ticketno-1].revealed = true;
        tickets[ticketno-1].revealedNumber = rnd_number;
        rnd_number = rnd_number % difficulty;
        lotteries[lotteryNo-1].winner ^= rnd_number;
    }

    // Gets the number and status of the last ticket that is owned by the msg.sender
    function getLastOwnedTicketNo(uint lottery_no) public view returns(uint ticket_no, uint8 status) {
        uint ticketBalance = erc721.balanceOf(msg.sender);
        require(ticketBalance > 0, "There is no owned ticket");

        uint foundTicket = 0;
        uint firstTicketNo = lotteries[lottery_no-1].firstTicketNo;
        uint lastTicketNo = lotteries[lottery_no-1].lastTicketNo;

        for (uint j = firstTicketNo; j < lastTicketNo+1; j++) {
            if (msg.sender == erc721.ownerOf(j)) {
                foundTicket = j;
            }
        }
        require(foundTicket != 0, "There is no owned ticket in this lottery");

        ticket_no = foundTicket;

        Ticket memory ticket = tickets[foundTicket-1];
        if (ticket.refunded == true) {
            status = 0;
        } else if (ticket.redeemed == true) {
            status = 1;
        } else if (ticket.revealed == true) {
            status = 2;
        } else {
            status = 3;
        }
        
    }

    // Gets the number and status of the ith ticket that is owned by the msg.sender
    function getIthOwnedTicketNo(uint i,uint lottery_no) public view positive(i) returns(uint ticket_no, uint8 status) {
        uint ticketBalance = erc721.balanceOf(msg.sender);
        require(ticketBalance > 0, "There is no owned ticket");

        uint foundNumber = 0;
        uint foundTicket = 0;
        uint firstTicketNo = lotteries[lottery_no-1].firstTicketNo;
        uint lastTicketNo = lotteries[lottery_no-1].lastTicketNo;

        for (uint j = firstTicketNo; j < lastTicketNo+1; j++) {
            if (msg.sender == erc721.ownerOf(j)) {
                foundNumber += 1;
            }
            if (foundNumber == i) {
                foundTicket = j;
                break;
            }
        }
        require(foundNumber == i, "There is no ith ticket in this lottery");

        ticket_no = foundTicket;

        Ticket memory ticket = tickets[foundTicket-1];
        if (ticket.refunded == true) {
            status = 0;
        } else if (ticket.redeemed == true) {
            status = 1;
        } else if (ticket.revealed == true) {
            status = 2;
        } else {
            status = 3;
        }
    }

    // Returns the amount of money the ticket won
    function checkIfTicketWon(uint ticket_no) public view onlyCheckLotteryEndedTicket(ticket_no) notRefunded(ticket_no) isRevealed(ticket_no) returns (uint amount) {
        uint number = tickets[ticket_no-1].revealedNumber;
        number = number % difficulty;
        uint winner = lotteries[tickets[ticket_no-1].lotteryno-1].winner;
        uint lotteryMoney = lotteries[tickets[ticket_no-1].lotteryno-1].totalMoney;

        while (lotteryMoney != 0) {
            if (number == winner) {
                amount += (lotteryMoney / 2) + (lotteryMoney % 2);
            }
            lotteryMoney /= 2;
            winner = getHashedWinner(winner);
        }
    }

    // Collects the reward of the given ticket
    function collectTicketPrize(uint ticket_no) public ticketOwner(ticket_no) onlyCheckLotteryEndedTicket(ticket_no) notRefunded(ticket_no) notRedeemed(ticket_no) isRevealed(ticket_no) {
        uint amount = checkIfTicketWon(ticket_no);
        tickets[ticket_no-1].redeemed = true;
        balance[msg.sender] += amount;
    }

    // Returns the ticket number that won ith prize and the ticket's reward
    function getIthWinningTicket(uint i, uint lottery_no) public view positive(i) onlyCheckLotteryEndedLottery(lottery_no) returns (uint ticket_no,uint amount) {
        uint winner = lotteries[lottery_no-1].winner;
        uint lotteryMoney = lotteries[lottery_no-1].totalMoney;

        uint iteration = 1;
        while (lotteryMoney != 0) {
            if (i == iteration) {
                break;
            }
            lotteryMoney /= 2;
            winner = getHashedWinner(winner);
            iteration += 1;
        }
        require(i == iteration, "There is no ith winning number");

        uint foundTicket = 0;
        uint firstTicketNo = lotteries[lottery_no-1].firstTicketNo;
        uint lastTicketNo = lotteries[lottery_no-1].lastTicketNo;

        for (uint j = firstTicketNo; j < lastTicketNo+1; j++) {
            Ticket memory ticket = tickets[j-1];
            if (ticket.revealed == true && ticket.refunded == false && ticket.revealedNumber == winner) {
                foundTicket = j;
                break;
            }
        }
        require(foundTicket != 0, "No winning ticket found");

        return (foundTicket, checkIfTicketWon(foundTicket));
    }

    // Returns lottery number
    function getLotteryNo(uint unixtimeinweek) public view returns (uint lottery_no) {
        lottery_no = unixtimeinweek - createTimeInWeek + 1;
    }

    // Returns total money collected by given lottery
    function getTotalLotteryMoneyCollected(uint lottery_no) public view returns (uint amount) {
        amount = lotteries[lottery_no-1].totalMoney;
    }

    // Creates hash that will be used to pass "buyTicket" function
    function createHash(uint random_number, bytes32 commitment_key) public pure positive(random_number)
        returns (bytes32 hash) {
        hash = keccak256(abi.encodePacked(random_number, commitment_key));
    }

    // Checks whether "revealHash" is remembered correctly by the user
    function checkCommitmentKey(uint ticket_no, uint random_number, bytes32 commitment_key) public view ticketOwner(ticket_no) 
        returns (bool) {
        return tickets[ticket_no-1].revealHash == keccak256(abi.encodePacked(random_number, commitment_key));
    }

    // Calculates new winner
    function getHashedWinner(uint number) public view 
        returns (uint newNumber) {
        newNumber = uint(keccak256(abi.encodePacked(number))) % difficulty;
    }

}