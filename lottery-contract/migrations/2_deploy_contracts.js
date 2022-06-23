const TLToken = artifacts.require("TLToken");
const LotteryTicket = artifacts.require("LotteryTicket");
const LotteryContract = artifacts.require("LotteryContract");

module.exports = function(deployer) {
  deployer.then(async () => {
    await deployer.deploy(TLToken, 2**32-1);
    await deployer.deploy(LotteryTicket);
    await deployer.deploy(LotteryContract, TLToken.address, LotteryTicket.address);
    const lotteryTicket = await LotteryTicket.deployed();
    await lotteryTicket.setLotteryContract(LotteryContract.address);
  });
};
