const chai = require('chai');
chai.use(require('chai-as-promised'));
const expect = chai.expect;
const should = chai.should();
const datona = require("../src/datona");
const DatonaErrors = datona.errors;
const net = require('net');


describe("Vault", function() {

  // Ganache Mnemonic used to generate keys:
  //   foil message analyst universe oval sport super eye spot easily veteran oblige
  const owner = { // taken from Ganache
    privateKey: "b94452c533536500e30f2253c96d123133ca1cbdb987556c2dc229573a2cd53c",
    address: "0xfb3e6dd29d01c1b5b99e46db3fe26df1138b73d1"
  };
  const ownerKey = new datona.crypto.Key(owner.privateKey);

  const requester = { // taken from Ganache
    privateKey: "e68e40257cfee330038c49637fcffff82fae04b9c563f4ea071c20f2eb55063c",
    address: "0x41A60F71063CD7c9e5247d3E7d551f91f94b5C3b"
  };
  const requesterKey = new datona.crypto.Key(requester.privateKey);

  const contractAddress = "0x288b32F2653C1d72043d240A7F938a114Ab69584";  // random address


  describe("RemoteVault", function() {

    const portNumber = 9864;

    class Server{

      constructor(key){
        this.server = net.createServer(this.connection);
        this.server.parent = this;
        this.server.listen(portNumber, ()=>{});
        this.server.key = key;
        this.clear();
      }

      connection(c){
        c.on('end', () => { });
        c.on('data', (data) => {
          this.parent.data += data.toString();
          c.write(datona.comms.encodeTransaction({txnType: "VaultResponse", responseType: "success", data: "RemoteVault Server says 'Hello'"}, this.key));
        });
      }

      clear(){ this.data = ""; }
      close(){ this.server.close() }

    }

    const serverUrl = {
      scheme: "file",
      host: "localhost",
      port: portNumber
    }


    describe("constructor", function() {

      it("throws a DatonaError if the url parameter is missing", function() {
        expect(function() {
          new datona.vault.RemoteVault()
        }).to.throw(DatonaErrors.VaultError, "url is missing");
      });

      it("throws a DatonaError if the url parameter is the wrong type", function() {
        expect(function() {
          new datona.vault.RemoteVault("localhost:9864", contractAddress, ownerKey, requester.address)
        }).to.throw(DatonaErrors.VaultError, "invalid type. Expected Object");
      });

      it("throws a DatonaError if the url scheme is missing", function() {
        expect(function() {
          new datona.vault.RemoteVault({host: "localhost", port: portNumber}, contractAddress, ownerKey, requester.address)
        }).to.throw(DatonaErrors.VaultError, "scheme is missing");
      });

      it("throws a DatonaError if the url host is missing", function() {
        expect(function() {
          new datona.vault.RemoteVault({scheme: "file", port: portNumber}, contractAddress, ownerKey, requester.address)
        }).to.throw(DatonaErrors.VaultError, "host is missing");
      });

      it("throws a DatonaError if the url port is missing", function() {
        expect(function() {
          new datona.vault.RemoteVault({scheme: "file", host: "localhost"}, contractAddress, ownerKey, requester.address)
        }).to.throw(DatonaErrors.VaultError, "port is missing");
      });

      it("throws a DatonaError if the contractAddress parameter is missing", function() {
        expect(function() {
          new datona.vault.RemoteVault(serverUrl, undefined, ownerKey, requester.address)
        }).to.throw(DatonaErrors.VaultError, "contractAddress is missing");
      });

      it("throws a DatonaError if the contractAddress parameter is the wrong type", function() {
        expect(function() {
          new datona.vault.RemoteVault(serverUrl, 1234, ownerKey, requester.address)
        }).to.throw(DatonaErrors.VaultError, "invalid type. Expected address");
      });

      it("throws a DatonaError if the contractAddress parameter is invalid", function() {
        expect(function() {
          new datona.vault.RemoteVault(serverUrl, contractAddress+"0", ownerKey, requester.address)
        }).to.throw(DatonaErrors.VaultError, "invalid type. Expected address");
      });

      it("throws a DatonaError if the ownerKey parameter is missing", function() {
        expect(function() {
          new datona.vault.RemoteVault(serverUrl, contractAddress, undefined, requester.address)
        }).to.throw(DatonaErrors.VaultError, "localPrivateKey is missing");
      });

      it("throws a DatonaError if the ownerKey parameter is the wrong type", function() {
        expect(function() {
          new datona.vault.RemoteVault(serverUrl, contractAddress, "my key", requester.address)
        }).to.throw(DatonaErrors.VaultError, "invalid type. Expected Key");
      });

      it("throws a DatonaError if the remoteAddress parameter is missing", function() {
        expect(function() {
          new datona.vault.RemoteVault(serverUrl, contractAddress, ownerKey, undefined)
        }).to.throw(DatonaErrors.VaultError, "remoteAddress is missing");
      });

      it("throws a DatonaError if the remoteAddress parameter is the wrong type", function() {
        expect(function() {
          new datona.vault.RemoteVault(serverUrl, contractAddress, ownerKey, requester)
        }).to.throw(DatonaErrors.VaultError, "invalid type. Expected address");
      });

      it("throws a DatonaError if the remoteAddress parameter is invalid", function() {
        expect(function() {
          new datona.vault.RemoteVault(serverUrl, contractAddress, ownerKey, requester.address+"0")
        }).to.throw(DatonaErrors.VaultError, "invalid type. Expected address");
      });

      it("can be constructed with valid parameters", function(){
        expect(function() {
          new datona.vault.RemoteVault(serverUrl, contractAddress, ownerKey, requester.address)
        }).to.not.throw();
      });

    });


    describe("create", function() {

      it("throws a DatonaError if the data parameter is missing", function() {
        expect(function() {
          const vault = new datona.vault.RemoteVault(serverUrl, contractAddress, ownerKey, requester.address);
          vault.create();
        }).to.throw(DatonaErrors.TypeError, "data is missing");
      });

      it("sends the correct create request to the server", function() {
        const server = new Server(requesterKey);
        const vault = new datona.vault.RemoteVault(serverUrl, contractAddress, ownerKey, requester.address);
        const data = "Hello World!";
        return vault.create(data)
          .then( function(response){
            server.close();
            expect(response.txn.txnType).to.equal("VaultResponse");
            expect(response.txn.responseType).to.equal("success");
            expect(server.data.length).to.be.gt(0);
            const serverPacket = datona.comms.decodeTransaction(server.data);
            expect(serverPacket.signatory).to.equal(owner.address);
            expect(serverPacket.txn.txnType).to.equal("VaultRequest");
            expect(serverPacket.txn.requestType).to.equal("create");
            expect(serverPacket.txn.contract).to.equal(contractAddress);
            expect(serverPacket.txn.data).to.equal(data);
          })
          .catch( function(error){
            server.close();
            throw error;
          });
      }).timeout(5000);

    });


    describe("update", function() {

      it("throws a DatonaError if the data parameter is missing", function() {
        expect(function() {
          const vault = new datona.vault.RemoteVault(serverUrl, contractAddress, ownerKey, requester.address);
          vault.create();
        }).to.throw(DatonaErrors.TypeError, "data is missing");
      });

      it("sends the correct update request to the server", function() {
        const server = new Server(requesterKey);
        const vault = new datona.vault.RemoteVault(serverUrl, contractAddress, ownerKey, requester.address);
        const data = "Hello World!";
        return vault.update(data)
          .then( function(response){
            server.close();
            expect(response.txn.txnType).to.equal("VaultResponse");
            expect(response.txn.responseType).to.equal("success");
            expect(server.data.length).to.be.gt(0);
            const serverPacket = datona.comms.decodeTransaction(server.data);
            expect(serverPacket.signatory).to.equal(owner.address);
            expect(serverPacket.txn.txnType).to.equal("VaultRequest");
            expect(serverPacket.txn.requestType).to.equal("update");
            expect(serverPacket.txn.contract).to.equal(contractAddress);
            expect(serverPacket.txn.data).to.equal(data);
          })
          .catch( function(error){
            server.close();
            throw error;
          });
      }).timeout(5000);

    });


    describe("access", function() {

      it("sends the correct access request to the server", function() {
        const server = new Server(requesterKey);
        const vault = new datona.vault.RemoteVault(serverUrl, contractAddress, ownerKey, requester.address);
        return vault.access()
          .then( function(data){
            server.close();
            expect(data).to.equal("RemoteVault Server says 'Hello'");
            expect(server.data.length).to.be.gt(0);
            const serverPacket = datona.comms.decodeTransaction(server.data);
            expect(serverPacket.signatory).to.equal(owner.address);
            expect(serverPacket.txn.txnType).to.equal("VaultRequest");
            expect(serverPacket.txn.requestType).to.equal("access");
            expect(serverPacket.txn.contract).to.equal(contractAddress);
          })
          .catch( function(error){
            server.close();
            throw error;
          });
      }).timeout(5000);

    });


    describe("delete", function() {

      it("sends the correct delete request to the server", function() {
        const server = new Server(requesterKey);
        const vault = new datona.vault.RemoteVault(serverUrl, contractAddress, ownerKey, requester.address);
        return vault.delete()
          .then( function(response){
            server.close();
            expect(response.txn.txnType).to.equal("VaultResponse");
            expect(response.txn.responseType).to.equal("success");
            expect(server.data.length).to.be.gt(0);
            const serverPacket = datona.comms.decodeTransaction(server.data);
            expect(serverPacket.signatory).to.equal(owner.address);
            expect(serverPacket.txn.txnType).to.equal("VaultRequest");
            expect(serverPacket.txn.requestType).to.equal("delete");
            expect(serverPacket.txn.contract).to.equal(contractAddress);
          })
          .catch( function(error){
            server.close();
            throw error;
          });
      }).timeout(5000);

    });

  });


  describe("VaultKeeper", function(){

    /*
     * Stubbed VaultDataServer
     */
    class MyDataServer extends datona.vault.VaultDataServer {

      createVault(contract, data){
        return {request: "create", contract: contract, data: data};
      }

      updateVault(contract, data){
        return {request: "update", contract: contract, data: data};
      }

      accessVault(contract){
        return {request: "access", contract: contract};
      }

      deleteVault(contract){
        return {request: "delete", contract: contract};
      }

    }


    /*
     * Stubbed smart contract
     */

    var copyOfGenericSmartDataAccessContract;
    var contractStub = { owner: undefined, requester: undefined, expired: undefined };

    class TestContract {

      constructor(){}

      assertOwner(address){
        return new Promise( function(resolve, reject){
          if( address.toLowerCase() == contractStub.owner.toLowerCase() ) resolve();
          else{ reject(new DatonaErrors.ContractOwnerError()) };
        });
      }

      assertNotExpired(){
        return new Promise( function(resolve, reject){
          if( !contractStub.expired ) resolve();
          else( reject(new DatonaErrors.ContractExpiryError()) );
        });
      }

      assertHasExpired(){
        return new Promise( function(resolve, reject){
          if( contractStub.expired ) resolve();
          else( reject(new DatonaErrors.ContractExpiryError()) );
        });
      }

      assertIsPermitted(address){
        return new Promise( function(resolve, reject){
          if( address.toLowerCase() == contractStub.requester.toLowerCase() ) resolve();
          else( reject(new DatonaErrors.PermissionError()) );
        });
      }

    }


    function checkErrorResponse(response, errorName, errorMessage) {
      expect(response.txnType).to.equal("VaultResponse");
      expect(response.responseType).to.equal("error");
      expect(response.error).to.be.an.instanceof(Object);
      if (errorName) expect(response.error.name).to.equal(errorName);
      if (errorMessage) expect(response.error.message).to.equal(errorMessage);
    }

    function checkSignedErrorResponse(signedResponse, errorName, errorMessage) {
      const response = datona.comms.decodeTransaction(signedResponse);
      expect(response.signatory.toLowerCase()).to.equal(requester.address.toLowerCase());
      checkErrorResponse(response.txn, errorName, errorMessage);
    }

    before( function(){
      // Stub the contract class
      copyOfGenericSmartDataAccessContract = datona.blockchain.GenericSmartDataAccessContract;
      datona.blockchain.GenericSmartDataAccessContract = TestContract;
    })


    describe("constructor", function(){

      it("throws a DatonaError if the vaultDataServer parameter is missing", function() {
        expect(function() {
          new datona.vault.VaultKeeper()
        }).to.throw(DatonaErrors.TypeError, "vaultDataServer is missing");
      });

      it("throws a DatonaError if the vaultDataServer parameter is the wrong type", function() {
        expect(function() {
          new datona.vault.VaultKeeper("wrong type");
        }).to.throw(DatonaErrors.TypeError, "invalid type. Expected VaultDataServer");
      });

      it("throws a DatonaError if the key parameter is missing", function() {
        expect(function() {
          class MyDataServer extends datona.vault.VaultDataServer {}
          const dataServer = new MyDataServer();
          new datona.vault.VaultKeeper(dataServer);
        }).to.throw(DatonaErrors.TypeError, "key is missing");
      });

      it("throws a DatonaError if the key parameter is the wrong type", function() {
        expect(function() {
          class MyDataServer extends datona.vault.VaultDataServer {}
          const dataServer = new MyDataServer();
          new datona.vault.VaultKeeper(dataServer, requester.privateKey);
        }).to.throw(DatonaErrors.TypeError, "invalid type. Expected Key");
      });

      it("can be constructed with valid parameters", function(){
        expect(function() {
          class MyDataServer extends datona.vault.VaultDataServer {}
          const dataServer = new MyDataServer();
          new datona.vault.VaultKeeper(dataServer, requesterKey);
        }).to.not.throw();
      });

    });


    describe("handleSignedRequest", function(){

      const dataServer = new MyDataServer();
      const keeper = new datona.vault.VaultKeeper(dataServer, requesterKey);

      it("throws a DatonaError if the signedRequestStr parameter is missing", function() {
        expect(function() {
          keeper.handleSignedRequest();
        }).to.throw(DatonaErrors.TypeError, "signedRequestStr is missing");
      });

      it("throws a DatonaError if the signedRequestStr parameter is the wrong type", function() {
        expect(function() {
          keeper.handleSignedRequest( {obj: "not a string"} );
        }).to.throw(DatonaErrors.TypeError, "invalid type. Expected string");
      });

      it("resolves an error response with a DatonaError if the request is not a JSON formatted string", function() {
        return keeper.handleSignedRequest( "not a JSON object" )
          .then( function(signedResponse){
            checkSignedErrorResponse(signedResponse, "MalformedTransactionError");
          });
      });

      it("resolves an error response with a DatonaError if the request is invalid", function() {
        return keeper.handleSignedRequest( "{}" )
          .then( function(signedResponse){
            checkSignedErrorResponse(signedResponse, "MalformedTransactionError");
          });
      });

      it("resolves an error response with a DatonaError if the request does not have a txnType element", function() {
        const request = {requestType: "create", contract: contractAddress, data: "Hello World!"};
        const requestStr = datona.comms.encodeTransaction(request, ownerKey);
        return keeper.handleSignedRequest(requestStr)
          .then( function(signedResponse){
            checkSignedErrorResponse(signedResponse, "RequestError", "Invalid transaction type ('undefined')");
          });
      });

      it("resolves an error response with a DatonaError if the request has an incorrect txnType", function() {
        const request = {txnType: "SmartDataAccessRequest", requestType: "create", contract: contractAddress, data: "Hello World!"};
        const requestStr = datona.comms.encodeTransaction(request, ownerKey);
        return keeper.handleSignedRequest(requestStr)
          .then( function(signedResponse){
            checkSignedErrorResponse(signedResponse, "RequestError", "Invalid transaction type ('SmartDataAccessRequest')");
          });
      });

      it("resolves an error response with a DatonaError if the request does not have a type element", function() {
        const request = {txnType: "VaultRequest", contract: contractAddress, data: "Hello World!"};
        const requestStr = datona.comms.encodeTransaction(request, ownerKey);
        return keeper.handleSignedRequest(requestStr)
          .then( function(signedResponse){
            checkSignedErrorResponse(signedResponse, "InvalidTransactionError", "Invalid request type ('undefined')");
          });
      });

      it("resolves an error response with a DatonaError if the request has an unknown type", function() {
        const request = {txnType: "VaultRequest", requestType: "barney", contract: contractAddress, data: "Hello World!"};
        const requestStr = datona.comms.encodeTransaction(request, ownerKey);
        return keeper.handleSignedRequest(requestStr)
          .then( function(signedResponse){
            checkSignedErrorResponse(signedResponse, "InvalidTransactionError", "Invalid request type ('barney')");
          });
      });

    });


    function testParameters(func, requestType){

      it("throws a DatonaError if the request parameter is missing", function() {
        expect(function() {
          func();
        }).to.throw(DatonaErrors.TypeError, "request is missing");
      });

      it("throws a DatonaError if the request parameter is the wrong type", function() {
        expect(function() {
          func("not an object", owner.address );
        }).to.throw(DatonaErrors.TypeError, "invalid type. Expected Object");
      });

      it("throws a DatonaError if the signatory parameter is missing", function() {
        expect(function() {
          const request = {txnType: "VaultRequest", requestType: requestType, contract: contractAddress, data: "Hello World!"};
          func(request);
        }).to.throw(DatonaErrors.TypeError, "signatory is missing");
      });

      it("throws a DatonaError if the signatory parameter is the wrong type", function() {
        expect(function() {
          const request = {txnType: "VaultRequest", requestType: requestType, contract: contractAddress, data: "Hello World!"};
          func(request, ownerKey);
        }).to.throw(DatonaErrors.TypeError, "invalid type. Expected address");
      });

      it("throws a DatonaError if the signatory parameter is invalid", function() {
        expect(function() {
          const request = {txnType: "VaultRequest", requestType: requestType, contract: contractAddress, data: "Hello World!"};
          func(request, owner.address+"0");
        }).to.throw(DatonaErrors.TypeError, "invalid type. Expected address");
      });

      it("resolves an error response with a InvalidTransactionError if the request is not a "+requestType+" type", function() {
        const request = {txnType: "VaultRequest", requestType: "barney", contract: contractAddress, data: "Hello World!"};
        return func( request, owner.address )
          .then( function(response){
            checkErrorResponse(response, "InvalidTransactionError", "attempted to "+requestType+" a vault with in an invalid request type 'barney'");
          });
      });

      it("resolves an error response with a MalformedTransactionError if the request is missing the contract", function() {
        const request = {txnType: "VaultRequest", requestType: requestType, data: "Hello World!"};
        return func( request, owner.address )
          .then( function(response){
            checkErrorResponse(response, "MalformedTransactionError");
          });
      });

      it("resolves an error response with a MalformedTransactionError if the request contract is invalid", function() {
        const request = {txnType: "VaultRequest", requestType: requestType, contract: "not an address", data: "Hello World!"};
        return func( request, owner.address )
          .then( function(response){
            checkErrorResponse(response, "MalformedTransactionError");
          });
      });

    };


    describe("createVault", function(){

      const dataServer = new MyDataServer();
      const keeper = new datona.vault.VaultKeeper(dataServer, requesterKey);

      testParameters(keeper.createVault.bind(keeper), "create");

      it("resolves an error response with a MalformedTransactionError if the request is missing the data", function() {
        const request = {txnType: "VaultRequest", requestType: "create", contract: contractAddress};
        return keeper.createVault( request, owner.address )
          .then( function(response){
            checkErrorResponse(response, "MalformedTransactionError");
          });
      });

      it("resolves an error response with a ContractOwnerError if the signatory is not the owner", function() {
        contractStub = { owner: requester.address, requester: owner.address, expired: false };
        const request = {txnType: "VaultRequest", requestType: "create", contract: contractAddress, data: "Hello World!"};
        const requestStr = datona.comms.encodeTransaction(request, ownerKey);
        return keeper.handleSignedRequest(requestStr)
          .then( function(response){
            checkSignedErrorResponse(response, "ContractOwnerError");
          });
      });

      it("resolves an error response with a ContractExpiryError if the contract has expired", function() {
        contractStub = { owner: owner.address, requester: requester.address, expired: true };
        const request = {txnType: "VaultRequest", requestType: "create", contract: contractAddress, data: "Hello World!"};
        const requestStr = datona.comms.encodeTransaction(request, ownerKey);
        return keeper.handleSignedRequest(requestStr)
          .then( function(response){
            checkSignedErrorResponse(response, "ContractExpiryError");
          });
      });

      it("resolves with a success response if all is well", function() {
        contractStub = { owner: owner.address, requester: requester.address, expired: false };
        const request = {txnType: "VaultRequest", requestType: "create", contract: contractAddress, data: "Hello World!"};
        const requestStr = datona.comms.encodeTransaction(request, ownerKey);
        return keeper.handleSignedRequest(requestStr)
          .then( function(signedResponse){
            const response = datona.comms.decodeTransaction(signedResponse);
            expect(response.txn.txnType).to.equal("VaultResponse");
            expect(response.txn.data.request).to.equal("create");
            expect(response.txn.data.contract).to.equal(contractAddress);
            expect(response.txn.data.data).to.equal("Hello World!");
          });
      });

    });


    describe("updateVault", function(){

      const dataServer = new MyDataServer();
      const keeper = new datona.vault.VaultKeeper(dataServer, requesterKey);

      testParameters(keeper.updateVault.bind(keeper), "update");

      it("resolves an error response with a MalformedTransactionError if the request is missing the data", function() {
        const request = {txnType: "VaultRequest", requestType: "update", contract: contractAddress};
        return keeper.updateVault( request, owner.address )
          .then( function(response){
            checkErrorResponse(response, "MalformedTransactionError");
          });
      });

      it("resolves an error response with a ContractOwnerError if the signatory is not the owner", function() {
        contractStub = { owner: requester.address, requester: owner.address, expired: false };
        const request = {txnType: "VaultRequest", requestType: "update", contract: contractAddress, data: "Hello World!"};
        const requestStr = datona.comms.encodeTransaction(request, ownerKey);
        return keeper.handleSignedRequest(requestStr)
          .then( function(response){
            checkSignedErrorResponse(response, "ContractOwnerError");
          });
      });

      it("resolves an error response with a ContractExpiryError if the contract has expired", function() {
        contractStub = { owner: owner.address, requester: requester.address, expired: true };
        const request = {txnType: "VaultRequest", requestType: "update", contract: contractAddress, data: "Hello World!"};
        const requestStr = datona.comms.encodeTransaction(request, ownerKey);
        return keeper.handleSignedRequest(requestStr)
          .then( function(response){
            checkSignedErrorResponse(response, "ContractExpiryError");
          });
      });

      it("resolves with a success response if all is well", function() {
        contractStub = { owner: owner.address, requester: requester.address, expired: false };
        const request = {txnType: "VaultRequest", requestType: "update", contract: contractAddress, data: "Hello World!"};
        const requestStr = datona.comms.encodeTransaction(request, ownerKey);
        return keeper.handleSignedRequest(requestStr)
          .then( function(signedResponse){
            const response = datona.comms.decodeTransaction(signedResponse);
            expect(response.txn.txnType).to.equal("VaultResponse");
            expect(response.txn.data.request).to.equal("update");
            expect(response.txn.data.contract).to.equal(contractAddress);
            expect(response.txn.data.data).to.equal("Hello World!");
          });
      });

    });


    describe("accessVault", function(){

      const dataServer = new MyDataServer();
      const keeper = new datona.vault.VaultKeeper(dataServer, requesterKey);

      testParameters(keeper.accessVault.bind(keeper), "access");

      it("resolves an error response with a PermissionError if the signatory is not permitted to access the vault", function() {
        contractStub = { owner: owner.address, requester: requester.address, expired: false };
        const request = {txnType: "VaultRequest", requestType: "access", contract: contractAddress};
        const requestStr = datona.comms.encodeTransaction(request, ownerKey);
        return keeper.handleSignedRequest(requestStr)
          .then( function(response){
            checkSignedErrorResponse(response, "PermissionError");
          });
      });

      it("resolves an error response with a ContractExpiryError if the contract has expired", function() {
        contractStub = { owner: owner.address, requester: requester.address, expired: true };
        const request = {txnType: "VaultRequest", requestType: "access", contract: contractAddress};
        const requestStr = datona.comms.encodeTransaction(request, requesterKey);
        return keeper.handleSignedRequest(requestStr)
          .then( function(response){
            checkSignedErrorResponse(response, "ContractExpiryError");
          });
      });

      it("resolves with a success response if all is well", function() {
        contractStub = { owner: owner.address, requester: requester.address, expired: false };
        const request = {txnType: "VaultRequest", requestType: "access", contract: contractAddress};
        const requestStr = datona.comms.encodeTransaction(request, requesterKey);
        return keeper.handleSignedRequest(requestStr)
          .then( function(signedResponse){
            const response = datona.comms.decodeTransaction(signedResponse);
            expect(response.txn.txnType).to.equal("VaultResponse");
            expect(response.txn.data.request).to.equal("access");
            expect(response.txn.data.contract).to.equal(contractAddress);
          });
      });

    });


    describe("deleteVault", function(){

      const dataServer = new MyDataServer();
      const keeper = new datona.vault.VaultKeeper(dataServer, requesterKey);

      testParameters(keeper.deleteVault.bind(keeper), "delete");

      it("resolves an error response with a ContractOwnerError if the signatory does not own the vault", function() {
        contractStub = { owner: owner.address, requester: requester.address, expired: true };
        const request = {txnType: "VaultRequest", requestType: "delete", contract: contractAddress};
        const requestStr = datona.comms.encodeTransaction(request, requesterKey);
        return keeper.handleSignedRequest(requestStr)
          .then( function(response){
            checkSignedErrorResponse(response, "ContractOwnerError");
          });
      });

      it("resolves an error response with a ContractExpiryError if the contract has not expired", function() {
        contractStub = { owner: owner.address, requester: requester.address, expired: false };
        const request = {txnType: "VaultRequest", requestType: "delete", contract: contractAddress};
        const requestStr = datona.comms.encodeTransaction(request, ownerKey);
        return keeper.handleSignedRequest(requestStr)
          .then( function(response){
            checkSignedErrorResponse(response, "ContractExpiryError");
          });
      });

      it("resolves with a success response if all is well", function() {
        contractStub = { owner: owner.address, requester: requester.address, expired: true };
        const request = {txnType: "VaultRequest", requestType: "delete", contract: contractAddress};
        const requestStr = datona.comms.encodeTransaction(request, ownerKey);
        return keeper.handleSignedRequest(requestStr)
          .then( function(signedResponse){
            const response = datona.comms.decodeTransaction(signedResponse);
            expect(response.txn.txnType).to.equal("VaultResponse");
            expect(response.txn.data.request).to.equal("delete");
            expect(response.txn.data.contract).to.equal(contractAddress);
          });
      });

    });


    after( function(){
      datona.blockchain.GenericSmartDataAccessContract = copyOfGenericSmartDataAccessContract;
    })


  });


});
