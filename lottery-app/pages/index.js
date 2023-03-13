import Head from 'next/head'
import { useEffect, useState } from 'react'
import Web3 from 'web3'
import 'bulma/css/bulma.css'
import styles from '../styles/Lottery.module.css'
import tlTokenContractHandler from '../blockchain/tl-token'
import lotteryTicketContractHandler from '../blockchain/lottery-ticket'
import lotteryContractHandler from '../blockchain/lottery'
import { OneInputButton } from '../buttons/one-input-button'
import { TwoInputButton } from '../buttons/two-input-button'
import { ThreeInputButton } from '../buttons/three-input-button'

const Lottery = () => {

    var tlTokenAddress = "0x14C33bEda2f357D4145f0E1EE01c96B78d63091B"
    var lotteryTicketAddress = "0xd84478B587cf65782Cf30C36cE293966Fb61C3a2"
    var lotteryAddress = "0x5E2fFec424e145f564F501a88AF03f30937F5357"

    const [web3, setWeb3] = useState(null)
    const [tlTokenContract, setTlTokenContract] = useState(null)
    const [lotteryTicketContract, setLotteryTicketContract] = useState(null)
    const [lotteryContract, setLotteryContract] = useState(null)
    const [myAccount, setMyAccount] = useState(null)
    const [myBalance, setMyBalance] = useState('')
    const [myAllowance, setMyAllowance] = useState('')
    const [myTicketBalance, setMyTicketBalance] = useState('')
    const [myLotteryBalance, setMyLotteryBalance] = useState('')
    const [lotteryNo, setLotteryNo] = useState('')
    const [lotteryStatus, setLotteryStatus] = useState('')
    
    const connectWallet = async () => {
        // Checking MetaMask
        if (typeof window !== undefined && window.ethereum !== undefined) {
            try {
                // Request connect to wallet
                await window.ethereum.request({method:"eth_requestAccounts"})

                web3 = new Web3(window.ethereum)
                setWeb3(web3)

                const accounts = await web3.eth.getAccounts()
                setMyAccount(accounts[0])

                const tlToken = await tlTokenContractHandler(web3, tlTokenAddress)
                setTlTokenContract(tlToken)

                const lotteryTicket = await lotteryTicketContractHandler(web3, lotteryTicketAddress)
                setLotteryTicketContract(lotteryTicket)

                const lottery = await lotteryContractHandler(web3, lotteryAddress)
                setLotteryContract(lottery)

            } catch (err) {
                console.log(err.message)
            }
        } else {
            alert("Please install MetaMask")
        }
    }
    
    // Runs when page loaded
    useEffect(() => {
        if (tlTokenContract !== null) tLTokenHandler()
        if (lotteryTicketContract !== null) lotteryTicketHandler()
        if (lotteryContract !== null) lotteryHandler()
    }, [tlTokenContract, lotteryTicketContract, lotteryContract])

    const tLTokenHandler = async () => {
        setMyBalance(await tlTokenContract.methods.balanceOf(myAccount).call())
        setMyAllowance(await tlTokenContract.methods.allowance(myAccount, lotteryAddress).call())
    }

    const lotteryTicketHandler = async () => {
        setMyTicketBalance(await lotteryTicketContract.methods.balanceOf(myAccount).call())
    }

    const lotteryHandler = async () => {
        setMyLotteryBalance(await lotteryContract.methods.balance(myAccount).call())
        let lot = await lotteryContract.methods.lotteryNo().call()
        setLotteryNo(lot)
        let lotInfo = await lotteryContract.methods.lotteries(lot-1).call()
        let now = new Date()
        let lotTime = new Date(lotInfo.startTime*1000)
        var days = Math.ceil((now.getTime() - lotTime.getTime())/ (1000 * 3600 * 24));
        if (days <= 4) {
            setLotteryStatus("Purchase Stage")
        } else if (days <= 7) {
            setLotteryStatus("Reveal Stage")
        } else {
            setLotteryStatus("Finished")
        }
    }

    // TL Token Functions
    const transferTlTokenClicked = async (address, amount) => {
        return (await tlTokenContract.methods.transfer(address, amount).send({
            from: myAccount
        }))
    }

    const increaseAllowanceClicked = async (amount) => {
        let val = (await tlTokenContract.methods.increaseAllowance(lotteryAddress, amount).send({
            from: myAccount
        }))
        setMyAllowance(await tlTokenContract.methods.allowance(myAccount, lotteryAddress).call())
        return val
    }

    const decreaseAllowanceClicked = async (amount) => {
        let val = (await tlTokenContract.methods.decreaseAllowance(lotteryAddress, amount).send({
            from: myAccount
        }))
        setMyAllowance(await tlTokenContract.methods.allowance(myAccount, lotteryAddress).call())
        return val
    }

    const getAllowanceClicked = async (address) => {
        return (await tlTokenContract.methods.allowance(address, lotteryAddress).call())
    }

    const getBalanceClicked = async (address) => {
        return (await tlTokenContract.methods.balanceOf(address).call())
    }

    // Lottery Ticket Functions
    const transferLotteryTicketClicked = async (address, id) => {
        let val = (await lotteryTicketContract.methods.safeTransferFrom(myAccount, address, id).send({
            from: myAccount
        }))
        setMyTicketBalance(await lotteryTicketContract.methods.balanceOf(myAccount).call())
        return val
    }
    
    const getOwnerOfLotteryTicketClicked = async (id) => {
        return (await lotteryTicketContract.methods.ownerOf(id).call())
    }
    
    const getLotteryTicketBalanceClicked = async (address) => {
        return (await lotteryTicketContract.methods.balanceOf(address).call())
    }

    // Lottery Functions
    const depositTLtoLotteryClicked = async (amount) => {
        let val = (await lotteryContract.methods.depositTL(amount).send({
            from: myAccount
        }))
        setMyBalance(await tlTokenContract.methods.balanceOf(myAccount).call())
        setMyAllowance(await tlTokenContract.methods.allowance(myAccount, lotteryAddress).call())
        setMyLotteryBalance(await lotteryContract.methods.balance(myAccount).call())
        return val
    }

    const withdrawTLfromLotteryClicked = async (amount) => {
        let val = (await lotteryContract.methods.withdrawTL(amount).send({
            from: myAccount
        }))
        setMyBalance(await tlTokenContract.methods.balanceOf(myAccount).call())
        setMyAllowance(await tlTokenContract.methods.allowance(myAccount, lotteryAddress).call())
        setMyLotteryBalance(await lotteryContract.methods.balance(myAccount).call())
        return val
    }

    const buyTicketClicked = async (hashRandomNumber) => {
        let val = (await lotteryContract.methods.buyTicket(hashRandomNumber).send({
            from: myAccount
        }))
        setMyTicketBalance(await lotteryTicketContract.methods.balanceOf(myAccount).call())
        setMyLotteryBalance(await lotteryContract.methods.balance(myAccount).call())
        let lot = await lotteryContract.methods.lotteryNo().call()
        setLotteryNo(lot)
        let lotInfo = await lotteryContract.methods.lotteries(lot-1).call()
        let now = new Date()
        let lotTime = new Date(lotInfo.startTime*1000)
        var days = Math.ceil((now.getTime() - lotTime.getTime())/ (1000 * 3600 * 24));
        if (days <= 4) {
            setLotteryStatus("Purchase Stage")
        } else if (days <= 7) {
            setLotteryStatus("Reveal Stage")
        } else {
            setLotteryStatus("Finished")
        }
        return val
    }

    const collectTicketRefundClicked = async (id) => {
        let val = (await lotteryContract.methods.collectTicketRefund(id).send({
            from: myAccount
        }))
        setMyLotteryBalance(await lotteryContract.methods.balance(myAccount).call())
        return val
    }

    const collectTicketPrizeClicked = async (id) => {
        let val = (await lotteryContract.methods.collectTicketPrize(id).send({
            from: myAccount
        }))
        setMyLotteryBalance(await lotteryContract.methods.balance(myAccount).call())
        return val
    }

    const revealRndNumberClicked = async (id, hashRandomNumber, commitmentKey) => {
        return (await lotteryContract.methods.revealRndNumber(id, hashRandomNumber, commitmentKey).send({
            from: myAccount
        }))
    }

    const getLotteryInfoClicked = async (lotteryNo) => {
        return (await lotteryContract.methods.lotteries(lotteryNo-1).call())
    }

    const getTicketInfoClicked = async (id) => {
        return (await lotteryContract.methods.tickets(id-1).call())
    }

    const getLotteryBalanceClicked = async (address) => {
        return (await lotteryContract.methods.balance(address).call())
    }

    const checkIfTicketWonClicked = async (id) => {
        return (await lotteryContract.methods.checkIfTicketWon(id).call())
    }
    
    const getIthOwnedTicketNoClicked = async (i, lotteryNo) => {
        return (await lotteryContract.methods.getIthOwnedTicketNo(i, lotteryNo).call({
            from: myAccount
        }))
    }

    const getLastOwnedTicketNoClicked = async (lotteryNo) => {
        return (await lotteryContract.methods.getLastOwnedTicketNo(lotteryNo).call({
            from: myAccount
        }))
    }

    const getIthWinningTicketClicked = async (i, lotteryNo) => {
        return (await lotteryContract.methods.getIthWinningTicket(i, lotteryNo).call())
    }

    const getLotteryNoUnixClickked = async (unixTimeInWeek) => {
        return (await lotteryContract.methods.getLotteryNo(unixTimeInWeek).call())
    }

    const getTotalLotteryMoneyCollectedClicked = async (lotteryNo) => {
        return (await lotteryContract.methods.getTotalLotteryMoneyCollected(lotteryNo).call())
    }

    const createHashClicked = async (randomNumber, commitmentKey) => {
        return (await lotteryContract.methods.createHash(randomNumber, commitmentKey).call())
    }

    const checkCommitmentKeyClicked = async (id, randomNumber, commitmentKey) => {
        return (await lotteryContract.methods.checkCommitmentKey(id, randomNumber, commitmentKey).call({
            from: myAccount
        }))
    }

    return (
        <div className={styles.main}>
            <Head>
                <title>Lottery</title>
                <meta name="description" content="A blockchain application for a lottery contract" />
            </Head>
            <nav className="navbar mt-5 mb-5 ml-5">
                <div className="container">
                    <div className="navbar-brand">
                        <h1>Lottery (Bloxberg)</h1>
                    </div>
                    <div className="navbar-end">
                        <button onClick={connectWallet} className="button is-primary">Connect Wallet</button>
                    </div>
                </div>
            </nav>
            <section>
                <div className="container">
                    <h2>To use this lottery, TL Token should be sent to you from bank account.</h2>
                </div>
            </section>
            <section>
                <div className="container">
                    <h2>TL Token Contract Address: {tlTokenAddress}</h2>
                </div>
            </section>
            <section>
                <div className="container">
                    <h2>Lottery Ticket Contract Address: {lotteryTicketAddress}</h2>
                </div>
            </section>
            <section>
                <div className="container">
                    <h2>Lottery Contract Address: {lotteryAddress}</h2>
                </div>
            </section>
            <section>
                <div className="container">
                    <h2>My Account Address: {myAccount}</h2>
                </div>
            </section>
            <section>
                <div className="container">
                    <h2>My TL Token Balance: {myBalance}</h2>
                </div>
            </section>
            <section>
                <div className="container">
                    <h2>My TL Token Allowance: {myAllowance}</h2>
                </div>
            </section>
            <section>
                <div className="container">
                    <h2>My Ticket Balance: {myTicketBalance}</h2>
                </div>
            </section>
            <section>
                <div className="container">
                    <h2>My Lottery Balance: {myLotteryBalance}</h2>
                </div>
            </section>
            <section>
                <div className="container">
                    <h2>Current Lottery Number: {lotteryNo}</h2>
                </div>
            </section>
            <section>
                <div className="container">
                    <h2>Lottery Status: {lotteryStatus}</h2>
                </div>
            </section>
            <section>
                <div className="container mt-5">
                    <h1>TL Token Contract Functions</h1>
                </div>
            </section>
            <TwoInputButton
                web3={web3}
                label="Transfer TL Token"
                clickFunction={transferTlTokenClicked}
                buttonName="Transfer"
                placeHolderOne="Enter account address that tokens will be transferred to"
                placeHolderTwo="Enter amount"
                output="Transaction Hash"
                type="send"
            />
            <OneInputButton
                web3={web3}
                label="Increase TL Token Allowance of Lottery"
                clickFunction={increaseAllowanceClicked}
                buttonName="Increase Allowance"
                placeHolder="Enter allowance amount"
                output="Transaction Hash"
                type="send"
            />
            <OneInputButton
                web3={web3}
                label="Decrease TL Token Allowance of Lottery"
                clickFunction={decreaseAllowanceClicked}
                buttonName="Decrease Allowance"
                placeHolder="Enter allowance amount"
                output="Transaction Hash"
                type="send"
            />
            <OneInputButton
                web3={web3}
                label="Get Allowance of Lottery"
                clickFunction={getAllowanceClicked}
                buttonName="Get Allowance"
                placeHolder="Enter account address"
                output="Allowance"
                type="call"
            />
            <OneInputButton 
                web3={web3}
                label="Get TL Token Balance"
                clickFunction={getBalanceClicked}
                buttonName="Get Balance"
                placeHolder="Enter account address"
                output="Balance"
                type="call"
            />
            <section>
                <div className="container mt-5">
                    <h1>Lottery Ticket Contract Functions</h1>
                </div>
            </section>
            <TwoInputButton
                web3={web3}
                label="Transfer Lottery Ticket"
                clickFunction={transferLotteryTicketClicked}
                buttonName="Transfer"
                placeHolderOne="Enter account address that ticket will be transferred to"
                placeHolderTwo="Enter ticket id"
                output="Transaction Hash"
                type="send"
            />
            <OneInputButton 
                web3={web3}
                label="Get Owner of Lottery Ticket"
                clickFunction={getOwnerOfLotteryTicketClicked}
                buttonName="Get Owner"
                placeHolder="Enter ticket id"
                output="Owner Address"
                type="call"
            />
            <OneInputButton 
                web3={web3}
                label="Get Lottery Ticket Balance"
                clickFunction={getLotteryTicketBalanceClicked}
                buttonName="Get Balance"
                placeHolder="Enter account address"
                output="Balance"
                type="call"
            />
            <section>
                <div className="container mt-5">
                    <h1>Lottery Contract Functions</h1>
                </div>
            </section>
            <OneInputButton
                web3={web3}
                label="Deposit TL to Lottery"
                clickFunction={depositTLtoLotteryClicked}
                buttonName="Deposit TL"
                placeHolder="Enter deposit amount"
                output="Transaction Hash"
                type="send"
            />
            <OneInputButton
                web3={web3}
                label="Withdraw TL from Lottery"
                clickFunction={withdrawTLfromLotteryClicked}
                buttonName="Withdraw TL"
                placeHolder="Enter withdraw amount"
                output="Transaction Hash"
                type="send"
            />
            <OneInputButton
                web3={web3}
                label="Buy Ticket"
                clickFunction={buyTicketClicked}
                buttonName="Buy Ticket"
                placeHolder="Enter hash random number"
                output="Transaction Hash"
                type="send"
            />
            <OneInputButton
                web3={web3}
                label="Collect Ticket Refund"
                clickFunction={collectTicketRefundClicked}
                buttonName="Collect Refund"
                placeHolder="Enter ticket id"
                output="Transaction Hash"
                type="send"
            />
            <OneInputButton
                web3={web3}
                label="Collect Ticket Prize"
                clickFunction={collectTicketPrizeClicked}
                buttonName="Collect Prize"
                placeHolder="Enter ticket id"
                output="Transaction Hash"
                type="send"
            />
            <ThreeInputButton
                web3={web3}
                label="Reveal Random Number"
                clickFunction={revealRndNumberClicked}
                buttonName="Reveal"
                placeHolderOne="Enter ticket id"
                placeHolderTwo="Enter random number"
                placeHolderThree="Enter commitment key"
                output="Transaction Hash"
                type="send"
            />
            <OneInputButton
                web3={web3}
                label="Get Lottery Info"
                clickFunction={getLotteryInfoClicked}
                buttonName="Get Info"
                placeHolder="Enter lottery no"
                output="Lottery Info"
                type="object"
            />
            <OneInputButton
                web3={web3}
                label="Get Ticket Info"
                clickFunction={getTicketInfoClicked}
                buttonName="Get Info"
                placeHolder="Enter ticket id"
                output="Ticket Info"
                type="object"
            />
            <OneInputButton
                web3={web3}
                label="Get Lottery Balance"
                clickFunction={getLotteryBalanceClicked}
                buttonName="Get Balance"
                placeHolder="Enter account address"
                output="Balance"
                type="call"
            />
            <OneInputButton
                web3={web3}
                label="Check Ticket Prize"
                clickFunction={checkIfTicketWonClicked}
                buttonName="Check Prize"
                placeHolder="Enter ticket id"
                output="Prize"
                type="call"
            />
            <TwoInputButton
                web3={web3}
                label="Get Ith Owned Ticket"
                clickFunction={getIthOwnedTicketNoClicked}
                buttonName="Get Ticket"
                placeHolderOne="Enter ith number"
                placeHolderTwo="Enter lottery no"
                output="Ticket Info"
                type="object"
            />
            <OneInputButton
                web3={web3}
                label="Get Last Owned Ticket"
                clickFunction={getLastOwnedTicketNoClicked}
                buttonName="Get Ticket"
                placeHolder="Enter lottery no"
                output="Ticket Info"
                type="object"
            />
            <TwoInputButton
                web3={web3}
                label="Get Ith Winning Ticket"
                clickFunction={getIthWinningTicketClicked}
                buttonName="Get Ticket"
                placeHolderOne="Enter ith number"
                placeHolderTwo="Enter lottery no"
                output="Ticket Info"
                type="object"
            />
            <OneInputButton
                web3={web3}
                label="Get Lottery Number"
                clickFunction={getLotteryNoUnixClickked}
                buttonName="Get Lottery No"
                placeHolder="Enter time in unix week"
                output="Lottery No"
                type="call"
            />
            <OneInputButton
                web3={web3}
                label="Get Total Lottery Money Collected"
                clickFunction={getTotalLotteryMoneyCollectedClicked}
                buttonName="Get Money"
                placeHolder="Enter time lottery no"
                output="Total Lottery Money"
                type="call"
            />
            <TwoInputButton
                web3={web3}
                label="Create Hash"
                clickFunction={createHashClicked}
                buttonName="Create Hash"
                placeHolderOne="Enter random number"
                placeHolderTwo="Enter commitment key as hash (ex: 0x5891b5b522d5df086d0ff0b110fbd9d21bb4fc7163af34d08286a2e846f6be03)"
                output="Hash Random Number"
                type="call"
            />
            <ThreeInputButton
                web3={web3}
                label="Check Commitment Key"
                clickFunction={checkCommitmentKeyClicked}
                buttonName="Check Key"
                placeHolderOne="Enter ticket id"
                placeHolderTwo="Enter random number"
                placeHolderThree="Enter commitment key"
                output="Status"
                type="call"
            />
        </div>
    )
}

export default Lottery