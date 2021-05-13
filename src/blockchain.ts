import * as CryptoJS from 'crypto-js';
import { io } from './index';
import {
  Transaction,
  UnspentTxOut,
  updateUnspentTxOuts,
  getCoinbaseTransaction,
} from './transaction';
import {
  getTransactionPool,
  addToTransactionPool,
  emptyTransactionPool,
} from './transactionPool';
import { createTransaction, getBalance, getPublicKey } from './wallet';

class Block {
  public index: number;
  public data: Transaction[];
  public timestamp: number;
  public difficulty: number;
  public nonce: number;
  public previousHash: string;
  public hash: string;
  public miner: string;

  constructor(
    index: number,
    data: Transaction[],
    timestamp: number,
    difficulty: number,
    nonce: number,
    previousHash: string,
    hash: string,
    miner: string
  ) {
    this.index = index;
    this.data = data;
    this.timestamp = timestamp;
    this.difficulty = difficulty;
    this.nonce = nonce;
    this.previousHash = previousHash;
    this.hash = hash;
    this.miner = miner;
  }
}

const genesisBlock: Block = new Block(
  0,
  [],
  0,
  0,
  0,
  '',
  '91a73664bc84c0baa1fc75ea6e4aa6d1d20c5df664c724e3159aefc2e1186627',
  ''
);

let blockchain: Block[] = [genesisBlock];
let unspentTxOuts: UnspentTxOut[] = [];

const getBlockchain = (): Block[] => blockchain;
const getUnspentTxOuts = (): UnspentTxOut[] => unspentTxOuts;
const getLatestBlock = (): Block => blockchain[blockchain.length - 1];

const setUnspentTxOuts = (newUnspentTxOut: UnspentTxOut[]) => {
  unspentTxOuts = newUnspentTxOut;
};

const BLOCK_GENERATION_INTERVAL: number = 10;
const DIFFICULTY_ADJUSTMENT_INTERVAL: number = 10;

const getAdjustedDifficulty = (): number => {
  const prevAdjustmentBlock: Block =
    blockchain[blockchain.length - DIFFICULTY_ADJUSTMENT_INTERVAL];
  const timeExpected: number =
    BLOCK_GENERATION_INTERVAL * DIFFICULTY_ADJUSTMENT_INTERVAL;
  const latestBlock = getLatestBlock();
  const timeTaken: number =
    latestBlock.timestamp - prevAdjustmentBlock.timestamp;
  if (timeTaken < timeExpected / 2) {
    return prevAdjustmentBlock.difficulty + 1;
  } else if (timeTaken > timeExpected * 2) {
    return prevAdjustmentBlock.difficulty - 1;
  } else {
    return prevAdjustmentBlock.difficulty;
  }
};

const getDifficulty = (): number => {
  const latestBlock = getLatestBlock();
  if (
    latestBlock.index % DIFFICULTY_ADJUSTMENT_INTERVAL === 0 &&
    latestBlock.index !== 0
  ) {
    return getAdjustedDifficulty();
  } else {
    return latestBlock.difficulty;
  }
};

const getCurrentTimestamp = (): number =>
  Math.round(new Date().getTime() / 1000);

const calculateHash = (
  index: number,
  previousHash: string,
  timestamp: number,
  data: Transaction[],
  difficulty: number,
  nonce: number
): string =>
  CryptoJS.SHA256(
    index + previousHash + timestamp + data + difficulty + nonce
  ).toString();

const hexToBinary = (s: string): string => {
  let ret: string = '';
  const lookupTable = {
    '0': '0000',
    '1': '0001',
    '2': '0010',
    '3': '0011',
    '4': '0100',
    '5': '0101',
    '6': '0110',
    '7': '0111',
    '8': '1000',
    '9': '1001',
    a: '1010',
    b: '1011',
    c: '1100',
    d: '1101',
    e: '1110',
    f: '1111',
  };
  for (let i: number = 0; i < s.length; i = i + 1) {
    if (lookupTable[s[i]]) {
      ret += lookupTable[s[i]];
    } else {
      return null;
    }
  }
  return ret;
};

const hashMatchesDifficulty = (hash: string, difficulty: number): boolean => {
  const hashInBinary: string = hexToBinary(hash);
  const requiredPrefix: string = '0'.repeat(difficulty);
  return hashInBinary.startsWith(requiredPrefix);
};

const isValidBlockStructure = (block: Block): boolean => {
  return (
    typeof block.index === 'number' &&
    typeof block.hash === 'string' &&
    typeof block.previousHash === 'string' &&
    typeof block.timestamp === 'number' &&
    typeof block.data === 'object'
  );
};

const isValidTimestamp = (newBlock: Block, previousBlock: Block): boolean => {
  return (
    previousBlock.timestamp - 60 < newBlock.timestamp &&
    newBlock.timestamp - 60 < getCurrentTimestamp()
  );
};

const calculateHashForBlock = (block: Block): string =>
  calculateHash(
    block.index,
    block.previousHash,
    block.timestamp,
    block.data,
    block.difficulty,
    block.nonce
  );

const hashMatchesBlockContent = (block: Block): boolean => {
  const blockHash: string = calculateHashForBlock(block);
  return blockHash === block.hash;
};

const hasValidHash = (block: Block): boolean => {
  if (!hashMatchesBlockContent(block)) {
    console.log('invalid hash, got:' + block.hash);
    return false;
  }

  if (!hashMatchesDifficulty(block.hash, block.difficulty)) {
    console.log(
      'block difficulty not satisfied. Expected: ' +
        block.difficulty +
        'got: ' +
        block.hash
    );
    return false;
  }
  return true;
};

const addBlockToChain = (newBlock: Block): boolean => {
  const latestBlock = getLatestBlock();
  if (isValidNewBlock(newBlock, blockchain)) {
    blockchain.push(newBlock);
    const retVal: UnspentTxOut[] = updateUnspentTxOuts(
      newBlock.data,
      getUnspentTxOuts()
    );
    setUnspentTxOuts(retVal);
    return true;
  }
  return false;
};

const findBlock = (
  index: number,
  previousHash: string,
  timestamp: number,
  data: Transaction[],
  difficulty: number,
  miner: string
): Block => {
  let nonce = 0;
  while (true) {
    const hash: string = calculateHash(
      index,
      previousHash,
      timestamp,
      data,
      difficulty,
      nonce
    );
    if (hashMatchesDifficulty(hash, difficulty)) {
      return new Block(
        index,
        data,
        timestamp,
        difficulty,
        nonce,
        previousHash,
        hash,
        miner
      );
    }
    nonce++;
  }
};

//Check block is valid or not
const isValidNewBlock = (
  newBlock: Block,
  currentBlockchain: Block[]
): boolean => {
  const previousBlock = currentBlockchain[currentBlockchain.length - 1];

  if (!isValidBlockStructure(newBlock)) {
    return false;
  }
  if (previousBlock.index + 1 !== newBlock.index) {
    return false;
  } else if (previousBlock.hash !== newBlock.previousHash) {
    return false;
  } else if (!hasValidHash(newBlock)) {
    return false;
  }
  return true;
};

//Create a new block with data
const generateRawNextBlock = (blockData: Transaction[], miner: string) => {
  const previousBlock: Block = getLatestBlock();
  const difficulty: number = getDifficulty();
  const nextIndex: number = previousBlock.index + 1;
  const nextTimestamp: number = getCurrentTimestamp();
  const previousHash = previousBlock.hash;
  const newBlock: Block = findBlock(
    nextIndex,
    previousHash,
    nextTimestamp,
    blockData,
    difficulty,
    miner
  );
  if (addBlockToChain(newBlock)) {
    emptyTransactionPool();
    //Socket broadcast new block
    io.emit('newBlock', { newBlock });
    return newBlock;
  } else {
    return null;
  }
};

//Mine transactions
const generateNextBlock = (privateKey: string) => {
  const publicKey: string = getPublicKey(privateKey);
  const latestBlock = getLatestBlock();
  const coinbaseTx: Transaction = getCoinbaseTransaction(
    publicKey,
    latestBlock.index + 1
  );
  const blockData: Transaction[] = [coinbaseTx].concat(getTransactionPool());
  return generateRawNextBlock(blockData, publicKey);
};

//Send transaction
const sendTransaction = (
  address: string,
  amount: number,
  privateKey: string
): Transaction => {
  const tx: Transaction = createTransaction(address, amount, privateKey);
  if (!tx) return null;
  addToTransactionPool(tx);
  //Socket broadcast transaction pool
  io.emit('newTransaction', { newTransaction: tx });
  return tx;
};

export {
  getUnspentTxOuts,
  generateNextBlock,
  sendTransaction,
  getBlockchain,
  isValidNewBlock,
};
