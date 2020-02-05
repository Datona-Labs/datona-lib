"use strict";

/*
 * Datona Crypto Library
 *
 * datona-lib cryptographic features
 *
 * Copyright (C) 2020 Datona Labs
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the GNU Lesser General Public
 * License as published by the Free Software Foundation; either
 * version 3 of the License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
 * Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public License
 * along with this program; if not, write to the Free Software Foundation,
 * Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02110-1301, USA.
 *
 */

const errors = require('./errors');
const assert = require('./assertions');
const ecdsa = require('secp256k1')
const keccak256 = require('js-sha3').keccak256;
const rlp = require('rlp');
const randomBytes = require('crypto').randomBytes;


/*
 * Classes
 */

/*
 * Encapsulates a private key and provides cryptographic functions that use it
 */
class Key {

  /*
   * Constructs the instance with the given private key
   */
  constructor(privateKey) {
    assert.isPrivateKey(privateKey, "privateKey");
    this.privateKey = Buffer.from(privateKey, 'hex');
    const publicKey = ecdsa.publicKeyCreate(this.privateKey, false).slice(1);
    const addressBuf = hash(publicKey).slice(-20 * 2);
    this.address = "0x" + addressBuf.toString('hex');
  }

  /*
   * Signs the given hash with this key
   */
  sign(hash) {
    assert.isHash(hash, "hash");
    const signature = ecdsa.sign(Buffer.from(hash, 'hex'), this.privateKey);
    return toDatonaSignature(signature);
  }
}



/*
 * Exports
 */

module.exports = {
  generateKey: generateKey,
  sign: sign,
  verify: verify,
  recover: recover,
  getSignatory: recover,
  calculateContractAddress: calculateContractAddress,
  hash: hash,
  Key: Key
}



/*
 * External Functions
 */


 /*
  * Generates a new Key object with a random private key.  NB: This function does
  * not use a true random source.  Use only for experimental and test purposes.
  */
function generateKey() {
  var privateKey;
  do {
    privateKey = randomBytes(32);
  } while (!ecdsa.privateKeyVerify(privateKey));
  return new Key(privateKey.toString('hex'));
}


/*
 * Signs the given hash using the given private key
 */
function sign(hash, privateKey) {
  assert.isHash(hash, "hash");
  assert.isPrivateKey(privateKey, "privateKey");
  const signature = ecdsa.sign(Buffer.from(hash, 'hex'), Buffer.from(privateKey, 'hex'));
  return toDatonaSignature(signature);
}


/*
 * Verifies that the signatory of the given hash and signature matches the given address
 */
function verify(hash, signature, address) {
  assert.isAddress(address, "address");
  return recover(hash, signature) == address;
}


/*
 * Recovers the address of the signatory of the given hash and signature
 */
function recover(hash, signature) {
  if (!assert.isHash(hash)) throw new errors.InvalidHashError("hash is missing or invalid");
  try {
    assert.isHexString(signature, "signature");
    const sig = fromDatonaSignature(signature);
    const publicKey = ecdsa.recover(Buffer.from(hash, 'hex'), sig.signature, sig.recovery, false);
    const publicKeyBuf = Buffer.from(publicKey, 'hex').slice(1); // Remove leading 0x04
    const hashOfPublicKey = keccak256(publicKeyBuf);
    return "0x" + Buffer.from(hashOfPublicKey, 'hex').slice(-20).toString('hex');
  } catch (error) {
    throw new errors.InvalidSignatureError(error.message, error.details);
  }
}


/*
 * Generates a keccak256 hash of the given data string
 */
function hash(data) {
  try {
    return keccak256(data);
  } catch (error) {
    throw new errors.HashingError("failed to hash data: " + error.message, data);
  }
}


/*
 * Generates a contract address
 */
function calculateContractAddress(ownerAddress, nonce) {
  assert.isAddress(ownerAddress, "calculateContractAddress ownerAddress");
  assert.isNumber(nonce, "calculateContractAddress nonce");
  try {
    return "0x"+keccak256(rlp.encode([ownerAddress, nonce])).substring(24);
  }
  catch (error) {
    throw new errors.CryptographicError("Failed to calculate contract address: "+error.message);
  }
}


/*
 * Internal Functions
 */


/*
 * converts a signature produced by the secp256k1 library (with it's s and r values) to a
 * Datona Signature string
 */
function toDatonaSignature(sig) {
  var recovery = Buffer.alloc(1);
  recovery[0] = sig.recovery;
  return sig.signature.toString('hex') + recovery.toString('hex');
}


/*
 * converts a Datona Signature string into a signature object compatible with the
 * secp256k1 library
 */
function fromDatonaSignature(sigStr) {
  const sigBuffer = Buffer.from(sigStr, 'hex');
  return {
    signature: sigBuffer.slice(0, -1),
    recovery: sigBuffer[sigBuffer.length - 1]
  };
}
