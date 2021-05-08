import { Transaction } from './transaction';

let transactionPool: Transaction[] = [];

const getTransactionPool = (): Transaction[] => transactionPool;
const emptyTransactionPool = (): void => {
  transactionPool = [];
};

const addToTransactionPool = (tx: Transaction) => {
  transactionPool.push(tx);
};

export { getTransactionPool, addToTransactionPool, emptyTransactionPool };
