"use strict";

/*
 * Datona Blockchain Library
 *
 * datona-lib blockchain features
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


const CONFIG = require('../config.json');
const crypto = require('./datona-crypto');
const errors = require('./errors');
const assert = require('./assertions');
const Web3 = (typeof window === 'undefined') ? require('web3') : window.Web3;
const Transaction = require('ethereumjs-tx').Transaction;
const sdacInterface = require("../contracts/SDAC.json");
var web3;


/*
 * Constants
 */

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";


/*
 * Classes
 */

class Permissions {

  constructor (permissionsByte) {
    if (toString.call(permissionsByte) === '[object Number]') {
      this.permissions = permissionsByte;
    }
    else {
      assert.matches(permissionsByte, '^0x[0-9A-Fa-f]{2}$', "invalid string representation of permissions byte",permissionsByte);
      this.permissions = parseInt(permissionsByte);
    }
  }

  canRead() { return (this.permissions & Contract.READ_BIT) > 0 }
  canWrite() { return (this.permissions & Contract.WRITE_BIT) > 0 }
  canAppend() { return (this.permissions & Contract.APPEND_BIT) > 0 }
  isDirectory() { return (this.permissions & Contract.DIRECTORY_BIT) > 0 }

}


/*
 * Represents a Smart Data Access Contract on the blockchain
 */
class Contract {

  static NO_PERMISSIONS = 0x00;
  static ALL_PERMISSIONS = 0x07;
  static READ_BIT = 0x04;
  static WRITE_BIT = 0x02;
  static APPEND_BIT = 0x01;
  static DIRECTORY_BIT = 0x80;
  static ROOT_DIRECTORY = "0x0000000000000000000000000000000000000000";

  /*
   * If the address is not given this represents a new contract to be deployed.
   */
  constructor(abi, address) {
    assert.isArray(abi, "Contract abi");
    try{
      if (web3 === undefined) setProvider(CONFIG.blockchainURL);
      this.web3Contract = new web3.eth.Contract(abi);
    }
    catch (error) {
      throw new errors.BlockchainError("Could not construct contract: "+error.message);
    }
    this.abi = abi;
    if (address !== undefined) this.setAddress(address);
  }


  /*
   * Sets the address of this contract on the blockchain.  Can be used as an
   * alternative to passing it in the constructor.
   * @throws {BlockchainError} if the address is already set
   */
  setAddress(address) {
    assert.isAddress(address, "address");
    if (this.address !== undefined) throw new errors.BlockchainError("address already set");
    this.web3Contract.options.address = address;
    this.address = address;
  }


  /*
   * Promises to deploy this contract on the blockchain
   */
  deploy(key, bytecode, constructorArgs) {
    assert.isInstanceOf(key, "Contract.deploy key", crypto.Key);
    assert.isHexString(bytecode, "Contract.deploy bytecode");
    if (constructorArgs !== undefined) assert.isArray(constructorArgs, "constructorArgs");
    if (this.address !== undefined) throw new errors.BlockchainError("contract already deployed");

    try {

      var gasPrice = 0;

      // create deployment transaction data from bytecode
      const txnData = this.web3Contract.deploy({
        data: '0x' + bytecode,
        arguments: constructorArgs
      }).encodeABI();

      // function to get the transaction nonce of the signatory
      function getTransactionCount(_gasPrice) {
        gasPrice = _gasPrice;
        return web3.eth.getTransactionCount(key.address);
      }

      // function to construct and sign the transaction once the nonce has been calculated
      function createTransaction(nonce) {
        const rawTxn = {
          nonce: nonce,
          gasPrice: web3.utils.toHex(gasPrice),
          gas: web3.utils.toHex(6000000),
          data: txnData,
          from: key.address,
          chainID: 42
        };
        const txn = new Transaction(rawTxn, {'chain':'kovan'});
        txn.sign(key.privateKey);
        const serializedTxn = txn.serialize();
        return "0x"+serializedTxn.toString('hex');
      }

      // function to set the address of this Contract instance once the receipt is received
      function storeAddress(receipt) {
        if (receipt.status === true){
          this.setAddress(receipt.contractAddress);
          return receipt.contractAddress;
        }
        else throw new errors.BlockchainError("Blockchain VM reverted the deployment transaction", receipt);
      }

      // get the nonce, construct and sign the transaction then publish it on the blockchain
      return web3.eth.getGasPrice()
        .then(getTransactionCount)
        .then(createTransaction.bind(this))
        .then(web3.eth.sendSignedTransaction)
        .then(storeAddress.bind(this))
        .catch(
          function(error) {
            throw (error instanceof errors.DatonaError) ? error : new errors.BlockchainError(error.message);
          }
        );

    }
    catch (error) {
      throw (error instanceof errors.DatonaError) ? error : new errors.BlockchainError(error.message);
    }
  }


  /*
   * Promises to get the owner of this contract from the blockchain
   */
  getOwner() {
    if (this.address === undefined) {
      throw new errors.BlockchainError("Contract.getOwner: contract has not been deployed or mapped to an existing contract");
    }
    if (this.owner !== undefined) {
      const thisContract = this;
      return new Promise(
        function(resolve, reject) {
          resolve(thisContract.owner);
        });
    } else {
      const thisContract = this;
      return this.call("owner")
        .then(function(owner) {
          thisContract.owner = owner;
          return owner;
        })
        .catch( function(error){
          throw new errors.BlockchainError("Failed to retrieve contract owner from the blockchain: "+error.message);
        });
    }
  }


  /*
   * Promises to return the expiry status (boolean) of this contract
   */
  hasExpired() {
    if (this.address === undefined) throw new errors.BlockchainError("Contract.hasExpired: contract has not been deployed or mapped to an existing contract");
    return this.call("hasExpired");
  }


  /*
   * Promises to return whether the given requester is permitted to read the given vault file (boolean)
   */
  canRead(requester, fileId) {
    return this.getPermissions(requester, fileId)
        .then( function(permissions){
          return permissions.canRead();
        });
  }


  /*
   * Promises to return whether the given requester is permitted to write to the given vault file (boolean)
   */
  canWrite(requester, fileId) {
    return this.getPermissions(requester, fileId)
        .then( function(permissions){
          return permissions.canWrite();
        });
  }


  /*
   * Promises to return whether the given requester is permitted to append to the given vault file (boolean)
   */
  canAppend(requester, fileId) {
    return this.getPermissions(requester, fileId)
        .then( function(permissions){
          return permissions.canAppend();
        });
  }


  /*
   * Promises to return a byte with the d----rwa permissions of the given file for the given user address.
   */
  getPermissions(requester, fileId) {
    assert.isAddress(requester, "Contract getPermissions requester");
    if (fileId === undefined) fileId = Contract.ROOT_DIRECTORY;
    else assert.isAddress(fileId, "Contract getPermissions fileId");
    if (this.address === undefined) throw new errors.BlockchainError("Contract.getPermissions: contract has not been deployed or mapped to an existing contract");
    return this.call("getPermissions", [requester, fileId])
        .then( function(permissions){
          return new Permissions(permissions);
        });
  }


  /*
   * Promises to call the given view or pure method with the given arguments.
   * Use 'transact' to call a state-modifying method.
   */
  call(method, args = []) {
    assert.isString(method, "Contract.call method");
    assert.isArray(args, "Contract.call args");
    if (this.address === undefined) throw new errors.BlockchainError("Contract.call: contract has not been deployed or mapped to an existing contract");
    var methodAbi = this.abi.find(obj => { return obj.name === method; });
    if (!methodAbi) throw new errors.BlockchainError("Contract.call method '"+method+"' does not exist");
    try{
      return this.web3Contract.methods[method](...args).call()
        .catch(function(error) {
          throw new errors.BlockchainError("Failed to call method " + method, error.message);
        });
    }
    catch (error) {
      throw new errors.BlockchainError(error.message);
    }
  }


  /*
   * Promises to call the given state-modifying method with the given arguments.
   * Use 'call' to call a view or pure method.
   */
  transact(key, method, args = []) {
    assert.isInstanceOf(key, "Contract.transact key", crypto.Key);
    assert.isString(method, "Contract.transact method");
    assert.isArray(args, "Contract.call args");
    if (this.address === undefined) throw new errors.BlockchainError("Contract.call: contract has not been deployed or mapped to an existing contract");
    if (this.web3Contract === undefined) throw new errors.BlockchainError("contract does not exist on the blockchain");
    try{
      var methodAbi = this.abi.find(obj => { return obj.name === method; });
      if (!methodAbi) throw new errors.BlockchainError("Contract.transact method '"+method+"' does not exist");

      // create transaction data
      const txnData = this.web3Contract.methods[method](...args).encodeABI();

      var gasPrice = 0;

      // function to get the transaction nonce of the signatory
      function getTransactionCount(_gasPrice) {
        gasPrice = _gasPrice;
        return web3.eth.getTransactionCount(key.address);
      }

      // function to construct and sign the transaction once the nonce has been calculated
      function createTransaction(nonce) {
        const rawTxn = {
          nonce: nonce,
          gasPrice: web3.utils.toHex(gasPrice),
          gas: web3.utils.toHex(3000000),
          data: txnData,
          to: this.address,
          chainID: 42
        };
        const txn = new Transaction(rawTxn, {'chain':'kovan'});
        txn.sign(key.privateKey);
        const serializedTxn = txn.serialize();
        return "0x"+serializedTxn.toString('hex');
      }

      // get the nonce, construct and sign the transaction then publish it on the blockchain
      return web3.eth.getGasPrice()
        .then(getTransactionCount)
        .then(createTransaction.bind(this))
        .then(web3.eth.sendSignedTransaction)
        .catch(
          function(error) {
            throw (error instanceof errors.DatonaError) ? error : new errors.BlockchainError(error.message);
          }
        );

    }
    catch (error) {
      throw new errors.BlockchainError(error.message);
    }
  }


  /*
   * Promises to get the runtime bytecode of this contract from the blockchain
   */
  getBytecode() {
    if (this.address === undefined) {
      throw new errors.BlockchainError("Contract.getBytecode: contract has not been deployed or mapped to an existing contract");
    }
    else if (this.bytecode !== undefined) {
      const thisContract = this;
      return new Promise( function(resolve, reject) { resolve(thisContract.bytecode); });
    }
    else {
      const thisContract = this;
      return web3.eth.getCode(this.address)
        .then(function(bytecode) {
          thisContract.bytecode = bytecode.slice(2);
          return thisContract.bytecode;
        })
        .catch(function(error) {
          throw new errors.BlockchainError("Could not retrieve contract bytecode", error.message);
        });
    }
  }


  /*
   * Promises to terminate this contract
   */
   terminate(key){
     return this.transact(key, "terminate");
   }


  /*
   * Promises to reject if the contract's bytecode does not equal the expected bytecode given.
   */
  assertBytecode(expectedBytecode) {
    return this.getBytecode()
      .then(function(bytecode) {
        if (bytecode !== expectedBytecode) {
          throw new errors.ContractTypeError("bytecode does not match");
        }
      });
  }


  /*
   * Promises to reject if the contract's owner address does not equal the expected address given.
   */
  assertOwner(expectedOwner) {
    assert.isAddress(expectedOwner, "Contract.assertOwner expectedOwner");
    return this.getOwner()
      .then(function(owner) {
        if (owner.toLowerCase() !== expectedOwner.toLowerCase()) {
          throw new errors.ContractOwnerError("owner does not match");
        }
      });
  }


  /*
   * Promises to reject if the contract has expired.
   */
  assertNotExpired() {
    return this.hasExpired()
      .then(function(expired) {
        if (expired) {
          throw new errors.ContractExpiryError("contract has expired");
        }
      });
  }


  /*
   * Promises to reject if the contract has not expired.
   */
  assertHasExpired() {
    return this.hasExpired()
      .then(function(expired) {
        if (!expired) {
          throw new errors.ContractExpiryError("contract has not expired");
        }
      });
  }


  /*
   * Promises to reject if the given requester does not have permission to access the given vault file.
   * Also returns the permissions
   */
  assertCanRead(requester, fileId) {
    return this.getPermissions(requester, fileId)
      .then( function(permissions){
        _assertPermitted(permissions.canRead());
        return permissions;
      });
  }


  /*
   * Promises to reject if the given requester does not have permission to write to the given vault file.
   * Also returns the permissions
   */
  assertCanWrite(requester, fileId) {
    return this.getPermissions(requester, fileId)
      .then( function(permissions){
        _assertPermitted(permissions.canWrite());
        return permissions;
      });
  }


  /*
   * Promises to reject if the given requester does not have permission to append to the given vault file.
   * Also returns the permissions
   */
  assertCanAppend(requester, fileId) {
    return this.getPermissions(requester, fileId)
      .then( function(permissions){
        _assertPermitted(permissions.canAppend());
        return permissions;
      });
  }

}


/*
 * Instance of Contract, providing an interface to any SDAC already deployed on
 * the blockchain.  Maps to a contract at the given address using the standard
 * SDAC interface abi
 */
class GenericSmartDataAccessContract extends Contract {

  constructor(address) {
    super(sdacInterface.abi,address);
  }

}



/*
 * Variables
 */

var subscriptions = [];
var web3Subscribed = false;


/*
 * External Functions
 */

/*
 * Overides the default connection to the blockchain (that configured in config.json).
 */
function setProvider(url) {
  try {
    const urlStr = url.scheme+"://" + url.host+ (url.port === undefined || url.port === "" ? "" : ":"+url.port);
    switch (url.scheme) {
      case "ws":
      case "wss":
        web3 = new Web3(new Web3.providers.WebsocketProvider(urlStr));
        break;
      case "http":
      case "https":
        web3 = new Web3(new Web3.providers.HttpProvider(urlStr));
        break;
      default:
        throw new errors.BlockchainError("Invalid url scheme for the blockchain provider.  Valid schemes are ws, wss, http and https");
    }
  }
  catch (error) {
    throw new errors.BlockchainError("setProvider url is invalid: "+error.message);
  }
}


/*
 * Subscribes the client to receive notification of a new contract deployed to the
 * blockchain with the given code hash.  Optionally, the client can receive notification
 * only if the given address is permitted to access the data controlled by the contract.
 */
function subscribe(bytecodeHash, callback, permittedAddress, fileId) {
  assert.isHash(bytecodeHash, "subscribe bytecodeHash");
  assert.isFunction(callback, "subscribe callback");
  if (permittedAddress !== undefined) {
    assert.isAddress(permittedAddress, "subscribe permittedAddress");
  }
  if (fileId !== undefined){
    assert.isAddress(fileId, "subscribe fileId");
  }

  // subscribe to web3 if this is the first client subscription
  if (!web3Subscribed) monitorForPendingTransactions();

  // push the new bytecodeHash to the subscriptions
  const subscription = {
    bytecodeHash: bytecodeHash,
    callback: callback,
    permittedAddress: permittedAddress,
    fileId: fileId
  };
  const subscriptionHash = crypto.hash(JSON.stringify(subscription));
  subscription.hash = subscriptionHash;
  subscriptions.push(subscription);
  return subscriptionHash;
}


/*
 * Unsubscribes a previously subscribed client.  The client is identified by
 * the hash returned from the original call to 'subscribe'
 */
function unsubscribe(subscriptionId) {
  var numUnsubscribed = 0;
  var i = 0;
  while (i < subscriptions.length) {
    if (subscriptions[i].hash === subscriptionId) {
      subscriptions.splice(i,1);
      numUnsubscribed++;
    }
    else i++;
  }
  return numUnsubscribed;
}


/*
 * Closes any connections to the blockchain.  Should be called on program exit
 * if any blockchain functions have been used.
 */
function close(){
  if (web3 !== undefined){
    try{
      if (web3.currentProvider.connection !== undefined) web3.currentProvider.connection.close();
      web3 = undefined;
    }
    catch(error){
      throw new errors.BlockchainError("Failed to close blockchain connection: "+error.message);
    }
  }
}



/*
 * Exports
 */

module.exports = {
  ZERO_ADDRESS: ZERO_ADDRESS,
  setProvider: setProvider,
  Contract: Contract,
  Permissions: Permissions,
  GenericSmartDataAccessContract: GenericSmartDataAccessContract,
  subscribe: subscribe,
  unsubscribe: unsubscribe,
  close: close
};



/*
 * Internal Functions
 */


/*
 * Creates a web3 websocket interface to the blockchain node and subscribes to
 * receive all new pending transactions
 */
function monitorForPendingTransactions() {
  if (web3 === undefined) setProvider(CONFIG.blockchainURL);
  web3.eth
    .subscribe('pendingTransactions', (error, result) => {
      if (error) throw new errors.BlockchainError("Failed to subscribe to web3: "+error.message);
      else web3Subscribed = true;
    })
    .on('data', monitorForNewContracts);
}


/*
 * Web3 callback.  Checks if the given transaction is a new contract and if so
 * calls checkAndInformSubscriber to determine if it is a contract type that the
 * client has subscribed to and has permission to access.
 */
function monitorForNewContracts(txHash) {
  // Get the transaction details
  // if the transaction's 'to' field is null then this is a contract creation
  // so get the code hash and check if it is subscribed to
  web3.eth.getTransaction(txHash)
    .then( function(txn){
      if (txn.to == null){
        var transactionReceipt;
        return web3.eth.getTransactionReceipt(txHash)
          .then( function(txnReceipt){
            transactionReceipt = txnReceipt;
            return web3.eth.getCode(transactionReceipt.contractAddress);
          })
          .then( function(bytecode) {
            checkAndInformSubscriber(crypto.hash(bytecode.slice(2)), transactionReceipt.contractAddress);
          });
      }
    });
}


/*
 * Checks the given code hash against all subscriptions and informs the client if found.
 * If the subscription doesn't have a permittedAddress then the client is informed of the
 * new contract.  Otherwise the client is only informed if it is permitted to access the
 * contract.
 */
function checkAndInformSubscriber(bytecodeHash, contractAddress) {
  for ( var i = 0; i < subscriptions.length; i++) {
    const subscription = subscriptions[i];
    if (bytecodeHash === subscription.bytecodeHash) {
      if (subscription.permittedAddress === undefined) {
        subscription.callback(contractAddress, subscription.bytecodeHash);
      } else {
        const contract = new Contract(sdacInterface.abi, contractAddress);
        contract.canRead(subscription.permittedAddress, subscription.fileId)
          .then(function(result, error) {
            if (result === true) {
              subscription.callback(contractAddress, subscription.bytecodeHash);
            }
            if (error) {
              console.log(error);
            }
          });
      }
    }
  }
}


/*
 * Local callback function to throw a PermissionError if permitted parameter is not true
 */
function _assertPermitted(permitted) {
  if (!permitted) {
    throw new errors.PermissionError("permission denied");
  }
}


