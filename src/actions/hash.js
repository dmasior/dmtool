const {clipboard} = require('electron');
const crypto = require('crypto');
const cryptojs = require('crypto-js');
const blake = require('blakejs')

exports.md5 = () => {
  clipboard.writeText(
    cryptojs.MD5(clipboard.readText()).toString(),
  );
}

exports.sha1 = () => {
  clipboard.writeText(
    crypto.createHash('sha1').update(clipboard.readText()).digest('hex'),
  );
}

exports.sha256 = () => {
  clipboard.writeText(
    crypto.createHash('sha256').update(clipboard.readText()).digest('hex'),
  );
}

exports.sha384 = () => {
  clipboard.writeText(
    crypto.createHash('sha384').update(clipboard.readText()).digest('hex'),
  );
}

exports.sha512 = () => {
  clipboard.writeText(
    crypto.createHash('sha512').update(clipboard.readText()).digest('hex'),
  );
}

exports.sha3 = () => {
  clipboard.writeText(
    cryptojs.SHA3(clipboard.readText()).toString(),
  );
}

exports.blake = () => {
  clipboard.writeText(
    blake.blake2bHex(clipboard.readText()),
  );
}
