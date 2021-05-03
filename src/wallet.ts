import { ec } from 'elliptic';
import { appendFile, readFileSync } from 'fs';
const path = require('path');

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

const getPublicFromWallet = (privateKey: string): string => {
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

export { getPublicFromWallet, initWallet };
