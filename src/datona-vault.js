"use strict";

/*
 * Datona Vault Library
 *
 * datona-lib vault features.
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
const comms = require('./datona-comms');
const blockchain = require('./datona-blockchain');

/*
 * Classes
 */

/*
 * An instance of this class represents a single vault within a vault server
 * controlled by a single S-DAC.
 */
class RemoteVault extends comms.DatonaConnector {

  constructor(url, contractAddress, localPrivateKey, remoteAddress) {
    try {
      super(url, localPrivateKey, remoteAddress);
      assert.isAddress(contractAddress, "contractAddress");
    } catch (error) {
      throw new errors.VaultError("Failed to construct vault: " + error.message, error.details);
    }
    this.contract = contractAddress;
  }


  /*
   * Promises to create the vault on the remote server.  This method creates the
   * data request, signs it, initiates the request and validates the response.
   */
  create() {
    const request = {
      txnType: "VaultRequest",
      requestType: "create",
      contract: this.contract,
    };
    return this.send(request)
      .then( function(response){
        comms.validateResponse(response.txn, "VaultResponse");
        if (response.txn.responseType === "error") throw errors.fromObject(response.txn.error);
        return response;
      });
  }


  /*
   * Promises to write or rewrite the given file of this vault.
   */
  write(data, file = blockchain.ZERO_ADDRESS) {
    assert.isAddress(file, "file");
    assert.isPresent(data, "data");
    const request = {
      txnType: "VaultRequest",
      requestType: "write",
      contract: this.contract,
      file: file,
      data: data
    };
    return this.send(request)
      .then( function(response){
        comms.validateResponse(response.txn, "VaultResponse");
        if (response.txn.responseType === "error") throw errors.fromObject(response.txn.error);
        return response;
      });
  }


  /*
   * Promises to append to the given file of this vault.
   */
  append(data, file = blockchain.ZERO_ADDRESS) {
    assert.isAddress(file, "file");
    assert.isPresent(data, "data");
    const request = {
      txnType: "VaultRequest",
      requestType: "append",
      contract: this.contract,
      file: file,
      data: data
    };
    return this.send(request)
        .then( function(response){
          comms.validateResponse(response.txn, "VaultResponse");
          if (response.txn.responseType === "error") throw errors.fromObject(response.txn.error);
          return response;
        });
  }


  /*
   * Promises to retrieve the data held in this vault, if permitted by the contract.
   */
  read(file = blockchain.ZERO_ADDRESS) {
    assert.isAddress(file, "file");
    const request = {
      txnType: "VaultRequest",
      requestType: "read",
      contract: this.contract,
      file: file
    };
    return this.send(request)
      .then( function(response){
        comms.validateResponse(response.txn, "VaultResponse");
        if (response.txn.responseType === "error") throw errors.fromObject(response.txn.error);
        return response.txn.data;
      });
  }


  /*
   * Promises to delete the vault and its data, if permitted by the contract.
   */
  delete() {
    const request = {
      txnType: "VaultRequest",
      requestType: "delete",
      contract: this.contract
    };
    return this.send(request)
      .then( function(response){
        comms.validateResponse(response.txn, "VaultResponse");
        if (response.txn.responseType === "error") throw errors.fromObject(response.txn.error);
        return response;
      });
  }

}


/*
 * Guardian of a Vault Data Server.  All create, update, access and delete requests
 * go through the Vault Keeper, where they are approved or rejected against the
 * Datona Smart Data Access Protocol.  If approved and permission granted by
 * the vault's Smart Data Access Contract, the raw request is passed to the
 * given VaultDataServer object.
 */
class VaultKeeper {

  constructor(vaultDataServer, key) {
    assert.isInstanceOf(vaultDataServer, "VaultKeeper vaultDataServer", VaultDataServer);
    assert.isInstanceOf(key, "VaultKeeper key", crypto.Key);
    this.key = key;
    this.vaultDataServer = vaultDataServer;
  }


  /*
   * Decodes and processes a signed VaultRequest, checking the validity of the
   * signature, validating the request and executing it via the
   * VaultDataServer
   */
  handleSignedRequest(signedRequestStr) {
    assert.isString(signedRequestStr, "VaultKeeper handleSignedRequest signedRequestStr");
    const key = this.key;
    try {
      const {txn, signatory} = comms.decodeTransaction(signedRequestStr);
      if (txn.txnType !== "VaultRequest") throw new errors.RequestError("Invalid transaction type ('"+txn.txnType+"')");
      var func;
      switch (txn.requestType) {
        case "create": func = this.createVault.bind(this); break;
        case "write": func = this.writeVault.bind(this); break;
        case "append": func = this.appendVault.bind(this); break;
        case "read": func = this.readVault.bind(this); break;
        case "delete": func = this.deleteVault.bind(this); break;
        default:
          throw new errors.InvalidTransactionError("Invalid request type ('" + txn.requestType + "')");
      }
      return func(txn, signatory)
        .then( function encode(response){
          return comms.encodeTransaction(response, key);
        });
    } catch (error) {
      const exception = error instanceof errors.DatonaError ? error : new errors.TransactionError("VaultKeeper handleSignedRequest: "+error.message);
      return new Promise(function(resolve, reject) {
        resolve(comms.encodeTransaction(createErrorResponse(exception), key));
      });
    }
  }


  /*
   * Handles a valid create request and promises to create a new vault via the
   * VaultDataServer.
   */
  createVault(request, signatory) {

    function checkPermissions(contract, signatory, file) {
      return contract.assertOwner(signatory).then(contract.assertNotExpired.bind(contract));
    }

    function callDataServer(contractAddress, file, data) { // bound to vaultDataServer instance
      return this.create(contractAddress);
    }

    return _handleVaultKeeperRequest("create", request, signatory, checkPermissions, callDataServer.bind(this.vaultDataServer));
  }


  /*
   * Handles a valid write request and promises to write the vault via the
   * VaultDataServer.
   */
  writeVault(request, signatory) {

    function checkPermissions(contract, signatory, file) {
      if (!assert.isNotNull(request.data)) throw new errors.MalformedTransactionError("Missing request data field");
      return contract.assertCanWrite(signatory, file).then(contract.assertNotExpired.bind(contract));
    }

    function callDataServer(contractAddress, file, data) { // bound to vaultDataServer instance
      return this.write(contractAddress, file, data);
    }

    return _handleVaultKeeperRequest("write", request, signatory, checkPermissions, callDataServer.bind(this.vaultDataServer));
  }


  /*
   * Handles a valid append request and promises to append to the vault via the
   * VaultDataServer.
   */
  appendVault(request, signatory) {

    function checkPermissions(contract, signatory, file) {
      if (!assert.isNotNull(request.data)) throw new errors.MalformedTransactionError("Missing request data field");
      return contract.assertCanAppend(signatory, file).then(contract.assertNotExpired.bind(contract));
    }

    function callDataServer(contractAddress, file, data) { // bound to vaultDataServer instance
      return this.append(contractAddress, file, data);
    }

    return _handleVaultKeeperRequest("append", request, signatory, checkPermissions, callDataServer.bind(this.vaultDataServer));
  }


  /*
   * Handles a valid read request and promises to return the data from the
   * vault via VaultDataServer.
   */
  readVault(request, signatory) {

    function checkPermissions(contract, signatory, file) {
      return contract.assertCanRead(signatory, file).then(contract.assertNotExpired.bind(contract));
    }

    function callDataServer(contractAddress, file, data) { // bound to vaultDataServer instance
      return this.read(contractAddress, file);
    }

    return _handleVaultKeeperRequest("read", request, signatory, checkPermissions, callDataServer.bind(this.vaultDataServer));
  }


  /*
   * Handles a valid delete request and promises to delete the vault via the
   * VaultDataServer.
   */
  deleteVault(request, signatory) {

    function checkPermissions(contract, signatory, file) {
      return contract.assertOwner(signatory).then(contract.assertHasExpired.bind(contract));
    }

    function callDataServer(contractAddress, file, data) { // bound to vaultDataServer instance
      return this.delete(contractAddress);
    }

    return _handleVaultKeeperRequest("delete", request, signatory, checkPermissions, callDataServer.bind(this.vaultDataServer));
  }

}


/*
 * Interface.  A class that implements this interface must be given to the
 * VaultKeeper on construction to provide the data vault server capability.
 */
class VaultDataServer {

  constructor() {};

  /*
   * Unconditionally creates a new vault controlled by the given contract.
   */
  create(contract) { throw new errors.DeveloperError("Vault server's create function has not been implemented"); };

  /*
   * Unconditionally creates or overwrites data in a file within the vault controlled by the given contract.
   */
  write(contract, file, data) { throw new errors.DeveloperError("Vault server's write has not been implemented"); };

  /*
   * Unconditionally appends data to a file within the vault controlled by the given contract.
   */
  append(contract, file, data) { throw new errors.DeveloperError("Vault server's append has not been implemented"); };

  /*
   * Unconditionally reads the data from a file within the vault controlled by the given contract.
   */
  read(contract, file) { throw new errors.DeveloperError("Vault server's read function has not been implemented"); };

  /*
   * Unconditionally deletes a file controlled by the given contract.  If the file is null then the
   * entire vault is deleted.
   */
  delete(contract, file) { throw new errors.DeveloperError("Vault server's delete function has not been implemented"); };

}


/*
 * External Functions
 */


/*
 * Constructs a success VaultResponse to return from a Vault Server in response
 * to a VaultRequest
 */
function createSuccessResponse(data) {
 var response = comms.createSuccessResponse("VaultResponse");
 response.data = data;
 return response;
}


/*
 * Constructs a failure VaultResponse to return from a Vault Server in response
 * to a VaultRequest
 */
function createErrorResponse(error) {
  return comms.createErrorResponse(error, "VaultResponse");
}



/*
 * Exports
 */

module.exports = {
  RemoteVault: RemoteVault,
  VaultKeeper: VaultKeeper,
  VaultDataServer: VaultDataServer
};



/*
 * Internal Functions
 */

function _handleVaultKeeperRequest(requestType, request, signatory, permissionFunction, dataServerFunction) {
  assert.isObject(request, "VaultKeeper "+requestType+"Vault request");
  assert.isAddress(signatory, "VaultKeeper "+requestType+"Vault signatory");
  try {
    // validate the request and obtain the contract
    if (request.requestType !== requestType) throw new errors.InvalidTransactionError("attempted to "+requestType+" a vault with an invalid request type '"+request.requestType+"'");
    if (!assert.isAddress(request.contract)) throw new errors.MalformedTransactionError("Invalid request contract field", request.contract);
    const contract = new blockchain.GenericSmartDataAccessContract(request.contract);
    const file = (request.file !== undefined) ? request.file : blockchain.ZERO_ADDRESS;
    // Verify the signatory is permitted to write to the contract and the contract has
    // not expired then write or append the vault
    return permissionFunction(contract, signatory, file)
      .then( function(){ return dataServerFunction(request.contract, file, request.data) })
      .then(createSuccessResponse)
      .catch(createErrorResponse);

  } catch (error) {
    const exception = error instanceof errors.DatonaError ? error : new errors.TransactionError("VaultKeeper "+requestType+"Vault: "+error.message);
    return new Promise(function(resolve, reject) { resolve(createErrorResponse(exception)) });
  }
}




