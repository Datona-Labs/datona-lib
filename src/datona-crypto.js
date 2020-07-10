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
const ecdsa = require('secp256k1');
const CryptoJS = require('crypto-js');
const FS = (typeof window === 'undefined') ? require('fs') : window.FS;
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
    this.publicKey = ecdsa.publicKeyCreate(this.privateKey, false);
    this.address = publicKeyToAddress(this.publicKey);
  }

  /*
   * Signs the given hash with this key
   */
  sign(hash) {
    assert.isHash(hash, "hash");
    const signature = ecdsa.sign(Buffer.from(hash, 'hex'), this.privateKey);
    return toDatonaSignature(signature);
  }


  /*
   * Encrypts the given data for the given key using the Elliptic Curve Integrated Encryption Scheme
   *   - The key derivation function used is the standard datona crypto hash function.
   *   - The encryption scheme used is AES-GCM.
   * ECIES has been selected instead of an asymmetric scheme like RSA for performance reasons.
   */
  encrypt(publicKeyTo, data) {
    assert.isInstanceOf(publicKeyTo, "public key", Buffer);
    assert.isPresent(data, "data");
    const sharedSecret = ecdsa.ecdh(publicKeyTo, this.privateKey).toString('hex');
    return CryptoJS.AES.encrypt(data,hash(sharedSecret)).toString();
  }

  decrypt(publicKeyFrom, data) {
    assert.isInstanceOf(publicKeyFrom, "public key", Buffer);
    assert.isPresent(data, "data");
    const sharedSecret = ecdsa.ecdh(publicKeyFrom, this.privateKey).toString('hex');
    return CryptoJS.AES.decrypt(data,hash(sharedSecret)).toString(CryptoJS.enc.Utf8);
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
  publicKeyToAddress: publicKeyToAddress,
  hexToUint8Array: hexToUint8Array,
  uint8ArrayToHex: uint8ArrayToHex,
  hash: hash,
  fileToHash: fileToHash,
  Key: Key,
  Buffer: Buffer  // export to give javascript visibility in browser
};



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
  return recover(hash, signature) === address;
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
 * Returns a promise to generate a keccak256 hash of the given file.
 * If the nonce string is given, it is appended to the file.
 */
function fileToHash( file, nonce ){
  return new Promise(
    function( resolve, reject ){
      try {
        const hash = new keccak256.create();
        const fd = FS.createReadStream(file);
        fd.on('data', function(data) { hash.update(data); });
        fd.on('error', function(err){ reject( new errors.FileSystemError(err) ); });
        fd.on('close', function() {
          if (nonce) hash.update(nonce);
          hash.digest();
          resolve(hash.hex());
        });
      }
      catch(err){
        reject( new errors.FileSystemError(err) );
      }
    });
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
 * Calculates the address associated with a public key
 */
function publicKeyToAddress(publicKey) {
  assert.isInstanceOf(publicKey, "publicKey", Uint8Array);
  const addressBuf = hash(publicKey.slice(1)).slice(-20 * 2);
  return "0x" + addressBuf.toString('hex');
}


/*
 * Hex conversion functions
 */

function hexToUint8Array(hexString) {
  assert.isHexString(hexString, 'hexString');
  return Buffer.from(hexString, 'hex');
}

function uint8ArrayToHex(buffer) {
  assert.isInstanceOf(buffer, "buffer", Uint8Array);
  return Buffer.from(buffer).toString('hex');
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
