const { BN, constants } = require('@openzeppelin/test-helpers');
const { web3 } = require('@openzeppelin/test-helpers/src/setup');
const { ethers } = require("ethers")
const { parseFixed } = require("@ethersproject/bignumber")

async function getBalances(accounts) {
    return await Promise.all(
        accounts.map(async account =>  {
            return web3.eth.getBalance(account);
        })
    );
}

async function totalPnl(address, initValue, receipts, unit) {
    let calcGas = receipts ? await getGasCost(receipts) : new BN('0');
    let balanceWei = await web3.eth.getBalance(address);
    const totalWei = (web3.utils.toBN(balanceWei).sub(new BN(initValue)).add(calcGas)).toString();

    if (!unit){
        unit = "ether";
        return await web3.utils.fromWei(totalWei);
    }
    
    return totalWei;
}

/**
 * 
 * @param {*} etherNumber as number or string
 * @returns 
 */
function toWei(etherNumber) {
    return web3.utils.toWei(etherNumber , 'ether');
}

/**
 * 
 * @param {*} receipt 
 * @return web3.utils.BN
 */
async function getGasCost(receipts) {
    let totalGasCost = new BN('0');
    for (const receipt of receipts) {
        const tx = await web3.eth.getTransaction(receipt.tx);
        const gasPrice = tx.gasPrice;
        const result = new BN(gasPrice).mul(new BN(receipt.receipt.gasUsed));
        totalGasCost = totalGasCost.add(result);
    }

    return totalGasCost;
}

async function generateSignature(types, values, signer) {
    let msg = web3.utils.keccak256(
        web3.eth.abi.encodeParameters(types, values)
    );
    let signature = await web3.eth.sign(msg, signer);
    return ethers.utils.splitSignature(signature);
}

function decimalsRepresentation(number, nrOfDecimals) {
    return parseFixed(number, nrOfDecimals.toString()).toString()
}

function convertedDecimalsRepresentation(number, fromNrOfDecimals, toNrOfDecimals) {
    return new BN(number).mul(new BN(10 ** toNrOfDecimals)).div(new BN(10 ** fromNrOfDecimals))
}

const marketplaceSignatureTypes = ["address", "address", "uint256", "address", "address", "uint256", "address", "uint256", "uint256", "uint256"]
const autenticaERC721SignatureTypes = ["address", "address", "uint256", "uint256", "uint256"]

const dummyAddress = '0x0000000000000000000000000000000000000001'
const dummySignature = {v: 0, r: constants.ZERO_BYTES32, s: constants.ZERO_BYTES32}

const dummyTokenAddresses = [
    '0x0000000000000000000000000000000000000001',
    '0x0000000000000000000000000000000000000002',
    '0x0000000000000000000000000000000000000003',
]

module.exports = {
    getBalances,
    totalPnl,
    toWei,
    getGasCost,
    generateSignature,
    decimalsRepresentation,
    convertedDecimalsRepresentation,
    marketplaceSignatureTypes,
    autenticaERC721SignatureTypes,
    dummyAddress,
    dummySignature,
    dummyTokenAddresses
}