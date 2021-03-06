import * as CryptoJS from 'crypto-js';
import { includes } from 'lodash';
import { getUnspentTxOuts } from './blockchain';
import { getTransactionPool } from './transactionPool';
import { getPublicKey } from './wallet';

class TxIn {
  public txOutId: string;
  public txOutIndex: number;
  public signature: string;
}

class TxOut {
  public address: string;
  public amount: number;

  constructor(address: string, amount: number) {
    this.address = address;
    this.amount = amount;
  }
}

class Transaction {
  public id: string;
  public txIns: TxIn[];
  public txOuts: TxOut[];
}

class UnspentTxOut {
  public txOutId: string;
  public txOutIndex: number;
  public address: string;
  public amount: number;

  constructor(
    txOutId: string,
    txOutIndex: number,
    address: string,
    amount: number
  ) {
    this.txOutId = txOutId;
    this.txOutIndex = txOutIndex;
    this.address = address;
    this.amount = amount;
  }
}

const toHexString = (byteArray): string => {
  return Array.from(byteArray, (byte: any) => {
    return ('0' + (byte & 0xff).toString(16)).slice(-2);
  }).join('');
};

const COINBASE_AMOUNT = 50;

const getCoinbaseTransaction = (
  address: string,
  blockIndex: number
): Transaction => {
  const t = new Transaction();
  const txIn: TxIn = new TxIn();
  txIn.signature = '';
  txIn.txOutId = '';
  txIn.txOutIndex = blockIndex;

  t.txIns = [txIn];
  t.txOuts = [new TxOut(address, COINBASE_AMOUNT)];
  t.id = getTransactionId(t);
  return t;
};

const updateUnspentTxOuts = (
  aTransactions: Transaction[],
  aUnspentTxOuts: UnspentTxOut[]
): UnspentTxOut[] => {
  const newUnspentTxOuts: UnspentTxOut[] = aTransactions
    .map((t) => {
      return t.txOuts.map(
        (txOut, index) =>
          new UnspentTxOut(t.id, index, txOut.address, txOut.amount)
      );
    })
    .reduce((a, b) => a.concat(b), []);

  const consumedTxOuts: UnspentTxOut[] = aTransactions
    .map((t) => t.txIns)
    .reduce((a, b) => a.concat(b), [])
    .map((txIn) => new UnspentTxOut(txIn.txOutId, txIn.txOutIndex, '', 0));

  const resultingUnspentTxOuts = aUnspentTxOuts
    .filter(
      (uTxO) => !findUnspentTxOut(uTxO.txOutId, uTxO.txOutIndex, consumedTxOuts)
    )
    .concat(newUnspentTxOuts);

  return resultingUnspentTxOuts;
};

const findUnspentTxOut = (
  transactionId: string,
  index: number,
  aUnspentTxOuts: UnspentTxOut[]
): UnspentTxOut => {
  return aUnspentTxOuts.find(
    (uTxO) => uTxO.txOutId === transactionId && uTxO.txOutIndex === index
  );
};

const getTransactionId = (transaction: Transaction): string => {
  const txInContent: string = transaction.txIns
    .map((txIn: TxIn) => txIn.txOutId + txIn.txOutIndex)
    .reduce((a, b) => a + b, '');

  const txOutContent: string = transaction.txOuts
    .map((txOut: TxOut) => txOut.address + txOut.amount)
    .reduce((a, b) => a + b, '');

  return CryptoJS.SHA256(txInContent + txOutContent).toString();
};

const getMyTransaction = (privateKey: string): Transaction[] => {
  const publicKey = getPublicKey(privateKey);
  const unspentTxOuts = getUnspentTxOuts();
  const txOutIndexes = unspentTxOuts
    .filter((txOut: UnspentTxOut) => txOut.address === publicKey)
    .map((txOut: UnspentTxOut) => txOut.txOutIndex);
  const transactionPool = getTransactionPool();
  const myTransaction = transactionPool.filter((transaction: Transaction) => {
    let isOk = false;
    transaction.txIns.map((txIn: TxIn) => {
      if (includes(txOutIndexes, txIn.txOutIndex)) {
        isOk = true;
      }
    });
    return isOk;
  });
  return myTransaction;
};

export {
  Transaction,
  UnspentTxOut,
  updateUnspentTxOuts,
  getCoinbaseTransaction,
  TxIn,
  TxOut,
  findUnspentTxOut,
  toHexString,
  getMyTransaction,
};
