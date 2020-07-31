const chai = require('chai');
chai.use(require('chai-as-promised'));
const expect = chai.expect;
const should = chai.should();
const datona = require("../src/datona");
const DatonaErrors = datona.errors;
const sdacInterface = require("../contracts/SDAC.json");
var http = require('http');


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

  const vaultOwner = { // taken from Ganache
    privateKey: "ae139af24306ecac804cfe974398d6d76361287d7b96d9e165d9bcb99a64b6ce",
    address: "0x288b32F2653C1d72043d240A7F938a114Ab69584"
  };
  const vaultKey = new datona.crypto.Key(vaultOwner.privateKey);

  const contractAddress = "0x288b32F2653C1d72043d240A7F938a114Ab69584";  // random address

  const zeroAddress = "0x0000000000000000000000000000000000000000";

  const NO_PERMISSIONS = 0x00;
  const ALL_PERMISSIONS = 0x07;
  const READ_BIT = 0x04;
  const WRITE_BIT = 0x02;
  const APPEND_BIT = 0x01;
  const DIRECTORY_BIT = 0x80;


  describe("RemoteVault", function() {

    const portNumber = 9864;

    class Server{

      constructor(key){
        this.server = http.createServer(this.connection.bind(this));
        this.server.listen(portNumber);
        this.key = key;
        this.clear();
      }

      connection(request, response){
        request.on('data', (data) => { this.data += data.toString(); });
        request.on('end', () => {
          response.writeHead(200);
          response.end(datona.comms.encodeTransaction({txnType: "VaultResponse", responseType: "success", data: "RemoteVault Server says 'Hello'"}, this.key));
        });
      }

      clear(){ this.data = ""; }
      close(){ this.server.close() }

    }

    const serverUrl = {
      scheme: "http",
      host: "localhost",
      port: portNumber
    };

    // Verifies a vault server response
    function expectSuccessResponse(response){
      expect(response.txn.txnType).to.equal("VaultResponse");
      if (response.txn.responseType !== "success") { console.log(response) }
      expect(response.txn.responseType).to.equal("success");
      return response;
    }

    // Decodes and verifies the packet sent by the RemoteVault class and received by vault server
    function decodeAndVerifyServerPacket(server){
      server.close();
      expect(server.data.length).to.be.gt(0);
      const serverPacket = datona.comms.decodeTransaction(server.data);
      expect(serverPacket.signatory).to.equal(owner.address);
      expect(serverPacket.txn.txnType).to.equal("VaultRequest");
      return serverPacket;
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

      it("sends the correct create request to the server", function() {
        const server = new Server(requesterKey);
        const vault = new datona.vault.RemoteVault(serverUrl, contractAddress, ownerKey, requester.address);
        const options = { opt1: "myOpt1", opt2: "myOpt2" };
        return vault.create(options)
          .then( expectSuccessResponse )
          .then( function(){
            const serverPacket = decodeAndVerifyServerPacket(server);
            expect(serverPacket.txn.requestType).to.equal("create");
            expect(serverPacket.txn.contract).to.equal(contractAddress);
            expect(serverPacket.txn.options.opt1).to.equal("myOpt1");
            expect(serverPacket.txn.options.opt2).to.equal("myOpt2");
          })
          .catch( function(error){
            server.close();
            throw error;
          });
      }).timeout(5000);

    });


    describe("write", function() {

      it("throws a DatonaError if the data parameter is missing", function() {
        expect(function() {
          const vault = new datona.vault.RemoteVault(serverUrl, contractAddress, ownerKey, requester.address);
          vault.write();
        }).to.throw(DatonaErrors.TypeError, "data is missing");
      });

      it("throws a DatonaError if the file parameter is not an address", function() {
        expect(function() {
          const vault = new datona.vault.RemoteVault(serverUrl, contractAddress, ownerKey, requester.address);
          vault.write("Hello World!", "not_an_address");
        }).to.throw(DatonaErrors.TypeError, "file: invalid filename");
      });

      it("sends the correct write request to the server when no file specified", function() {
        const server = new Server(requesterKey);
        const vault = new datona.vault.RemoteVault(serverUrl, contractAddress, ownerKey, requester.address);
        const data = "Hello World!";
        return vault.write(data)
          .then( expectSuccessResponse )
          .then( function(){
            const serverPacket = decodeAndVerifyServerPacket(server);
            expect(serverPacket.txn.requestType).to.equal("write");
            expect(serverPacket.txn.contract).to.equal(contractAddress);
            expect(serverPacket.txn.file).to.equal(zeroAddress);
            expect(serverPacket.txn.data).to.equal(data);
          })
          .catch( function(error){
            server.close();
            throw error;
          });
      }).timeout(5000);

      it("sends the correct write request to the server for a specific file", function() {
        const server = new Server(requesterKey);
        const vault = new datona.vault.RemoteVault(serverUrl, contractAddress, ownerKey, requester.address);
        const data = "Hello World!";
        const randomFile = "0x388b32F2653C1d72043d240A7F938a114Ab69584";
        const options = { opt1: "myOpt1", opt2: "myOpt2" };
        return vault.write(data, randomFile, options)
          .then( expectSuccessResponse )
          .then( function(){
            const serverPacket = decodeAndVerifyServerPacket(server);
            expect(serverPacket.txn.requestType).to.equal("write");
            expect(serverPacket.txn.contract).to.equal(contractAddress);
            expect(serverPacket.txn.file).to.equal(randomFile);
            expect(serverPacket.txn.data).to.equal(data);
            expect(serverPacket.txn.options.opt1).to.equal("myOpt1");
            expect(serverPacket.txn.options.opt2).to.equal("myOpt2");
          })
          .catch( function(error){
            server.close();
            throw error;
          });
      }).timeout(5000);

      it("sends the correct write request to the server for a specific file within a directory", function() {
        const server = new Server(requesterKey);
        const vault = new datona.vault.RemoteVault(serverUrl, contractAddress, ownerKey, requester.address);
        const data = "Hello World!";
        const randomDirectory = "0x388b32F2653C1d72043d240A7F938a114Ab69584";
        const filename = randomDirectory+"/myfile";
        return vault.write(data, filename)
          .then( expectSuccessResponse )
          .then( function(){
            const serverPacket = decodeAndVerifyServerPacket(server);
            expect(serverPacket.txn.requestType).to.equal("write");
            expect(serverPacket.txn.contract).to.equal(contractAddress);
            expect(serverPacket.txn.file).to.equal(filename);
            expect(serverPacket.txn.data).to.equal(data);
          })
          .catch( function(error){
            server.close();
            throw error;
          });
      }).timeout(5000);

      it("throws a DatonaError if the file parameter has nested directories", function() {
        expect(function() {
          const vault = new datona.vault.RemoteVault(serverUrl, contractAddress, ownerKey, requester.address);
          const randomDirectory1 = "0x388b32F2653C1d72043d240A7F938a114Ab69584";
          const randomDirectory2 = "0x488b32F2653C1d72043d240A7F938a114Ab69584";
          vault.write("Hello World!", randomDirectory1+"/"+randomDirectory2+"/myfile");
        }).to.throw(DatonaErrors.TypeError, "file: invalid filename");
      });

    });


    describe("append", function() {

      it("throws a DatonaError if the data parameter is missing", function() {
        expect(function() {
          const vault = new datona.vault.RemoteVault(serverUrl, contractAddress, ownerKey, requester.address);
          vault.append();
        }).to.throw(DatonaErrors.TypeError, "data is missing");
      });

      it("throws a DatonaError if the file parameter is not an address", function() {
        expect(function() {
          const vault = new datona.vault.RemoteVault(serverUrl, contractAddress, ownerKey, requester.address);
          vault.append("Hello Again World!", "not_an_address");
        }).to.throw(DatonaErrors.TypeError, "file: invalid filename");
      });

      it("sends the correct append request to the server when no file given", function() {
        const server = new Server(requesterKey);
        const vault = new datona.vault.RemoteVault(serverUrl, contractAddress, ownerKey, requester.address);
        const data = "Hello Again World!";
        return vault.append(data)
          .then( expectSuccessResponse )
          .then( function(){
            const serverPacket = decodeAndVerifyServerPacket(server);
              expect(serverPacket.txn.requestType).to.equal("append");
              expect(serverPacket.txn.contract).to.equal(contractAddress);
              expect(serverPacket.txn.file).to.equal(zeroAddress);
              expect(serverPacket.txn.data).to.equal(data);
            })
            .catch( function(error){
              server.close();
              throw error;
            });
      }).timeout(5000);

      it("sends the correct append request to the server for a specific file", function() {
        const server = new Server(requesterKey);
        const vault = new datona.vault.RemoteVault(serverUrl, contractAddress, ownerKey, requester.address);
        const randomFile = "0x388b32F2653C1d72043d240A7F938a114Ab69584";
        const data = "Hello Again World!";
        const options = { opt1: "myOpt1", opt2: "myOpt2" };
        return vault.append(data, randomFile, options)
          .then( expectSuccessResponse )
          .then( function(){
            const serverPacket = decodeAndVerifyServerPacket(server);
            expect(serverPacket.txn.requestType).to.equal("append");
            expect(serverPacket.txn.contract).to.equal(contractAddress);
            expect(serverPacket.txn.file).to.equal(randomFile);
            expect(serverPacket.txn.data).to.equal(data);
            expect(serverPacket.txn.options.opt1).to.equal("myOpt1");
            expect(serverPacket.txn.options.opt2).to.equal("myOpt2");
          })
          .catch( function(error){
            server.close();
            throw error;
          });
      }).timeout(5000);

      it("sends the correct append request to the server for a specific file within a directory", function() {
        const server = new Server(requesterKey);
        const vault = new datona.vault.RemoteVault(serverUrl, contractAddress, ownerKey, requester.address);
        const data = "Hello World!";
        const randomDirectory = "0x388b32F2653C1d72043d240A7F938a114Ab69584";
        const filename = randomDirectory+"/myfile";
        return vault.append(data, filename)
          .then( expectSuccessResponse )
          .then( function(){
            const serverPacket = decodeAndVerifyServerPacket(server);
            expect(serverPacket.txn.requestType).to.equal("append");
            expect(serverPacket.txn.contract).to.equal(contractAddress);
            expect(serverPacket.txn.file).to.equal(filename);
            expect(serverPacket.txn.data).to.equal(data);
          })
          .catch( function(error){
            server.close();
            throw error;
          });
      }).timeout(5000);

      it("throws a DatonaError if the file parameter has a missing file part", function() {
        expect(function() {
          const vault = new datona.vault.RemoteVault(serverUrl, contractAddress, ownerKey, requester.address);
          const randomDirectory = "0x388b32F2653C1d72043d240A7F938a114Ab69584";
          vault.append("Hello World!", randomDirectory+"/");
        }).to.throw(DatonaErrors.TypeError, "file: invalid filename");
      });

    });


    describe("read", function() {

      it("throws a DatonaError if the file parameter is not an address", function() {
        expect(function() {
          const vault = new datona.vault.RemoteVault(serverUrl, contractAddress, ownerKey, requester.address);
          vault.read("not_an_address");
        }).to.throw(DatonaErrors.TypeError, "file: invalid filename");
      });

      it("sends the correct read request to the server", function() {
        const server = new Server(requesterKey);
        const vault = new datona.vault.RemoteVault(serverUrl, contractAddress, ownerKey, requester.address);
        return vault.read()
          .then( function(data){
            expect(data).to.equal("RemoteVault Server says 'Hello'");
          })
          .then( function(){
            const serverPacket = decodeAndVerifyServerPacket(server);
            expect(serverPacket.txn.requestType).to.equal("read");
            expect(serverPacket.txn.contract).to.equal(contractAddress);
            expect(serverPacket.txn.file).to.equal(zeroAddress);
          })
          .catch( function(error){
            server.close();
            throw error;
          });
      }).timeout(5000);

      it("sends the correct append request to the server for a specific file", function() {
        const server = new Server(requesterKey);
        const vault = new datona.vault.RemoteVault(serverUrl, contractAddress, ownerKey, requester.address);
        const randomFile = "0x388b32F2653C1d72043d240A7F938a114Ab69584";
        const options = { opt1: "myOpt1", opt2: "myOpt2" };
        return vault.read(randomFile, options)
          .then( function(data){
            expect(data).to.equal("RemoteVault Server says 'Hello'");
          })
          .then( function(){
            const serverPacket = decodeAndVerifyServerPacket(server);
            expect(serverPacket.txn.requestType).to.equal("read");
            expect(serverPacket.txn.contract).to.equal(contractAddress);
            expect(serverPacket.txn.file).to.equal(randomFile);
            expect(serverPacket.txn.options.opt1).to.equal("myOpt1");
            expect(serverPacket.txn.options.opt2).to.equal("myOpt2");
          })
          .catch( function(error){
            server.close();
            throw error;
          });
      }).timeout(5000);

      it("sends the correct append request to the server for a specific file within a directory", function() {
        const server = new Server(requesterKey);
        const vault = new datona.vault.RemoteVault(serverUrl, contractAddress, ownerKey, requester.address);
        const randomDirectory = "0x388b32F2653C1d72043d240A7F938a114Ab69584";
        const filename = randomDirectory+"/myfile";
        return vault.read(filename)
          .then( function(data){
            expect(data).to.equal("RemoteVault Server says 'Hello'");
          })
          .then( function(){
            const serverPacket = decodeAndVerifyServerPacket(server);
            expect(serverPacket.txn.requestType).to.equal("read");
            expect(serverPacket.txn.contract).to.equal(contractAddress);
            expect(serverPacket.txn.file).to.equal(filename);
          })
          .catch( function(error){
            server.close();
            throw error;
          });
      }).timeout(5000);

      it("throws a DatonaError if the file parameter has an invalid directory part", function() {
        expect(function() {
          const vault = new datona.vault.RemoteVault(serverUrl, contractAddress, ownerKey, requester.address);
          const randomDirectory = "my_directory";
          vault.read(randomDirectory+"/myfile");
        }).to.throw(DatonaErrors.TypeError, "file: invalid filename");
      });

    });


    describe("delete", function() {

      it("sends the correct delete request to the server", function() {
        const server = new Server(requesterKey);
        const vault = new datona.vault.RemoteVault(serverUrl, contractAddress, ownerKey, requester.address);
        const options = { opt1: "myOpt1", opt2: "myOpt2" };
        return vault.delete(options)
          .then( expectSuccessResponse )
          .then( function(){
            const serverPacket = decodeAndVerifyServerPacket(server);
            expect(serverPacket.txn.requestType).to.equal("delete");
            expect(serverPacket.txn.contract).to.equal(contractAddress);
            expect(serverPacket.txn.options.opt1).to.equal("myOpt1");
            expect(serverPacket.txn.options.opt2).to.equal("myOpt2");
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
     * Stubbed VaultDataServer.  Simply returns the values of the input parameters so the test case can check correct values were passed.
     */
    class MyDataServer extends datona.vault.VaultDataServer {

      create(contract, options){
        return {request: "create", contract: contract, options: options};
      }

      write(contract, file, data, options){
        return {request: "write", contract: contract, file: file, data: data, options: options};
      }

      createFile(contract, file, data, options){
        return {request: "createFile", contract: contract, file: file, data: data, options: options};
      }

      append(contract, file, data, options){
        return {request: "append", contract: contract, file: file, data: data, options: options};
      }

      read(contract, file, options){
        return {request: "read", contract: contract, file: file, options: options};
      }

      readDir(contract, dir, options){
        return {request: "readDir", contract: contract, dir: dir, options: options};
      }

      delete(contract, options){
        return {request: "delete", contract: contract, options: options};
      }

    }

    function expectSuccessResponse(signedResponse){
      const response = datona.comms.decodeTransaction(signedResponse);
      expect(response.signatory.toLowerCase()).to.equal(requester.address.toLowerCase());
      expect(response.txn.txnType).to.equal("VaultResponse");
      if (response.txn.responseType !== "success") { console.log(response) }
      expect(response.txn.responseType).to.equal("success");
      expect(response.txn.data.contract).to.equal(contractAddress);
      return response;
    }

    // Used by test cases to generate the stubbed contract's permissions and the stub call's expected inputs
    function createPermissions(expectedFile, expectedRequester, permissionStr) {
      var stubPermissions = {
        expectedFile: expectedFile,
        expectedRequester: expectedRequester,
        canRead() { return false },
        canWrite() { return false },
        canAppend() { return false },
        isDirectory() { return false }
      };
      var permissionsByte = 0x00;
      for (const c of permissionStr) {
        switch(c) {
          case 'd': permissionsByte |= 0x80; stubPermissions.isDirectory = function() { return true }; break;
          case 'r': permissionsByte |= 0x04; stubPermissions.canRead = function() { return true }; break;
          case 'w': permissionsByte |= 0x02; stubPermissions.canWrite = function() { return true }; break;
          case 'a': permissionsByte |= 0x01; stubPermissions.canAppend = function() { return true }; break;
          default: throw("createPermissions: Invalid character '"+c+"'");
        }
      }
      stubPermissions.permissionsObj = new datona.blockchain.Permissions(permissionsByte);
      return stubPermissions;
    }


    /*
     * Stubbed smart contract
     */

    var copyOfGenericSmartDataAccessContract;
    const NO_PERMISSIONS = createPermissions("invalid_address", "invalid_requester", "");
    var contractStub = { owner: undefined, expired: undefined, permissions: NO_PERMISSIONS };

    function checkPermission(requester, file, condition) {
      expect(requester).to.equal(contractStub.permissions.expectedRequester);
      expect(file).to.equal(contractStub.permissions.expectedFile);
      return new Promise( function(resolve, reject){
        if( condition ) resolve(contractStub.permissions.permissionsObj);
        else( reject(new DatonaErrors.PermissionError()) );
      });
    }

    class TestContract extends datona.blockchain.Contract {

      constructor(){
        super(sdacInterface.abi);
      }

      getPermissions(requester, file){
        return new Promise( function(resolve, reject) {
          resolve(contractStub.permissions);
        });
      }

      assertOwner(address){
        return new Promise( function(resolve, reject){
          if( address.toLowerCase() === contractStub.owner.toLowerCase() ) resolve();
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

      assertCanRead(requester, file){
        return checkPermission(requester, file, contractStub.permissions.canRead());
      }

      assertCanWrite(requester, file){
        return checkPermission(requester, file, contractStub.permissions.canWrite());
      }

      assertCanAppend(requester, file){
        return checkPermission(requester, file, contractStub.permissions.canAppend());
      }

    }


    function checkErrorResponse(response, errorName, errorMessage) {
      expect(response.txnType).to.equal("VaultResponse");
      expect(response.responseType).to.equal("error");
      expect(response.error).to.be.an.instanceof(Object);
      if (response.error.name !== errorName) console.log(response);
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
    });


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
            checkErrorResponse(response, "InvalidTransactionError", "attempted to "+requestType+" a vault with an invalid request type 'barney'");
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

    }


    describe("createVault", function(){

      const dataServer = new MyDataServer();
      const keeper = new datona.vault.VaultKeeper(dataServer, requesterKey);

      testParameters(keeper.createVault.bind(keeper), "create");

      it("resolves an error response with a ContractOwnerError if the signatory is not the owner", function() {
        contractStub = { owner: requester.address, expired: false, permissions: NO_PERMISSIONS };
        const request = {txnType: "VaultRequest", requestType: "create", contract: contractAddress};
        const requestStr = datona.comms.encodeTransaction(request, ownerKey);
        return keeper.handleSignedRequest(requestStr)
          .then( function(response){
            checkSignedErrorResponse(response, "ContractOwnerError");
          });
      });

      it("resolves an error response with a ContractExpiryError if the contract has expired", function() {
        contractStub = { owner: owner.address, expired: true, permissions: NO_PERMISSIONS };
        const request = {txnType: "VaultRequest", requestType: "create", contract: contractAddress};
        const requestStr = datona.comms.encodeTransaction(request, ownerKey);
        return keeper.handleSignedRequest(requestStr)
          .then( function(response){
            checkSignedErrorResponse(response, "ContractExpiryError");
          });
      });

      it("resolves with a success response if all is well", function() {
        contractStub = { owner: owner.address, expired: false, permissions: NO_PERMISSIONS };
        const request = {txnType: "VaultRequest", requestType: "create", contract: contractAddress, options: { opt1: "myOpt1", opt2: "myOpt2"} };
        const requestStr = datona.comms.encodeTransaction(request, ownerKey);
        return keeper.handleSignedRequest(requestStr)
          .then( expectSuccessResponse )
          .then( function(response){
            expect(response.txn.data.request).to.equal("create");
            expect(response.txn.data.options.opt1).to.equal("myOpt1");
            expect(response.txn.data.options.opt2).to.equal("myOpt2");
          });
      });

    });


    function commonRWATests({ keeper, requestType, command, permission, inversePermissions, dataToWrite }){

      describe("Malformed Transactions", function() {

        it("resolves an error response with a MalformedTransactionError if the request has a invalid file", function () {
          const request = {
            txnType: "VaultRequest",
            requestType: requestType,
            contract: contractAddress,
            file: zeroAddress + "0",
            data: dataToWrite
          };
          return keeper[command](request, owner.address)
            .then(function (response) {
              checkErrorResponse(response, "MalformedTransactionError");
            });
        });

        it("resolves an error response with a MalformedTransactionError if the request file has nested directories", function () {
          const invalidFile = zeroAddress + "/" + zeroAddress + "/myfile.txt";
          const request = {
            txnType: "VaultRequest",
            requestType: requestType,
            contract: contractAddress,
            file: invalidFile,
            data: dataToWrite
          };
          return keeper[command](request, owner.address)
            .then(function (response) {
              checkErrorResponse(response, "MalformedTransactionError");
            });
        });

      });


      describe("Contract Expiry", function() {

        it("resolves an error response with a ContractExpiryError if the contract has expired", function() {
          contractStub = { owner: owner.address, expired: true, permissions: createPermissions( zeroAddress, owner.address, "rwa") };
          const request = {txnType: "VaultRequest", requestType: requestType, contract: contractAddress, file: zeroAddress, data: dataToWrite};
          const requestStr = datona.comms.encodeTransaction(request, ownerKey);
          return keeper.handleSignedRequest(requestStr)
            .then( function(response){
              checkSignedErrorResponse(response, "ContractExpiryError");
            });
        });

      });


      describe("Requests on the root vault (i.e. with no file specified in the request)", function() {

        it("resolves an error response with a PermissionError if the signatory is not permitted to " + requestType + " the root vault", function () {
          contractStub = { owner: owner.address, expired: false, permissions: createPermissions(zeroAddress, owner.address, inversePermissions) };
          const request = { txnType: "VaultRequest", requestType: requestType, contract: contractAddress, data: dataToWrite };
          const requestStr = datona.comms.encodeTransaction(request, ownerKey);
          return keeper.handleSignedRequest(requestStr)
            .then(function (response) {
              checkSignedErrorResponse(response, "PermissionError");
            });
        });

        it(requestType + " the root vault resolves with a success response if all is well", function () {
          contractStub = { owner: owner.address, expired: false, permissions: createPermissions(zeroAddress, owner.address, permission) };
          const request = { txnType: "VaultRequest", requestType: requestType, contract: contractAddress, data: dataToWrite, options: { opt1: "myOpt1", opt2: "myOpt2"} };
          const requestStr = datona.comms.encodeTransaction(request, ownerKey);
          return keeper.handleSignedRequest(requestStr)
            .then(expectSuccessResponse)
            .then(function (response) {
              expect(response.txn.data.request).to.equal(requestType);
              expect(response.txn.data.options.opt1).to.equal("myOpt1");
              expect(response.txn.data.options.opt2).to.equal("myOpt2");
            });
        });

      });


      describe("Requests for a specific file", function() {

        it("resolves an error response with a PermissionError if the signatory does not have permission to "+requestType, function() {
          const randomFile = "0x388b32F2653C1d72043d240A7F938a114Ab69584";
          contractStub = { owner: owner.address, expired: false, permissions: createPermissions( randomFile, owner.address, inversePermissions) };
          const request = {txnType: "VaultRequest", requestType: requestType, contract: contractAddress, file: randomFile, data: dataToWrite};
          const requestStr = datona.comms.encodeTransaction(request, ownerKey);
          return keeper.handleSignedRequest(requestStr)
            .then( function(response){
              checkSignedErrorResponse(response, "PermissionError");
            });
        });

        it(requestType+" a specific file resolves with a success response if all is well", function() {
          const randomFile = "0x388b32F2653C1d72043d240A7F938a114Ab69584";
          contractStub = { owner: owner.address, expired: false, permissions: createPermissions( randomFile, owner.address, permission) };
          const request = {txnType: "VaultRequest", requestType: requestType, contract: contractAddress, file: randomFile, data: dataToWrite, options: { opt1: "myOpt1", opt2: "myOpt2"} };
          const requestStr = datona.comms.encodeTransaction(request, ownerKey);
          return keeper.handleSignedRequest(requestStr)
            .then( expectSuccessResponse )
            .then( function(response){
              expect(response.txn.data.request).to.equal(requestType);
              expect(response.txn.data.options.opt1).to.equal("myOpt1");
              expect(response.txn.data.options.opt2).to.equal("myOpt2");
            });
        });

      });

    }

    function commonRWTests({ keeper, requestType, command, permission, inversePermissions, dataToWrite }){

      describe("A file within a directory inherits its permissions from its parent directory", function() {

        it("resolves an error response with a PermissionError if the signatory is not permitted to "+requestType+" the parent directory", function() {
          const randomDir = "0x388b32F2653C1d72043d240A7F938a114Ab69584";
          const fileToAccess = randomDir+"/file1.txt";
          contractStub = { owner: owner.address, expired: false, permissions: createPermissions( randomDir, owner.address, "d"+inversePermissions) };
          const request = {txnType: "VaultRequest", requestType: requestType, contract: contractAddress, file: fileToAccess, data: dataToWrite};
          const requestStr = datona.comms.encodeTransaction(request, ownerKey);
          return keeper.handleSignedRequest(requestStr)
            .then( function(response){
              checkSignedErrorResponse(response, "PermissionError");
            });
        });

        it(requestType+" a file within a directory resolves with a success response if the signatory is permitted to "+requestType+" the parent directory", function() {
          const randomDir = "0x388b32F2653C1d72043d240A7F938a114Ab69584";
          const fileToAccess = randomDir+"/file1.txt";
          contractStub = { owner: owner.address, expired: false, permissions: createPermissions( randomDir, owner.address, "d"+permission) };
          const request = {txnType: "VaultRequest", requestType: requestType, contract: contractAddress, file: fileToAccess, data: dataToWrite};
          const requestStr = datona.comms.encodeTransaction(request, ownerKey);
          return keeper.handleSignedRequest(requestStr)
            .then( expectSuccessResponse )
            .then( function(response){
              expect(response.txn.data.request).to.equal(requestType);
              expect(response.txn.data.file).to.equal(fileToAccess);
              expect(response.txn.data.data).to.equal(dataToWrite);
            });
        });

      });

    }

    describe("readVault", function(){

      const dataServer = new MyDataServer();
      const keeper = new datona.vault.VaultKeeper(dataServer, requesterKey);

      describe("parameters", () => { testParameters(keeper.readVault.bind(keeper), "read") });

      commonRWATests({
        keeper: keeper,
        requestType: "read",
        command: "readVault",
        permission: "r",
        inversePermissions: "wa",
        dataToWrite: undefined });

      commonRWTests({
        keeper: keeper,
        requestType: "write",
        command: "writeVault",
        permission: "w",
        inversePermissions: "ra",
        dataToWrite: "Hello World!" });

      it("Reading a directory causes the VaultDataServer's readDir function to be called", function() {
        const randomDir = "0x388b32F2653C1d72043d240A7F938a114Ab69584";
        contractStub = { owner: owner.address, expired: false, permissions: createPermissions( randomDir, owner.address, "dr") };
        const request = {txnType: "VaultRequest", requestType: "read", contract: contractAddress, file: randomDir};
        const requestStr = datona.comms.encodeTransaction(request, ownerKey);
        return keeper.handleSignedRequest(requestStr)
          .then( expectSuccessResponse )
          .then( function(response){
            expect(response.txn.data.request).to.equal("readDir");
            expect(response.txn.data.dir).to.equal(randomDir);
          });
      });

    });


    describe("writeVault", function(){

      const dataServer = new MyDataServer();
      const keeper = new datona.vault.VaultKeeper(dataServer, requesterKey);

      describe("parameters", () => { testParameters(keeper.writeVault.bind(keeper), "write") });

      commonRWATests({
        keeper: keeper,
        requestType: "write",
        command: "writeVault",
        permission: "w",
        inversePermissions: "ra",
        dataToWrite: "Hello World!" });

      commonRWTests({
        keeper: keeper,
        requestType: "write",
        command: "writeVault",
        permission: "w",
        inversePermissions: "ra",
        dataToWrite: "Hello World!" });

      it("resolves an error response with a MalformedTransactionError if the request is missing the data", function() {
        const request = {txnType: "VaultRequest", requestType: "write", contract: contractAddress, file: zeroAddress};
        return keeper.writeVault( request, owner.address )
            .then( function(response){
              checkErrorResponse(response, "MalformedTransactionError");
            });
      });

      it("resolves an error response with a PermissionError if trying to write directly to a directory", function() {
        const randomDir = "0x388b32F2653C1d72043d240A7F938a114Ab69584";
        const fileToWriteTo = randomDir;
        contractStub = { owner: owner.address, expired: false, permissions: createPermissions( randomDir, owner.address, "dw") };
        const request = {txnType: "VaultRequest", requestType: "write", contract: contractAddress, file: fileToWriteTo, data: "Hello World!"};
        const requestStr = datona.comms.encodeTransaction(request, ownerKey);
        return keeper.handleSignedRequest(requestStr)
          .then( function(response){
            checkSignedErrorResponse(response, "PermissionError", "Cannot write to a directory");
          });
      });

    });


    describe("appendVault", function(){

      const dataServer = new MyDataServer();
      const keeper = new datona.vault.VaultKeeper(dataServer, requesterKey);

      describe("parameters", () => { testParameters(keeper.appendVault.bind(keeper), "append") });

      commonRWATests({
        keeper: keeper,
        requestType: "append",
        command: "appendVault",
        permission: "a",
        inversePermissions: "rw",
        dataToWrite: "Hello World!" });

      it("append to a file within a directory resolves with a permission error if the signatory is not permitted to append or write to the parent directory", function() {
        const randomDir = "0x388b32F2653C1d72043d240A7F938a114Ab69584";
        const fileToAccess = randomDir+"/file1.txt";
        contractStub = { owner: owner.address, expired: false, permissions: createPermissions( randomDir, owner.address, "dr") };
        const request = {txnType: "VaultRequest", requestType: "append", contract: contractAddress, file: fileToAccess, data: "Hello World!"};
        const requestStr = datona.comms.encodeTransaction(request, ownerKey);
        return keeper.handleSignedRequest(requestStr)
          .then( function(response){
            checkSignedErrorResponse(response, "PermissionError");
          });
      });

      it("append to a file within a directory resolves with a success response and calls the vault server's appendToDirectory function if the signatory is permitted to append to the directory but not write to it", function() {
        const randomDir = "0x388b32F2653C1d72043d240A7F938a114Ab69584";
        const fileToAccess = randomDir+"/file1.txt";
        contractStub = { owner: owner.address, expired: false, permissions: createPermissions( randomDir, owner.address, "dra") };
        const request = {txnType: "VaultRequest", requestType: "append", contract: contractAddress, file: fileToAccess, data: "Hello World!"};
        const requestStr = datona.comms.encodeTransaction(request, ownerKey);
        return keeper.handleSignedRequest(requestStr)
          .then( expectSuccessResponse )
          .then( function(response){
            expect(response.txn.data.request).to.equal("createFile");
            expect(response.txn.data.file).to.equal(fileToAccess);
            expect(response.txn.data.data).to.equal("Hello World!");
          });
      });

      it("append to a file within a directory resolves with a success response and calls the vault server's append function if the signatory is permitted to write to the parent directory", function() {
        const randomDir = "0x388b32F2653C1d72043d240A7F938a114Ab69584";
        const fileToAccess = randomDir+"/file1.txt";
        contractStub = { owner: owner.address, expired: false, permissions: createPermissions( randomDir, owner.address, "dw") };
        const request = {txnType: "VaultRequest", requestType: "append", contract: contractAddress, file: fileToAccess, data: "Hello World!"};
        const requestStr = datona.comms.encodeTransaction(request, ownerKey);
        return keeper.handleSignedRequest(requestStr)
          .then( expectSuccessResponse )
          .then( function(response){
            expect(response.txn.data.request).to.equal("append");
            expect(response.txn.data.file).to.equal(fileToAccess);
            expect(response.txn.data.data).to.equal("Hello World!");
          });
      });

      it("append to a file within a directory resolves with a success response and calls the vault server's append function if the signatory is permitted to write and append to the parent directory", function() {
        const randomDir = "0x388b32F2653C1d72043d240A7F938a114Ab69584";
        const fileToAccess = randomDir+"/file1.txt";
        contractStub = { owner: owner.address, expired: false, permissions: createPermissions( randomDir, owner.address, "dwa") };
        const request = {txnType: "VaultRequest", requestType: "append", contract: contractAddress, file: fileToAccess, data: "Hello World!"};
        const requestStr = datona.comms.encodeTransaction(request, ownerKey);
        return keeper.handleSignedRequest(requestStr)
          .then( expectSuccessResponse )
          .then( function(response){
            expect(response.txn.data.request).to.equal("append");
            expect(response.txn.data.file).to.equal(fileToAccess);
            expect(response.txn.data.data).to.equal("Hello World!");
          });
      });

      it("resolves an error response with a MalformedTransactionError if the request is missing the data", function() {
        const request = {txnType: "VaultRequest", requestType: "append", contract: contractAddress, file: zeroAddress};
        return keeper.appendVault( request, owner.address )
            .then( function(response){
              checkErrorResponse(response, "MalformedTransactionError");
            });
      });

      it("resolves an error response with a PermissionError if trying to append directly to a directory", function() {
        const randomDir = "0x388b32F2653C1d72043d240A7F938a114Ab69584";
        const fileToWriteTo = randomDir;
        contractStub = { owner: owner.address, expired: false, permissions: createPermissions( randomDir, owner.address, "da") };
        const request = {txnType: "VaultRequest", requestType: "append", contract: contractAddress, file: fileToWriteTo, data: "Hello World!"};
        const requestStr = datona.comms.encodeTransaction(request, ownerKey);
        return keeper.handleSignedRequest(requestStr)
          .then( function(response){
            checkSignedErrorResponse(response, "PermissionError", "Cannot append data to a directory");
          });
      });

    });


    describe("deleteVault", function(){

      const dataServer = new MyDataServer();
      const keeper = new datona.vault.VaultKeeper(dataServer, requesterKey);

      testParameters(keeper.deleteVault.bind(keeper), "delete");

      it("resolves an error response with a ContractOwnerError if the signatory does not own the vault", function() {
        contractStub = { owner: owner.address, expired: false, permissions: createPermissions( zeroAddress, owner.address, "rwa") };
        const request = {txnType: "VaultRequest", requestType: "delete", contract: contractAddress};
        const requestStr = datona.comms.encodeTransaction(request, requesterKey);
        return keeper.handleSignedRequest(requestStr)
          .then( function(response){
            checkSignedErrorResponse(response, "ContractOwnerError");
          });
      });

      it("resolves an error response with a ContractExpiryError if the contract has not expired", function() {
        contractStub = { owner: owner.address, expired: false, permissions: createPermissions( zeroAddress, owner.address, "rwa") };
        const request = {txnType: "VaultRequest", requestType: "delete", contract: contractAddress};
        const requestStr = datona.comms.encodeTransaction(request, ownerKey);
        return keeper.handleSignedRequest(requestStr)
          .then( function(response){
            checkSignedErrorResponse(response, "ContractExpiryError");
          });
      });

      it("resolves with a success response if all is well", function() {
        contractStub = { owner: owner.address, expired: true, permissions: createPermissions( zeroAddress, owner.address, "") };
        const request = {txnType: "VaultRequest", requestType: "delete", contract: contractAddress, options: { opt1: "myOpt1", opt2: "myOpt2"} };
        const requestStr = datona.comms.encodeTransaction(request, ownerKey);
        return keeper.handleSignedRequest(requestStr)
          .then( expectSuccessResponse )
          .then( function(response){
            expect(response.txn.data.request).to.equal("delete");
            expect(response.txn.data.options.opt1).to.equal("myOpt1");
            expect(response.txn.data.options.opt2).to.equal("myOpt2");
          });
      });

    });


    after( function(){
      datona.blockchain.GenericSmartDataAccessContract = copyOfGenericSmartDataAccessContract;
      datona.blockchain.close();
    })


  });


});
