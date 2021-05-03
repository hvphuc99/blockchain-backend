import * as bodyParser from 'body-parser';
import * as express from 'express';
import { getPublicFromWallet, initWallet } from './wallet';
require('dotenv').config();

const httpPort: number = parseInt(process.env.HTTP_PORT) || 3001;
const cors = require('cors');

const initHttpServer = (httpPort: number) => {
  const app = express();
  app.use(bodyParser.json());
  app.use(cors());

  app.post('/register', (req, res) => {
    res.attachment('privateKey.txt');
    res.type('txt');
    res.status(201).send(initWallet());
  });

  app.post('/login', (req, res) => {
    const { privateKey } = req.body;
    const publicKey = getPublicFromWallet(privateKey);
    res.status(200).send({ publicKey });
  });

  app.listen(httpPort, () => {
    console.log('Listening http on port: ' + httpPort);
  });
};

initHttpServer(httpPort);
