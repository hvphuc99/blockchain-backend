import { Transaction } from './transaction';

class Block {
  public index: number;
  public data: Transaction[];
  public timestamp: number;
  public difficulty: number;
  public nonce: number;
  public hash: string;
  public previousHash: string;

  constructor(
    index: number,
    data: Transaction[],
    timestamp: number,
    difficulty: number,
    nonce: number,
    hash: string,
    previousHash: string
  ) {
    this.index = index;
    this.data = data;
    this.timestamp = timestamp;
    this.difficulty = difficulty;
    this.nonce = nonce;
    this.hash = hash;
    this.previousHash = previousHash;
  }
}
