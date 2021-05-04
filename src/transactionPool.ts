import { Transaction } from './transaction';

let transactionPool: Transaction[] = [];

const getTransactionPool = (): Transaction[] => transactionPool;

export { getTransactionPool };
