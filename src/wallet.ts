import * as CryptoJS from 'crypto-js';
import { ec } from 'elliptic';
import { appendFile, readFileSync } from 'fs';
import { filter } from 'lodash';
import {
  Transaction,
  TxIn,
  UnspentTxOut,
  TxOut,
  findUnspentTxOut,
  toHexString,
} from './transaction';
import { getUnspentTxOuts } from './blockchain';

const EC = new ec('secp256k1');

const generatePrivateKey = (): string => {
  const keyPair = EC.genKeyPair();
  const privateKey = keyPair.getPrivate();
  return privateKey.toString(16);
};

const isExistPrivateKey = (privateKey: string): boolean => {
  let isExist = false;

  readFileSync('privateKeyFile.txt')
    .toString()
    .split('\n')
    .forEach(function (key) {
      if (key === privateKey) {
        isExist = true;
      }
    });

  return isExist;
};

const getPublicKey = (privateKey: string): string => {
  if (!isExistPrivateKey(privateKey)) return null;
  const key = EC.keyFromPrivate(privateKey, 'hex');
  return key.getPublic().encode('hex');
};

const initWallet = () => {
  const newPrivateKey = generatePrivateKey();

  appendFile('privateKeyFile.txt', newPrivateKey + '\n', (err) => {
    if (err) console.log(err);
  });
  return newPrivateKey;
};

const findUnspentTxOuts = (
  ownerAddress: string,
  unspentTxOuts: UnspentTxOut[]
) => {
  return filter(
    unspentTxOuts,
    (uTxO: UnspentTxOut) => uTxO.address === ownerAddress
  );
};

const findTxOutsForAmount = (
  amount: number,
  myUnspentTxOuts: UnspentTxOut[]
) => {
  let currentAmount = 0;
  const includedUnspentTxOuts = [];
  for (const myUnspentTxOut of myUnspentTxOuts) {
    includedUnspentTxOuts.push(myUnspentTxOut);
    currentAmount = currentAmount + myUnspentTxOut.amount;
    if (currentAmount >= amount) {
      const leftOverAmount = currentAmount - amount;
      return { includedUnspentTxOuts, leftOverAmount };
    }
  }
  return { includedUnspentTxOuts, leftOverAmount: currentAmount };
};

const createTxOuts = (
  receiverAddress: string,
  myAddress: string,
  amount,
  leftOverAmount: number
) => {
  const txOut1: TxOut = new TxOut(receiverAddress, amount);
  if (leftOverAmount === 0) {
    return [txOut1];
  } else {
    const leftOverTx = new TxOut(myAddress, leftOverAmount);
    return [txOut1, leftOverTx];
  }
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

const signTxIn = (
  transaction: Transaction,
  txInIndex: number,
  privateKey: string,
  aUnspentTxOuts: UnspentTxOut[]
): string => {
  const txIn: TxIn = transaction.txIns[txInIndex];

  const dataToSign = transaction.id;
  const referencedUnspentTxOut: UnspentTxOut = findUnspentTxOut(
    txIn.txOutId,
    txIn.txOutIndex,
    aUnspentTxOuts
  );
  if (referencedUnspentTxOut == null) {
    console.log('could not find referenced txOut');
    throw Error();
  }
  const referencedAddress = referencedUnspentTxOut.address;

  if (getPublicKey(privateKey) !== referencedAddress) {
    console.log(
      'trying to sign an input with private' +
        ' key that does not match the address that is referenced in txIn'
    );
    throw Error();
  }

  const key = EC.keyFromPrivate(privateKey, 'hex');
  const signature: string = toHexString(key.sign(dataToSign).toDER());

  return signature;
};

//Get balance
const getBalance = (privateKey: string): number => {
  const publicKey = getPublicKey(privateKey);
  const unspentTxOuts = getUnspentTxOuts();
  return findUnspentTxOuts(publicKey, unspentTxOuts)
    .map((uTxO: UnspentTxOut) => uTxO.amount)
    .reduce((a, b) => a + b, 0);
};

//Create transaction
const createTransaction = (
  receiverAddress: string,
  amount: number,
  privateKey: string
): Transaction => {
  const publicKey = getPublicKey(privateKey);
  const unspentTxOuts = getUnspentTxOuts();
  const myUnspentTxOuts = unspentTxOuts.filter(
    (uTxO: UnspentTxOut) => uTxO.address === publicKey
  );

  const { includedUnspentTxOuts, leftOverAmount } = findTxOutsForAmount(
    amount,
    myUnspentTxOuts
  );

  const unsignedTxIns: TxIn[] = includedUnspentTxOuts.map(
    (unspentTxOut: UnspentTxOut) => {
      const txIn: TxIn = new TxIn();
      txIn.txOutId = unspentTxOut.txOutId;
      txIn.txOutIndex = unspentTxOut.txOutIndex;
      return txIn;
    }
  );

  const tx: Transaction = new Transaction();
  tx.txIns = unsignedTxIns;
  tx.txOuts = createTxOuts(receiverAddress, publicKey, amount, leftOverAmount);
  tx.id = getTransactionId(tx);

  tx.txIns = tx.txIns.map((txIn: TxIn, index: number) => {
    txIn.signature = signTxIn(tx, index, privateKey, unspentTxOuts);
    return txIn;
  });

  return tx;
};

export { getPublicKey, initWallet, getBalance, createTransaction };
