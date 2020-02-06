const chai = require('chai');
chai.use(require('chai-as-promised'));
const expect = chai.expect;
const should = chai.should();
const datona = require('../src/datona');
const DatonaErrors = datona.errors;
const RequesterServer = require('./src/requesterServer/server.js').RequesterServer;
const DatonaVaultServer = require('./src/vaultServer/server.js').DatonaVaultServer;
const sdac = require("../contracts/TestContract.json");

describe("System Scenarios", function() {

  // Ganache Mnemonic used to generate keys:
  //   foil message analyst universe oval sport super eye spot easily veteran oblige

  const owner = { // taken from Ganache
    privateKey: "24802edc1eba0f578dcffd6ada3c5b954a8e76e55ba830cf19a3083d489a6063",
    address: "0xc16a409a39EDe3F38E212900f8d3afe6aa6A8929"
  };
  const ownerKey = new datona.crypto.Key(owner.privateKey);

  const requester = { // taken from Ganache
    privateKey: "e68e40257cfee330038c49637fcffff82fae04b9c563f4ea071c20f2eb55063c",
    address: "0x41A60F71063CD7c9e5247d3E7d551f91f94b5C3b"
  };
  const requesterKey = new datona.crypto.Key(requester.privateKey);

  const vaultOwner = { // taken from Ganache
    privateKey: "ae139af24306ecac804cfe974398d6d76361287d7b96d9e165d9bcb99a64b6ce",
    address: "0x288b32F2653C1d72043d240A7F938a114Ab69584"
  };
  const vaultKey = new datona.crypto.Key(vaultOwner.privateKey);

  // Requester Server
  var requesterServer;
  const requesterServerConfig = {
    url: {
      scheme: "file",
      host: "localhost",
      port: 8963
    },
    suppressLogs: true // set to false to debug server
  }

  // Vault Server
  var vaultServer;
  const vaultServerConfig = {
    url: {
      scheme: "file",
      host: "localhost",
      port: 8124
    },
    suppressLogs: true // set to false to debug server
  }

  before( function() {
    requesterServer = new RequesterServer(requesterServerConfig.url.port, requesterKey, requesterServerConfig.suppressLogs);
    vaultServer = new DatonaVaultServer(vaultServerConfig.url.port, vaultKey, vaultServerConfig.suppressLogs);
  });


  const sdaRequest = {
    txnType: "SmartDataAccessRequest",
    version: "0.0.1",
    contract: {
      hash: "3ea2f1d0abf3fc66cf29eebb70cbd4e7fe762ef8a09bcc06c8edf641230afec0"
    },
    api: {
      url: requesterServerConfig.url,
      acceptTransaction: {},
      rejectTransaction: {}
    }
  };
  const sdaRequestStr = datona.comms.encodeTransaction(sdaRequest, requesterKey);


  function checkErrorResponse(txnType, response, errorName, errorMessage) {
    expect(response.txnType).to.equal(txnType);
    expect(response.responseType).to.equal("error");
    expect(response.error).to.be.an.instanceof(Object);
    if (response.error.name != errorName) console.log(response);  // debug
    if (errorName) expect(response.error.name).to.equal(errorName);
    if (errorMessage) expect(response.error.message).to.match(new RegExp(errorMessage));
  }


  describe("Primary use case", function(){

    const contract = new datona.blockchain.Contract(sdac.abi);

    var request;

    it( "receive request", function(){
      request = new datona.comms.SmartDataAccessRequest(sdaRequestStr, ownerKey);
    });

    it( "deploy contract", function(){
      return contract.deploy(ownerKey, sdac.bytecode, [requester.address, 10])
        .then( function(contractAddress){
          expect(contractAddress).to.match(/^0x[0-9a-fA-F]{40}$/);
        });
    }).timeout(200000);

    it( "create vault", function(){
      const vault = new datona.vault.RemoteVault({scheme: "file", host: vaultServerConfig.url.host, port: vaultServerConfig.url.port}, contract.address, ownerKey, vaultOwner.address);
      return vault.create("Hello World!")
        .then( function(response){
          expect(response.signatory.toLowerCase()).to.equal(vaultOwner.address.toLowerCase());
          expect(response.txn.txnType).to.equal("VaultResponse");
          if (response.txn.responseType == "error") console.error(response.txn.error);
          expect(response.txn.responseType).to.equal("success");
        });
    });

    it( "[create the same vault again fails]", function(){
      const vault = new datona.vault.RemoteVault({scheme: "file", host: vaultServerConfig.url.host, port: vaultServerConfig.url.port}, contract.address, ownerKey, vaultOwner.address);
      return vault.create("Hello World!")
        .should.eventually.be.rejectedWith(DatonaErrors.VaultError, "attempt to create a vault that already exists");
    });

    it( "inform requester", function(){
      return request.accept(contract.address, vaultOwner.address, vaultServerConfig.url)
        .then( function(response){
          if (response.txn.responseType == "error") console.error(response.txn.error);
          expect(response.txn.responseType).to.equal("success");
          expect(requesterServer.sdaResponse.txnType).to.equal("SmartDataAccessResponse");
          expect(requesterServer.sdaResponse.responseType).to.equal("accept");
          expect(requesterServer.sdaResponse.contract).to.equal(contract.address);
          expect(requesterServer.sdaResponse.vaultAddress).to.equal(vaultOwner.address);
          expect(requesterServer.sdaResponse.vaultUrl.scheme).to.equal(vaultServerConfig.url.scheme);
          expect(requesterServer.sdaResponse.vaultUrl.host).to.equal(vaultServerConfig.url.host);
          expect(requesterServer.sdaResponse.vaultUrl.port).to.equal(vaultServerConfig.url.port);
        });
    });

    it( "access the vault", function(){
      const vault = new datona.vault.RemoteVault(vaultServerConfig.url, contract.address, requesterKey, vaultOwner.address);
      return vault.access()
        .then( function(data){
          expect(data).to.equal("Hello World!");
        });
    });

    it( "[attempt to access by non-permitted address fails with PermissionError]", function(){
      const vault = new datona.vault.RemoteVault(vaultServerConfig.url, contract.address, ownerKey, vaultOwner.address);
      return vault.access()
        .should.eventually.be.rejectedWith(DatonaErrors.PermissionError, "permission denied");

    });

    it( "update the vault with new data", function(){
      const vault = new datona.vault.RemoteVault({scheme: "file", host: vaultServerConfig.url.host, port: vaultServerConfig.url.port}, contract.address, ownerKey, vaultOwner.address);
      return vault.update("Greasy chips")
        .then( function(response){
          expect(response.signatory.toLowerCase()).to.equal(vaultOwner.address.toLowerCase());
          expect(response.txn.txnType).to.equal("VaultResponse");
          if (response.txn.responseType == "error") console.error(response.txn.error);
          expect(response.txn.responseType).to.equal("success");
        });
    });

    it( "access the vault returns the new data", function(){
      const vault = new datona.vault.RemoteVault({scheme: "file", host: vaultServerConfig.url.host, port: vaultServerConfig.url.port}, contract.address, requesterKey, vaultOwner.address);
      return vault.access()
        .then( function(data){
          expect(data).to.equal("Greasy chips");
        });
    });

    it( "[trying to terminate the vault before the contract has expired fails]", function(){
      const vault = new datona.vault.RemoteVault({scheme: "file", host: vaultServerConfig.url.host, port: vaultServerConfig.url.port}, contract.address, ownerKey, vaultOwner.address);
      return vault.delete()
        .should.eventually.be.rejectedWith(DatonaErrors.ContractExpiryError, "contract has not expired");
    });

    it( "owner terminates the contract", function(){
      return contract.terminate(ownerKey)
        .then( function(receipt){
          expect(receipt.status).to.equal(true);
        });
    }).timeout(200000);

    it( "can no longer access the vault", function(){
      const vault = new datona.vault.RemoteVault({scheme: "file", host: vaultServerConfig.url.host, port: vaultServerConfig.url.port}, contract.address, requesterKey, vaultOwner.address);
      return vault.access()
        .should.eventually.be.rejectedWith(DatonaErrors.PermissionError, "permission denied");
    });

    it( "owner succesfully deletes the vault", function(){
      const vault = new datona.vault.RemoteVault({scheme: "file", host: vaultServerConfig.url.host, port: vaultServerConfig.url.port}, contract.address, ownerKey, vaultOwner.address);
      return vault.delete()
        .then( function(response){
          expect(response.signatory.toLowerCase()).to.equal(vaultOwner.address.toLowerCase());
          expect(response.txn.txnType).to.equal("VaultResponse");
          if (response.txn.responseType == "error") console.error(response.txn.error);
          expect(response.txn.responseType).to.equal("success");
        });
    });

  });


  after( function(){
    requesterServer.close();
    vaultServer.close();
  });

});
