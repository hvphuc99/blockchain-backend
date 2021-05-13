import * as bodyParser from 'body-parser';
import * as express from 'express';
import { getTransactionPool } from './transactionPool';
import { getBalance, getPublicKey, initWallet } from './wallet';
import {
  sendTransaction,
  generateNextBlock,
  getBlockchain,
  isValidNewBlock,
} from './blockchain';
import { getMyTransaction } from './transaction';
require('dotenv').config();

const cors = require('cors');
const httpPort: number = parseInt(process.env.PORT) || 3001;

const app = express();
app.use(bodyParser.json());
app.use(cors());
const httpServer = require('http').createServer(app);

//Init socket
export const io = require('socket.io')(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

io.on('connection', (socket) => {
  console.log(`New connection id: ${socket.id}`);
});

app.post('/register', (req, res) => {
  res.attachment('privateKey.txt');
  res.type('txt');
  res.status(201).send(initWallet());
});

app.post('/login', (req, res) => {
  const { privateKey } = req.body;
  const publicKey = getPublicKey(privateKey);
  res.status(200).send({ publicKey });
});

app.get('/getBalance', (req, res) => {
  const authHeader = req.headers.authorization;
  const privateKey = authHeader.substring(7, authHeader.length);
  res.status(200).send({ balance: getBalance(privateKey) });
});

app.post('/sendTransaction', (req, res) => {
  const authHeader = req.headers.authorization;
  const privateKey = authHeader.substring(7, authHeader.length);
  const { address, amount } = req.body;
  const tx = sendTransaction(address, amount, privateKey);
  if (!tx) {
    res.status(201).send({ success: false });
  } else {
    res.status(201).send({ success: true });
  }
});

app.get('/transactionPool', (req, res) => {
  res.status(200).send({ transactionPool: getTransactionPool() });
});

app.post('/mine', (req, res) => {
  const authHeader = req.headers.authorization;
  const privateKey = authHeader.substring(7, authHeader.length);
  res.status(201).send({ newBlock: generateNextBlock(privateKey) });
});

app.get('/blockchain', (req, res) => {
  res.status(200).send({ blockchain: getBlockchain() });
});

app.post('/validateBlock', (req, res) => {
  const { block, blockchain } = req.body;
  res.status(200).send({ isValid: isValidNewBlock(block, blockchain) });
});

app.get('/getMyTransaction', (req, res) => {
  const authHeader = req.headers.authorization;
  const privateKey = authHeader.substring(7, authHeader.length);
  res.status(200).send({ transactions: getMyTransaction(privateKey) });
});

httpServer.listen(httpPort, () => {
  console.log('Listening http on port: ' + httpPort);
});
