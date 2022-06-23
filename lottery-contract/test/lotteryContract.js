const TLToken = artifacts.require("TLToken");
const LotteryTicket = artifacts.require("LotteryTicket");
const LotteryContract = artifacts.require("LotteryContract");
const { time, expectRevert } = require('@openzeppelin/test-helpers');
const { assert } = require('console');
const { createHash } = require('crypto');

function getBaseLog(x, y) {
    return Math.log(y) / Math.log(x);
}

var transferTL = 10;        // transferTL/10 amount ticket will be bought by every account
var difficulty = 2 ** 7;    // The probability of winning the prize is 1/difficulty
var ticketAmount = 0;
var winnerNumber = 0;
var winners = new Array();
var firstWinningTicket = 0;
var errorTypes = {
    insufficientAllowance   : "ERC20: insufficient allowance",
    balanceNotEnough        : "Balance is not enough",
    purchaseStage           : "Purchase stage is over",
    revealStage             : "It is not reveal stage",
    cannotRefund            : "Lottery is ended - cannot refund",
    refunded                : "Ticket already refunded",
    noWinning               : "There is no ith winning number"
};

contract('LotteryContract', (accounts) => {

    it('should unlock all accounts', async () => {   
        for (let i = 0; i < accounts.length; i++) {
            await web3.eth.personal.unlockAccount(accounts[i], '');
        }
    });

    it('should deploy LotteryContract properly and set difficulty', async () => {
        const lotteryContract = await LotteryContract.deployed();
        
        await lotteryContract.setDifficulty(difficulty);
        assert((await lotteryContract.difficulty()).toNumber() == difficulty);
        assert(lotteryContract.address !== '');
    });

    it('should deploy TLToken properly', async () => {
        const tlToken = await TLToken.deployed();
    
        assert((await tlToken.totalSupply()).toNumber() == 2**32-1);
        assert(tlToken.address !== '');
    });

    it('should deploy LotteryTicket properly', async () => {
        const lotteryTicket = await LotteryTicket.deployed();
        const lotteryContract = await LotteryContract.deployed();
        
        assert(lotteryContract.address == (await lotteryTicket.lotteryContract()));
        assert(lotteryTicket.address !== '');
    });

    it('should transfer ' + transferTL + ' TL to all accounts', async () => {
        const tlToken = await TLToken.deployed();
        const totalSupply = (await tlToken.totalSupply()).toNumber();

        for (let i = 1; i < accounts.length; i++) {
            await tlToken.transfer(accounts[i], transferTL+100);
        }
        assert((await tlToken.balanceOf(accounts[0])).toNumber() == totalSupply - (accounts.length-1)*(transferTL+100));
        assert(tlToken.address !== '');
    });

    it('should fail depositing because not approving', async () => {
        const lotteryContract = await LotteryContract.deployed();

        await expectRevert(lotteryContract.depositTL(500, {from: accounts[1]}), errorTypes.insufficientAllowance);
    });

    it('should deposit succesfully for all accounts', async () => {
        const lotteryContract = await LotteryContract.deployed();
        const tlToken = await TLToken.deployed();

        for (let i = 0; i < accounts.length; i++) {
            if (i == 0) {
                await tlToken.increaseAllowance(lotteryContract.address, 10 ** 3, {from: accounts[i]});
                await lotteryContract.depositTL(10 ** 3, {from: accounts[i]});
            } else if (i == 1) {
                await tlToken.increaseAllowance(lotteryContract.address, transferTL+100, {from: accounts[i]});
                await lotteryContract.depositTL(transferTL+100, {from: accounts[i]});
            } else {
                await tlToken.increaseAllowance(lotteryContract.address, transferTL, {from: accounts[i]});
                await lotteryContract.depositTL(transferTL, {from: accounts[i]});
            }
        }

        assert((await lotteryContract.balance(accounts[1])).toNumber() == transferTL+100);
    });

    it('should withdraw succesfully from first account', async () => {
        const lotteryContract = await LotteryContract.deployed();

        await lotteryContract.withdrawTL(100, {from: accounts[1]});

        assert((await lotteryContract.balance(accounts[1])).toNumber() == transferTL);
    });
    
    it('should fail withdraw if balance is not enough', async () => {
        const lotteryContract = await LotteryContract.deployed();

        await expectRevert(lotteryContract.withdrawTL(transferTL+1, {from: accounts[1]}), errorTypes.balanceNotEnough);
    });


    it('should buy ticket for every account', async () => {
        const lotteryContract = await LotteryContract.deployed();
        const lotteryTicket = await LotteryTicket.deployed();

        for (let i = 1; i < accounts.length; i++) {
            for (let j = 0; j < transferTL/10; j++) {
                // Normally, users can choose any commitment key they want. Here, this is used so that it is simple.
                let randomHash = await lotteryContract.createHash(i, '0x' + createHash('sha256').update(i.toString()).digest('hex'));
                await lotteryContract.buyTicket(randomHash, {from: accounts[i]});
                ticketAmount += 1;
            }
        }

        let hash = await lotteryContract.createHash((ticketAmount+1), '0x' + createHash('sha256').update((ticketAmount+1).toString()).digest('hex'));
        await lotteryContract.buyTicket(hash, {from: accounts[0]});
        hash = await lotteryContract.createHash((ticketAmount+2), '0x' + createHash('sha256').update((ticketAmount+2).toString()).digest('hex'));
        await lotteryContract.buyTicket(hash, {from: accounts[0]});
        ticketAmount += 2;

        assert((await lotteryContract.ticketNo()).toNumber() == accounts.length+2);
        assert((await lotteryTicket.balanceOf(accounts[1])).toNumber() == 1);
        assert((await lotteryTicket.balanceOf(accounts[0])).toNumber() == 2);
        assert((await lotteryContract.balance(accounts[1])).toNumber() == 0);
    });

    it('should get last ticket owned by account 0', async () => {
        const lotteryContract = await LotteryContract.deployed();

        // Lottery 1
        assert((await lotteryContract.getLastOwnedTicketNo(1)).ticket_no.toNumber() == accounts.length+1);
        // status is 3 because ticket is not revealed, redeemed or refunded
        assert((await lotteryContract.getLastOwnedTicketNo(1)).status.toNumber() == 3);
    });

    it('should get first ticket owned by account 0', async () => {
        const lotteryContract = await LotteryContract.deployed();

        // First ticket, Lottery 1
        assert((await lotteryContract.getIthOwnedTicketNo(1,1)).ticket_no.toNumber() == accounts.length);
        // status is 3 because ticket is not revealed, redeemed or refunded
        assert((await lotteryContract.getIthOwnedTicketNo(1,1)).status.toNumber() == 3);
    });

    it('should fail revealing if it is not reveal stage', async () => {
        const lotteryContract = await LotteryContract.deployed();

        let randomNumber = 1;
        await expectRevert(lotteryContract.revealRndNumber(1, randomNumber, '0x' + createHash('sha256').update(randomNumber.toString()).digest('hex'), {from: accounts[1]}), errorTypes.revealStage);
    });

    it('should advance time to reveal stage', async () => {
        const lotteryContract = await LotteryContract.deployed();
        await time.increase(time.duration.days(4));

        let randomNumber = 1;
        let randomHash = await lotteryContract.createHash(randomNumber, '0x' + createHash('sha256').update(randomNumber.toString()).digest('hex'));
        await expectRevert(lotteryContract.buyTicket(randomHash, {from: accounts[0]}), errorTypes.purchaseStage);
    });

    it('should refund a ticket', async () => {
        const lotteryContract = await LotteryContract.deployed();
        
        // Refund ticket with ticketNo 1.
        await lotteryContract.collectTicketRefund(1, {from: accounts[1]});
        assert((await lotteryContract.balance(accounts[1])).toNumber() == 5);
        assert((await lotteryContract.tickets(0)).refunded == true);
    });

    it('should reveal all tickets', async () => {
        const lotteryContract = await LotteryContract.deployed();

        for (let i = 1; i < accounts.length; i++) {
            for (let j = 0; j < transferTL/10; j++) {
                if (i == 1) {
                    await expectRevert(lotteryContract.revealRndNumber(i, i, '0x' + createHash('sha256').update(i.toString()).digest('hex'),{from: accounts[i]}), errorTypes.refunded);
                } else {
                    await lotteryContract.revealRndNumber(i, i, '0x' + createHash('sha256').update(i.toString()).digest('hex'),{from: accounts[i]});
                }
            }
        }
        await lotteryContract.revealRndNumber(accounts.length+1, ticketAmount, '0x' + createHash('sha256').update(ticketAmount.toString()).digest('hex'),{from: accounts[0]});
        assert((await lotteryContract.tickets(0)).revealed == false);
        assert((await lotteryContract.tickets(1)).revealed == true);
    });

    it('should advance time to new lottery', async () => {
        const lotteryContract = await LotteryContract.deployed();
        await time.increase(time.duration.days(3));

        var unixTimeInWeek = parseInt(Date.now()/1000/604800);
        assert((await lotteryContract.getLotteryNo(parseInt(unixTimeInWeek)+1)).toNumber() == 2);
    });

    it('should fail refunding a ticket if it belongs to previous lottery', async () => {
        const lotteryContract = await LotteryContract.deployed();

        await expectRevert(lotteryContract.collectTicketRefund(2, {from: accounts[2]}), errorTypes.cannotRefund);
    });

    it('should get first lottery information', async () => {
        const lotteryContract = await LotteryContract.deployed();

        for (let i = 2; i < accounts.length; i++) {
            winnerNumber ^= i % difficulty;
        }
        winnerNumber ^= ticketAmount % difficulty;
        assert((await lotteryContract.getTotalLotteryMoneyCollected(1)).toNumber() == (accounts.length+1)*10-5);
        assert((await lotteryContract.lotteries(0)).winner.toNumber() == winnerNumber);
        assert((await lotteryContract.lotteries(0)).lastTicketNo.toNumber() == accounts.length+1);
    });

    it('should get winning numbers', async () => {
        const lotteryContract = await LotteryContract.deployed();

        let totalMoney = (await lotteryContract.lotteries(0)).totalMoney.toNumber();
        let prizeNumber = Math.ceil(getBaseLog(2, totalMoney)) + 1;
        winners.push(winnerNumber);
        let newWinner = winnerNumber;
        for (let i = 1; i < prizeNumber; i++) {
            newWinner = (await lotteryContract.getHashedWinner(newWinner)).toNumber();
            winners.push(newWinner);
        }
    });

    it('should get first winning ticket', async () => {
        const lotteryContract = await LotteryContract.deployed();

        // First winning ticket, in first lottery
        firstWinningTicket = (await lotteryContract.getIthWinningTicket(1,1)).ticket_no.toNumber();

        // We can make this check because tickets' ID and random number are the same in this test
        if (winnerNumber > ticketAmount) {
            await expectRevert(lotteryContract.getIthWinningTicket(1,1), errorTypes.noWinning);
        } else {
            assert(firstWinningTicket == winnerNumber);
        }
    });

    it('should get first winning ticket\'s prize', async () => {
        const lotteryContract = await LotteryContract.deployed();

        // First winning ticket, in first lottery
        let ticketPrize = (await lotteryContract.checkIfTicketWon(firstWinningTicket)).toNumber();
        if (firstWinningTicket != 0) {
            assert(ticketPrize > 0);
        } else {
            assert(ticketPrize == 0);
        }
    });

    it('should collect first winning ticket\'s prize', async () => {
        const lotteryContract = await LotteryContract.deployed();

        await lotteryContract.collectTicketPrize(firstWinningTicket, {from: accounts[firstWinningTicket]});
        if (firstWinningTicket != 0) {
            assert((await lotteryContract.balance(accounts[firstWinningTicket])).toNumber() > 0);
        } else {
            assert((await lotteryContract.balance(accounts[firstWinningTicket])).toNumber() == 0);
        }
    });

    it('should trigger creation of new lottery', async () => {
        const lotteryContract = await LotteryContract.deployed();

        let hash = await lotteryContract.createHash((ticketAmount+1), '0x' + createHash('sha256').update((ticketAmount+1).toString()).digest('hex'));
        await lotteryContract.buyTicket(hash, {from: accounts[0]});

        assert((await lotteryContract.lotteryNo()).toNumber() == 2);
    });

});