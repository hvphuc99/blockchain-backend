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

export { Transaction };
