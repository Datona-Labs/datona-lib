"use strict";

/*
 * Datona Comms Library
 *
 * datona-lib utility functions for communicating between Datona applications.
 * Implements the Datona application level protocol, including signatures and
 * encryption.
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
const crypto = require('./datona-crypto');
var WebSocket;
var net;


/*
 * Classes
 */

/*
 * Interface for clients that communicate with a remote vault or requester server.
 */
class DatonaClient {

  constructor(url) {
    assert.isUrl(url, "url");
    this.url = url;
  }

  /*
   * Promises to send the given JSON formatted SignedTransaction and resolve
   * with the response or reject with a CommunicationError.
   */
  send(signedTxnStr) {
    throw new errors.DeveloperError("DatonaClient send has not been implemented")
  };

}


/*
 * DatonaClient implementation for a plain TCP (file://) connection
 */
class TcpClient extends DatonaClient {

  constructor(url, connectionTimeout = 3000) {
    super(url);
    this.connectionTimeout = connectionTimeout;
    if (net === undefined) net = require('net');
  }

  send(signedTxnStr) {

    return new Promise((resolve, reject) => {

      const socket = new net.Socket();
      socket.setTimeout(this.connectionTimeout, () => {
        socket.destroy();
        reject(new errors.CommunicationError("Connection timeout"));
      });

      socket.connect(this.url.port, this.url.host, () => {
        socket.write(signedTxnStr);
      });

      socket.on('data', (dataBuffer) => {
        socket.destroy();
        resolve(dataBuffer.toString());
      });

      socket.on('error', (err) => {
        socket.destroy();
        reject(new errors.CommunicationError("Failed to send transaction: " + err));
      });

    });
  }

}


/*
 * DatonaClient implementation for a plain TCP (file://) connection
 */
class WebSocketClient extends DatonaClient {

  constructor(url, connectionTimeout = 3000) {
    super(url);
    this.connectionTimeout = connectionTimeout;
    if (WebSocket === undefined) WebSocket = require('isomorphic-ws');
  }

  send(signedTxnStr) {

    return new Promise((resolve, reject) => {

      const socket = new WebSocket(this.url.scheme + "://" + this.url.host + ":" + this.url.port);
      const timer = setTimeout(() => {
        socket.close();
        reject(new errors.CommunicationError("Connection timeout"));
      }, this.connectionTimeout);

      socket.onopen = function (evt) {
        clearTimeout(timer);
        socket.send(signedTxnStr);
      };

      socket.onmessage = function (evt) {
        socket.close();
        resolve(evt.data.toString());
      };

      socket.onerror = function (evt) {
        socket.close();
        reject(new errors.CommunicationError("Failed to send transaction: " + evt.message, evt.error));
      };

    });
  }
}

/*
 * Superclass for classes that communicate with a remote vault or requester server.
 * The DatonaConnector automatically selects the appropriate DatonaClient based on
 * the url scheme.  Allows datona-lib to seamlessly support multiple types of
 * transmission protocol.
 */
class DatonaConnector {

  constructor(url, localPrivateKey, remoteAddress) {
    assert.isUrl(url, "url");
    assert.isString(url.scheme, "url.scheme");
    assert.isInstanceOf(localPrivateKey, "localPrivateKey", crypto.Key);
    assert.isAddress(remoteAddress, "remoteAddress");
    this.localPrivateKey = localPrivateKey;
    this.remoteAddress = remoteAddress;
    switch (url.scheme) {
      case "file":
        this.client = new TcpClient(url);
        break;
      case "ws":
        this.client = new WebSocketClient(url);
        break;
      default:
        throw new errors.RequestError("Unsupported url scheme: "+url.scheme);
    }
  }


  /*
   * Serialises the given Transaction object, signs it and returns a promise
   * to send it to the requester.
   */
   send(txn){
     const signedTxnStr = encodeTransaction(txn, this.localPrivateKey);
     const decode = this._decode;
     return this.client.send(signedTxnStr)
       .then(decode.bind(this));
   }


  /*
   * Decodes the given transaction object and returns the data payload.
   * Throws a TransactionError if the transaction is invalid or the
   * signature does not match the expected remotePublicKey.
   */
  _decode(txnStr) {
    const txn = decodeTransaction(txnStr);
    if (txn.signatory.toLowerCase() !== this.remoteAddress.toLowerCase()){
      throw new errors.TransactionError("Validation failure. Wrong signatory", "Expected: "+this.remoteAddress+", Received: "+txn.signatory);
    }
    return txn;
  }

}


/*
 * A Smart Data Access request from a Requester to an Owner.  This class
 * validates the request and allows the user to accept or reject the request.
 * If accept or reject is called, this class connects to the Requester's
 * remote server to send the response.
 */
class SmartDataAccessRequest extends DatonaConnector {

  constructor(signedTxnStr, localPrivateKey) {
    assert.isString(signedTxnStr, "SmartDataAccessRequest constructor signedTxnStr");
    assert.isInstanceOf(localPrivateKey, "SmartDataAccessRequest constructor key", crypto.Key);
    const txn = decodeTransaction(signedTxnStr);
    try {
      assert.isObject(txn.txn.api, "api");
      assert.isObject(txn.txn.contract, "contract");
      assert.isHash(txn.txn.contract.hash, "contract hash");
      super(txn.txn.api.url, localPrivateKey, txn.signatory);
      this.data = txn.txn;
      if (txn.txn.txnType !== "SmartDataAccessRequest") throw new errors.RequestError("Invalid transaction type ('"+txn.txn.txnType+"')");
    } catch (error) {
      throw new errors.RequestError("Request is invalid: " + error.message, error.details);
    }
  }

  /*
   * Sends an acceptance transaction to the requester giving the address of
   * the SDAC and the vault URL.
   */
  accept(contractAddress, vaultAddress, vaultUrl) {
    assert.isAddress(contractAddress, "SmartDataAccessRequest accept contractAddress");
    assert.isAddress(vaultAddress, "SmartDataAccessRequest accept vaultAddress");
    assert.isUrl(vaultUrl, "SmartDataAccessRequest accept vaultUrl");
    var txn = this.data.api.acceptTransaction;
    txn.txnType = "SmartDataAccessResponse";
    txn.responseType = "accept";
    txn.contract = contractAddress;
    txn.vaultAddress = vaultAddress;
    txn.vaultUrl = vaultUrl;
    return this.send(txn)
      .then( function(signedTxn){
        validateResponse(signedTxn.txn);
        return signedTxn;
      });
  }

  /*
   * Sends a rejection transaction to the requester with the reason given.
   */
  reject(reason) {
    assert.isPresent(reason, "SmartDataAccessRequest reject reason");
    var txn = this.data.api.rejectTransaction;
    txn.txnType = "SmartDataAccessResponse";
    txn.responseType = "reject";
    txn.reason = reason;
    return this.send(txn);
  }

}



/*
 * Exports
 */

module.exports = {
  DatonaConnector: DatonaConnector,
  SmartDataAccessRequest: SmartDataAccessRequest,
  encodeTransaction: encodeTransaction,
  decodeTransaction: decodeTransaction,
  validateResponse: validateResponse,
  createSuccessResponse: createSuccessResponse,
  createErrorResponse: createErrorResponse
};



/*
 * External Functions
 */


/*
 * Decodes the given transaction object and returns the data payload.
 * @throws a TransactionError if the transaction data or signature is invalid.
 */
function decodeTransaction(signedTxnStr) {
  assert.isString(signedTxnStr, "txnStr");
  try {
    const signedTxn = JSON.parse(signedTxnStr);
    assert.isPresent(signedTxn.txn, "txn");
    assert.isPresent(signedTxn.signature, "signature");
    const txnHash = crypto.hash(JSON.stringify(signedTxn.txn));
    const signatory = crypto.recover(txnHash, signedTxn.signature);
    return { txn:signedTxn.txn, signatory:signatory };
  }
  catch (error) {
    throw new errors.MalformedTransactionError(error.message, error.details);
  }
}


/*
 * Serialises the given object and signs it.
 */
function encodeTransaction(txn, key) {
  assert.isObject(txn, "Comms.encodeTransaction txn");
  assert.isInstanceOf(key, "Comms.encodeTransaction key", crypto.Key );
  const txnStr = JSON.stringify(txn);
  const signature = key.sign(crypto.hash(txnStr));
  const signedTxn = {
    txn: txn,
    signature: signature
  };
  return JSON.stringify(signedTxn);
}


/*
 * Validates the given response transaction against the GeneralServerResponse
 * format.
 */
function validateResponse(txn, expectedTxnType = "GeneralResponse") {
  try {
    assert.isString(expectedTxnType, "GeneralResponse constructor expectedTxnType");
    assert.isObject(txn, expectedTxnType+" constructor txn");
    assert.isString(txn.txnType, "txnType");
    if (txn.txnType !== expectedTxnType) throw new errors.TransactionError("invalid transaction type ('"+txn.txnType+"')");
    assert.isString(txn.responseType, "responseType");
    switch (txn.responseType) {
      case "success": break;
      case "error":
        assert.isObject(txn.error, "error");
        assert.isPresent(txn.error.message, "error message");
        // name and details are optional
        break;
      default:
        throw new errors.TransactionError("invalid response type ("+txn.responseType+")");
    }
  } catch (error) {
    throw new errors.TransactionError(expectedTxnType+" is invalid: " + error.message, error.details);
  }
}


/*
 * Constructs a GeneralServerResponse Success transaction, optionally of the given type.
 */
function createSuccessResponse(txnType = "GeneralResponse") {
  return {
    txnType: txnType,
    responseType: "success"
  };
}


/*
 * Constructs a GeneralServerResponse Error transaction, optionally of the given type.
 */
function createErrorResponse(error, txnType = "GeneralResponse") {
  assert.isInstanceOf(error, "createErrorResponse error", Error);
  return {
    txnType: txnType,
    responseType: "error",
    error: {
      name: error.name,
      message: error.message,
      details: error.details
    }
  }
}
