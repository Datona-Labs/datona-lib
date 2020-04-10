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

  // From TestContract.sol...
  // Permissions are set to support a variety of tests:
  //   - Vault Root: owner:rwa, requester:r
  //   - File 1: owner:wa, requester:r
  //   - File 2: owner:r, requester:w
  //   - File 3: owner:r, requester:a
  //   - File 4: owner:r, requester:drwa
  //   - File 5: owner:rwa, requester:-
  const file1 = "0x0000000000000000000000000000000000000001";
  const file2 = "0x0000000000000000000000000000000000000002";
  const file3 = "0x0000000000000000000000000000000000000003";
  const file4 = "0x0000000000000000000000000000000000000004";
  const file5 = "0x0000000000000000000000000000000000000005";

    // Requester Server
  var requesterServer;
  const requesterServerConfig = {
    url: {
      scheme: "file",
      host: "localhost",
      port: 8963
    },
    suppressLogs: true // set to false to debug server
  };

  // Vault Server
  var vaultServer;
  const vaultServerConfig = {
    url: {
      scheme: "file",
      host: "localhost",
      port: 8124
    },
    suppressLogs: true // set to false to debug server
  };

  before( function() {
    requesterServer = new RequesterServer(requesterServerConfig.url.port, requesterKey, requesterServerConfig.suppressLogs);
    vaultServer = new DatonaVaultServer(vaultServerConfig.url.port, vaultKey, vaultServerConfig.suppressLogs);
  });


  const sdaRequest = {
    txnType: "SmartDataAccessRequest",
    version: "0.0.1",
    contract: {
      hash: "3ea2f1d0abf3fc66cf29eebb70cbd4e7fe762ef8a09bcc06c8edf641230afec0"   // TestContract
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

/*
 * Scenario-1 Basic Data Share
 *
 * Most basic use of a data vault:
 *   - Owner deploys a vault with 'Hello World!' and informs the Requester.
 *   - Requester reads the vault
 *   - Owner updates the vault with a new message
 *   - Requester reads the vault and receives the new message
 *   - Owner appends a string to the vault
 *   - Requester reads the vault and receives the newly appended string
 *   - Owner terminates the contract
 *   - Requester can no longer read the vault
 *   - Owner instructs the vault service to delete the vault
 *
 * During this test scenario, various negative checks are made:
 *   - Owner tries to create the same vault twice
 *   - A non-permitted user attempts to access the vault
 *   - Requester attempts to write to the vault
 *   - Owner tries to delete the vault before the contract has been terminated
 */
  describe("Scenario 1 - Basic Data Share", function(){

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
      return vault.create()
        .then( function(response){
          expect(response.signatory.toLowerCase()).to.equal(vaultOwner.address.toLowerCase());
          expect(response.txn.txnType).to.equal("VaultResponse");
          if (response.txn.responseType == "error") console.error(response.txn.error);
          expect(response.txn.responseType).to.equal("success");
        });
    });

    it( "[create the same vault again fails]", function(){
      const vault = new datona.vault.RemoteVault({scheme: "file", host: vaultServerConfig.url.host, port: vaultServerConfig.url.port}, contract.address, ownerKey, vaultOwner.address);
      return vault.create()
        .should.eventually.be.rejectedWith(DatonaErrors.VaultError, "attempt to create a vault that already exists");
    });

    it( "write to the vault", function(){
      const vault = new datona.vault.RemoteVault({scheme: "file", host: vaultServerConfig.url.host, port: vaultServerConfig.url.port}, contract.address, ownerKey, vaultOwner.address);
      return vault.write("Hello World!")
          .then( function(response){
            expect(response.signatory.toLowerCase()).to.equal(vaultOwner.address.toLowerCase());
            expect(response.txn.txnType).to.equal("VaultResponse");
            if (response.txn.responseType == "error") console.error(response.txn.error);
            expect(response.txn.responseType).to.equal("success");
          });
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
      return vault.read()
        .then( function(data){
          expect(data).to.equal("Hello World!");
        });
    });

    it( "[attempt to access by non-permitted address fails with PermissionError]", function(){
      const vault = new datona.vault.RemoteVault({scheme: "file", host: vaultServerConfig.url.host, port: vaultServerConfig.url.port}, contract.address, vaultKey, vaultOwner.address);
      return vault.read()
        .should.eventually.be.rejectedWith(DatonaErrors.PermissionError, "permission denied");

    });

    it( "update the vault with new data", function(){
      const vault = new datona.vault.RemoteVault({scheme: "file", host: vaultServerConfig.url.host, port: vaultServerConfig.url.port}, contract.address, ownerKey, vaultOwner.address);
      return vault.write("Greasy chips")
        .then( function(response){
          expect(response.signatory.toLowerCase()).to.equal(vaultOwner.address.toLowerCase());
          expect(response.txn.txnType).to.equal("VaultResponse");
          if (response.txn.responseType == "error") console.error(response.txn.error);
          expect(response.txn.responseType).to.equal("success");
        });
    });

    it( "access the vault returns the new data", function(){
      const vault = new datona.vault.RemoteVault({scheme: "file", host: vaultServerConfig.url.host, port: vaultServerConfig.url.port}, contract.address, requesterKey, vaultOwner.address);
      return vault.read()
        .then( function(data){
          expect(data).to.equal("Greasy chips");
        });
    });

    it( "[attempt to write to root vault by address with only read access fails with PermissionError]", function(){
      const vault = new datona.vault.RemoteVault({scheme: "file", host: vaultServerConfig.url.host, port: vaultServerConfig.url.port}, contract.address, requesterKey, vaultOwner.address);
      return vault.write("Requester says hello")
        .should.eventually.be.rejectedWith(DatonaErrors.PermissionError, "permission denied");
    });

    it( "[attempt to append to root vault by address with only read access fails with PermissionError]", function(){
      const vault = new datona.vault.RemoteVault({scheme: "file", host: vaultServerConfig.url.host, port: vaultServerConfig.url.port}, contract.address, requesterKey, vaultOwner.address);
      return vault.append("Requester says hello again")
        .should.eventually.be.rejectedWith(DatonaErrors.PermissionError, "permission denied");
    });

    it( "access the vault returns the same data", function(){
      const vault = new datona.vault.RemoteVault({scheme: "file", host: vaultServerConfig.url.host, port: vaultServerConfig.url.port}, contract.address, requesterKey, vaultOwner.address);
      return vault.read()
        .then( function(data){
          expect(data).to.equal("Greasy chips");
        });
    });

    it( "append the vault with new data", function(){
      const vault = new datona.vault.RemoteVault({scheme: "file", host: vaultServerConfig.url.host, port: vaultServerConfig.url.port}, contract.address, ownerKey, vaultOwner.address);
      return vault.append(" and mushy peas")
        .then( function(response){
          expect(response.signatory.toLowerCase()).to.equal(vaultOwner.address.toLowerCase());
          expect(response.txn.txnType).to.equal("VaultResponse");
          if (response.txn.responseType == "error") console.error(response.txn.error);
          expect(response.txn.responseType).to.equal("success");
        });
    });

    it( "access the vault returns the new and appended data", function(){
      const vault = new datona.vault.RemoteVault({scheme: "file", host: vaultServerConfig.url.host, port: vaultServerConfig.url.port}, contract.address, requesterKey, vaultOwner.address);
      return vault.read()
        .then( function(data){
          expect(data).to.equal("Greasy chips and mushy peas");
        });
    });

    //
    // Termination
    //

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
      return vault.read()
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


  /*
   * Scenario 2 - One file for owner data, another for Requester to append log entries
   *
   * Most basic use of a data vault:
   *   - Owner deploys a vault with 'Hello World!' in a file.
   *   - Requester reads the owner's vault file
   *   - Requester appends a log entry to a different file
   *   - Owner reads the log
   *   - Owner updates his vault file with a new message
   *   - Requester reads the owner's file and receives the new message
   *   - Requester appends another log entry
   *   - Owner reads the log
   *   - Owner terminates the contract
   *   - Requester can no longer read the vault
   *   - Owner can no longer read the log
   *   - Owner instructs the vault service to delete the vault
   *
   * During this test scenario, various negative checks are made:
   *   - A non-permitted user attempts to access a vault file
   *   - The owner attempts to read the requester's log but it doesn't exist yet
   *   - Requester attempts to overwrite the log file
   *
   * Owner's file uses TestContract file 1: owner:wa, requester:r
   * Requester's log uses TestContract File 3: owner:r, requester:a
   */
  describe("Scenario 2 - One file for owner data, another for Requester to append log entries", function(){

    const contract = new datona.blockchain.Contract(sdac.abi);
    var request;

    const ownersFile = file1;
    const requestersLog = file3;

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
      return vault.create()
        .then( function(response){
          expect(response.signatory.toLowerCase()).to.equal(vaultOwner.address.toLowerCase());
          expect(response.txn.txnType).to.equal("VaultResponse");
          if (response.txn.responseType == "error") console.error(response.txn.error);
          expect(response.txn.responseType).to.equal("success");
        });
    });

    it( "Owner writes to his file", function(){
      const vault = new datona.vault.RemoteVault({scheme: "file", host: vaultServerConfig.url.host, port: vaultServerConfig.url.port}, contract.address, ownerKey, vaultOwner.address);
      return vault.write("Hello World!", ownersFile)
        .then( function(response){
          expect(response.signatory.toLowerCase()).to.equal(vaultOwner.address.toLowerCase());
          expect(response.txn.txnType).to.equal("VaultResponse");
          if (response.txn.responseType == "error") console.error(response.txn.error);
          expect(response.txn.responseType).to.equal("success");
        });
    });

    it( "Requester reads the owner's file", function(){
      const vault = new datona.vault.RemoteVault(vaultServerConfig.url, contract.address, requesterKey, vaultOwner.address);
      return vault.read(ownersFile)
        .then( function(data){
          expect(data).to.equal("Hello World!");
        });
    });

    it( "[attempt to access by non-permitted address fails with PermissionError]", function(){
      const vault = new datona.vault.RemoteVault({scheme: "file", host: vaultServerConfig.url.host, port: vaultServerConfig.url.port}, contract.address, ownerKey, vaultOwner.address);
      return vault.read(ownersFile)
        .should.eventually.be.rejectedWith(DatonaErrors.PermissionError, "permission denied");
    });

    it( "[attempt to access non-existent file fails]", function(){
      const vault = new datona.vault.RemoteVault({scheme: "file", host: vaultServerConfig.url.host, port: vaultServerConfig.url.port}, contract.address, ownerKey, vaultOwner.address);
      return vault.read(requestersLog)
        .should.eventually.be.rejected;
    });

    it( "Requester writes first log entry", function(){
      const vault = new datona.vault.RemoteVault({scheme: "file", host: vaultServerConfig.url.host, port: vaultServerConfig.url.port}, contract.address, requesterKey, vaultOwner.address);
      return vault.append("Data accepted", requestersLog)
        .then( function(response){
          expect(response.signatory.toLowerCase()).to.equal(vaultOwner.address.toLowerCase());
          expect(response.txn.txnType).to.equal("VaultResponse");
          if (response.txn.responseType == "error") console.error(response.txn.error);
          expect(response.txn.responseType).to.equal("success");
        });
    });

    it( "Owner updates their data", function(){
      const vault = new datona.vault.RemoteVault({scheme: "file", host: vaultServerConfig.url.host, port: vaultServerConfig.url.port}, contract.address, ownerKey, vaultOwner.address);
      return vault.write("Hi World!", ownersFile)
        .then( function(response){
          expect(response.signatory.toLowerCase()).to.equal(vaultOwner.address.toLowerCase());
          expect(response.txn.txnType).to.equal("VaultResponse");
          if (response.txn.responseType == "error") console.error(response.txn.error);
          expect(response.txn.responseType).to.equal("success");
        });
    });

    it( "Requester reads new owner data", function(){
      const vault = new datona.vault.RemoteVault({scheme: "file", host: vaultServerConfig.url.host, port: vaultServerConfig.url.port}, contract.address, requesterKey, vaultOwner.address);
      return vault.read(ownersFile)
        .then( function(data){
          expect(data).to.equal("Hi World!");
        });
    });

    it( "Requester appends second log entry", function(){
      const vault = new datona.vault.RemoteVault({scheme: "file", host: vaultServerConfig.url.host, port: vaultServerConfig.url.port}, contract.address, requesterKey, vaultOwner.address);
      return vault.append("\nUpdated data accepted", requestersLog)
        .then( function(response){
          expect(response.signatory.toLowerCase()).to.equal(vaultOwner.address.toLowerCase());
          expect(response.txn.txnType).to.equal("VaultResponse");
          if (response.txn.responseType == "error") console.error(response.txn.error);
          expect(response.txn.responseType).to.equal("success");
        });
    });

    it( "[Requester attempts to overwrite the log file. Fails with PermissionError]", function(){
      const vault = new datona.vault.RemoteVault({scheme: "file", host: vaultServerConfig.url.host, port: vaultServerConfig.url.port}, contract.address, requesterKey, vaultOwner.address);
      return vault.write("Requester says hello", requestersLog)
        .should.eventually.be.rejectedWith(DatonaErrors.PermissionError, "permission denied");
    });

    it( "Owner reads the requester's log", function(){
      const vault = new datona.vault.RemoteVault({scheme: "file", host: vaultServerConfig.url.host, port: vaultServerConfig.url.port}, contract.address, ownerKey, vaultOwner.address);
      return vault.read(requestersLog)
        .then( function(data){
          expect(data).to.equal("Data accepted\nUpdated data accepted");
        });
    });

    //
    // Termination
    //

    it( "owner terminates the contract", function(){
      return contract.terminate(ownerKey)
        .then( function(receipt){
          expect(receipt.status).to.equal(true);
        });
    }).timeout(200000);

    it( "Requester can no longer access the vault", function(){
      const vault = new datona.vault.RemoteVault({scheme: "file", host: vaultServerConfig.url.host, port: vaultServerConfig.url.port}, contract.address, requesterKey, vaultOwner.address);
      return vault.read(ownersFile)
        .should.eventually.be.rejectedWith(DatonaErrors.PermissionError, "permission denied");
    });

    it( "Owner can no longer access the requester's log", function(){
      const vault = new datona.vault.RemoteVault({scheme: "file", host: vaultServerConfig.url.host, port: vaultServerConfig.url.port}, contract.address, ownerKey, vaultOwner.address);
      return vault.read(requestersLog)
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
    datona.blockchain.close();
  });

});
