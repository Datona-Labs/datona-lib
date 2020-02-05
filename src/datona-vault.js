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
   * Promises to store the given data in the vault.  This method creates the
   * data request, signs it, initiates the request and validates the response.
   */
  create(data) {
    assert.isPresent(data, "data");
    const request = {
      txnType: "VaultRequest",
      requestType: "create",
      contract: this.contract,
      data: data
    };
    return this.send(request)
      .then( function(response){
        comms.validateResponse(response.txn, "VaultResponse");
        if (response.txn.responseType == "error") throw errors.fromObject(response.txn.error);
        return response;
      });
  }


  /*
   * Promises to rewrite the data held in this vault.
   */
  update(data) {
    const request = {
      txnType: "VaultRequest",
      requestType: "update",
      contract: this.contract,
      data: data
    };
    return this.send(request)
      .then( function(response){
        comms.validateResponse(response.txn, "VaultResponse");
        if (response.txn.responseType == "error") throw errors.fromObject(response.txn.error);
        return response;
      });
  }


  /*
   * Promises to retrieve the data held in this vault, if permitted by the contract.
   */
  access() {
    const request = {
      txnType: "VaultRequest",
      requestType: "access",
      contract: this.contract
    };
    return this.send(request)
      .then( function(response){
        comms.validateResponse(response.txn, "VaultResponse");
        if (response.txn.responseType == "error") throw errors.fromObject(response.txn.error);
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
        if (response.txn.responseType == "error") throw errors.fromObject(response.txn.error);
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
      if (txn.txnType != "VaultRequest") throw new errors.RequestError("Invalid transaction type ('"+txn.txnType+"')");
      var func;
      switch (txn.requestType) {
        case "create": func = this.createVault.bind(this); break;
        case "update": func = this.updateVault.bind(this); break;
        case "access": func = this.accessVault.bind(this); break;
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
    return _createOrUpdateVault(this.vaultDataServer.createVault.bind(this.vaultDataServer), "create", request, signatory);
  }


  /*
   * Handles a valid update request and promises to update the vault via the
   * VaultDataServer.
   */
  updateVault(request, signatory) {
    return _createOrUpdateVault(this.vaultDataServer.updateVault.bind(this.vaultDataServer), "update", request, signatory);
  }


  /*
   * Handles a valid access request and promises to return the data from the
   * vault via VaultDataServer.
   */
  accessVault(request, signatory) {
    assert.isObject(request, "VaultKeeper createVault request");
    assert.isAddress(signatory, "VaultKeeper createVault signatory");
    try {
      // validate the request and obtain the signatory and contract
      if (request.requestType != "access") throw new errors.InvalidTransactionError("attempted to access a vault with in an invalid request type '"+request.requestType+"'");
      if (!assert.isAddress(request.contract)) throw new errors.MalformedTransactionError("Invalid request contract field", request.contract);
      const contract = new blockchain.GenericSmartDataAccessContract(request.contract);

      // Verify the signatory is permitted to access the vault and the contract
      // has not expired then access the vault
      const serverFunction = this.vaultDataServer.accessVault.bind(this.vaultDataServer);
      return contract.assertIsPermitted(signatory)
        .then(contract.assertNotExpired.bind(contract))
        .then( function(){ return serverFunction(request.contract) })
        .then(createSuccessResponse)
        .catch(createErrorResponse);

    } catch (error) {
      const exception = error instanceof errors.DatonaError ? error : new errors.TransactionError("VaultKeeper accessVault: "+error.message);
      return new Promise(function(resolve, reject) { resolve(createErrorResponse(exception)) });
    }
  }


  /*
   * Handles a valid delete request and promises to delete the vault via the
   * VaultDataServer.
   */
  deleteVault(request, signatory) {
    assert.isObject(request, "VaultKeeper createVault request");
    assert.isAddress(signatory, "VaultKeeper createVault signatory");
    try {
      // validate the request and obtain the signatory and contract
      if (request.requestType != "delete") throw new errors.InvalidTransactionError("attempted to delete a vault with in an invalid request type '"+request.requestType+"'");
      if (!assert.isAddress(request.contract)) throw new errors.MalformedTransactionError("Invalid request contract field", request.contract);
      const contract = new blockchain.GenericSmartDataAccessContract(request.contract);

      // Verify the signatory is the owner of the contract and the contract has
      // expired then delete the vault
      const serverFunction = this.vaultDataServer.deleteVault.bind(this.vaultDataServer);
      return contract.assertOwner(signatory)
        .then(contract.assertHasExpired.bind(contract))
        .then( function(){ return serverFunction(request.contract) })
        .then(createSuccessResponse)
        .catch(createErrorResponse);

    } catch (error) {
      const exception = error instanceof errors.DatonaError ? error : new errors.TransactionError("VaultKeeper deleteVault: "+error.message);
      return new Promise(function(resolve, reject) { resolve(createErrorResponse(exception)) });
    }
  }

}


/*
 * Interface.  A class that implements this interface must be given to the
 * VaultKeeper on construction to provide the data vault server capability.
 */
class VaultDataServer {

  constructor() {};

  /*
   * Unconditionally creates a new vault controlled by the given contract,
   * storing the given data.
   */
  createVault(contract, data) { throw new errors.DeveloperError("createVault has not been implemented"); };

  /*
   * Unconditionally updates the vault controlled by the given contract,
   * overwriting it with the given data.
   */
  updateVault(contract, data) { throw new errors.DeveloperError("updateVault has not been implemented"); };

  /*
   * Unconditionally obtains the data from the vault controlled by the given
   * contract.
   */
  accessVault(contract) { throw new errors.DeveloperError("accessVault has not been implemented"); };

  /*
   * Unconditionally deletes the vault controlled by the given contract.
   */
  deleteVault(contract) { throw new errors.DeveloperError("deleteVault has not been implemented"); };

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
}



/*
 * Internal Functions
 */

function _createOrUpdateVault(serverFunction, requestType, request, signatory) {
  assert.isObject(request, "VaultKeeper createVault request");
  assert.isAddress(signatory, "VaultKeeper createVault signatory");
  try {
    // validate the request and obtain the contract
    if (request.requestType != requestType) throw new errors.InvalidTransactionError("attempted to "+requestType+" a vault with in an invalid request type '"+request.requestType+"'");
    if (!assert.isAddress(request.contract)) throw new errors.MalformedTransactionError("Invalid request contract field", request.contract);
    if (!assert.isNotNull(request.data)) throw new errors.MalformedTransactionError("Missing request data field");
    const contract = new blockchain.GenericSmartDataAccessContract(request.contract);
    // Verify the signatory is the owner of the contract and the contract has
    // not expired then create or update the vault
    return contract.assertOwner(signatory)
      .then(contract.assertNotExpired.bind(contract))
      .then( function(){ return serverFunction(request.contract, request.data) })
      .then(createSuccessResponse)
      .catch(createErrorResponse);

  } catch (error) {
    const exception = error instanceof errors.DatonaError ? error : new errors.TransactionError("VaultKeeper "+requestType+"Vault: "+error.message);
    return new Promise(function(resolve, reject) { resolve(createErrorResponse(exception)) });
  }
}
