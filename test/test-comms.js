const chai = require('chai');
chai.use(require('chai-as-promised'));
const expect = chai.expect;
const should = chai.should();
const datona = require("../src/datona");
const DatonaErrors = datona.errors;
const net = require('net');


describe("Comms", function() {

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

  const request1 = { a: "a1", b: "b1", c: "c1" };
  const request2 = { a: "a2", b: "b2", c: "c2" };


  describe("encodeTransaction", function() {

    it("a DatonaError is thrown if the request is missing", function() {
      expect(function() {
        datona.comms.encodeTransaction()
      }).to.throw(DatonaErrors.TypeError, "is missing");
    });

    it("a DatonaError is thrown if the key is missing", function() {
      expect(function() {
        datona.comms.encodeTransaction(request1)
      }).to.throw(DatonaErrors.TypeError, "is missing");
    });

    it("a DatonaError is thrown if the request is not an object", function() {
      expect(function() {
        datona.comms.encodeTransaction("this cannot be JSON.stringified", ownerKey)
      }).to.throw(DatonaErrors.TypeError, "invalid type. Expected Object");
    });

    it("a DatonaError is thrown if the key is not a Key object", function() {
      expect(function() {
        datona.comms.encodeTransaction(request1, "this is not a Key")
      }).to.throw(DatonaErrors.TypeError, "invalid type. Expected Key");
    });

    it("valid parameters are encoded correctly", function() {
      const requestStr = datona.comms.encodeTransaction(request1, ownerKey);
      const requestObj = JSON.parse(requestStr);
      expect( JSON.stringify(requestObj.txn) ).to.equal(JSON.stringify(request1));
      expect( requestObj.signature ).to.match(/[a-fA-F0-9]{130}/);
    });

  });


  describe("decodeTransaction", function() {

    const exampleSignature = "26d9b5e972bd43c353e5e7f4d3e2c6754731b65f90417580ee6ac2b9e30767a33c385468ace545d3ab3f0aaf134b4a9589493bb0072e358c0fb83e05f8373e0b00";

    it("a DatonaError is thrown if the parameter is missing", function() {
      expect(function() {
        datona.comms.decodeTransaction()
      }).to.throw(DatonaErrors.TypeError, "is missing");
    });

    it("a DatonaError is thrown if the parameter is not valid JSON", function() {
      expect(function() {
        datona.comms.decodeTransaction('{ "this is not valid JSON" }')
      }).to.throw(DatonaErrors.MalformedTransactionError);
    });

    it("a DatonaError is thrown if the parameter does not contain a 'request' element", function() {
      expect(function() {
        datona.comms.decodeTransaction('{ "nonRequest":"'+JSON.stringify(request1)+'", "signature":"'+exampleSignature+'" }')
      }).to.throw(DatonaErrors.MalformedTransactionError);
    });

    it("a DatonaError is thrown if the parameter does not contain a 'signature' element", function() {
      expect(function() {
        datona.comms.decodeTransaction('{ "request":"'+JSON.stringify(request1)+'", "signature":"'+exampleSignature+'0" }')
      }).to.throw(DatonaErrors.MalformedTransactionError);
    });

    it("a DatonaError is thrown if the parameter does not contain a valid request", function() {
      expect(function() {
        datona.comms.decodeTransaction('{ "request":"'+JSON.stringify(request1)+'}", "signature":"'+exampleSignature+'" }')
      }).to.throw(DatonaErrors.MalformedTransactionError);
    });

    it("a DatonaError is thrown if the parameter does not contain a valid signature", function() {
      expect(function() {
        datona.comms.decodeTransaction('{ "request":"'+JSON.stringify(request1)+'", "signature":"'+exampleSignature+'0" }')
      }).to.throw(DatonaErrors.MalformedTransactionError);
    });

    it("valid transaction is decoded correctly", function() {
      const requestStr = datona.comms.encodeTransaction(request1, ownerKey);
      const decodedTxn = datona.comms.decodeTransaction(requestStr);
      expect(JSON.stringify(decodedTxn.txn)).to.equal(JSON.stringify(request1));
      expect(decodedTxn.signatory ).to.equal(owner.address);
    });

    it("the decoded signatory is incorrect if the signature is valid but incorrect", function() {
      var requestStr = datona.comms.encodeTransaction(request1, ownerKey);
      { // replace the requestStr signature with a different valid signature
        const request2Str = datona.comms.encodeTransaction(request2, ownerKey);
        const request2Signature = JSON.parse(request2Str).signature
        var request = JSON.parse(requestStr);
        request.signature = request2Signature;
        requestStr = JSON.stringify(request);
      }
      const decodedTxn = datona.comms.decodeTransaction(requestStr);
      expect(JSON.stringify(decodedTxn.txn)).to.equal(JSON.stringify(request1));
      expect(decodedTxn.signatory ).to.not.equal(owner.address);
    });


  });


  describe("validateResponse", function() {

    const exampleSignature = "26d9b5e972bd43c353e5e7f4d3e2c6754731b65f90417580ee6ac2b9e30767a33c385468ace545d3ab3f0aaf134b4a9589493bb0072e358c0fb83e05f8373e0b00";

    it("a TransactionError is thrown if the txn parameter is missing", function() {
      expect(function() {
        datona.comms.validateResponse()
      }).to.throw(DatonaErrors.TransactionError, "is missing");
    });

    it("a TransactionError is thrown if the txn parameter is not an object", function() {
      expect(function() {
        datona.comms.validateResponse("not an object")
      }).to.throw(DatonaErrors.TransactionError, "invalid type");
    });

    it("a TransactionError is thrown if the expectedTxnType is not a string' element", function() {
      expect(function() {
        const response = {txnType: "GeneralResponse", responseType: "success"};
        datona.comms.validateResponse(response, ["not a string"]);
      }).to.throw(DatonaErrors.TransactionError, "invalid type");
    });

    it("a TransactionError is thrown if the txnType is missing", function() {
      expect(function() {
        const response = {responseType: "success"};
        datona.comms.validateResponse(response);
      }).to.throw(DatonaErrors.TransactionError, "txnType is missing");
    });

    it("a TransactionError is thrown if the txnType does not match expectedTxnType", function() {
      expect(function() {
        const response = {txnType: "GeneralResponse", responseType: "success"};
        datona.comms.validateResponse(response, "VaultResponse");
      }).to.throw(DatonaErrors.TransactionError, "invalid transaction type");
    });

    it("a TransactionError is thrown if the responseType is missing", function() {
      expect(function() {
        const response = {txnType: "GeneralResponse"};
        datona.comms.validateResponse(response);
      }).to.throw(DatonaErrors.TransactionError, "responseType is missing");
    });

    it("a TransactionError is thrown if the responseType is invalid", function() {
      expect(function() {
        const response = {txnType: "GeneralResponse", responseType: "ack"};
        datona.comms.validateResponse(response);
      }).to.throw(DatonaErrors.TransactionError, "invalid response type");
    });

    it("a TransactionError is thrown if the error is missing from an error response", function() {
      expect(function() {
        const response = {txnType: "GeneralResponse", responseType: "error"};
        datona.comms.validateResponse(response);
      }).to.throw(DatonaErrors.TransactionError, "error is missing");
    });

    it("a TransactionError is thrown if the error is invalid", function() {
      expect(function() {
        const response = {txnType: "GeneralResponse", responseType: "error", error: "my error"};
        datona.comms.validateResponse(response);
      }).to.throw(DatonaErrors.TransactionError, "invalid type");
    });

    it("a TransactionError is thrown if the error message is missing from an error response", function() {
      expect(function() {
        const response = {txnType: "GeneralResponse", responseType: "error", error: {name: "TransactionError", details: "my details"}};
        datona.comms.validateResponse(response);
      }).to.throw(DatonaErrors.TransactionError, "error message is missing");
    });

    it("valid success response does not throw an error", function() {
      const response = {txnType: "GeneralResponse", responseType: "success"};
      datona.comms.validateResponse(response);
    });

    it("valid success response of given type does not throw an error", function() {
      const response = {txnType: "VaultResponse", responseType: "success"};
      datona.comms.validateResponse(response, "VaultResponse");
    });

    it("valid minimal error response does not throw an error", function() {
      const response = {txnType: "VaultResponse", responseType: "error", error: {message: "my message"}};
      datona.comms.validateResponse(response, "VaultResponse");
    });

    it("valid full error response does not throw an error", function() {
      const response = {txnType: "VaultResponse", responseType: "error", error: {name: "TransactionError", message: "my message", details: "my details"}};
      datona.comms.validateResponse(response, "VaultResponse");
    });

  });


  describe("SmartDataAccessRequest", function() {

    const portNumber = 9864;

    class Server{

      constructor(){
        this.server = net.createServer(this.connection);
        this.server.parent = this;
        this.server.listen(portNumber, ()=>{});
        this.clear();
      }

      connection(c){
        c.on('end', () => { });
        c.on('data', (data) => {
          this.parent.data += data.toString();
          c.write(datona.comms.encodeTransaction({txnType: "GeneralResponse", responseType:"success"}, requesterKey));
        });
      }

      clear(){ this.data = ""; }
      close(){ this.server.close() }

    }


    const request1 =
    {
      txnType: "SmartDataAccessRequest",
      version: "0.0.1",
      contract: {
        hash: "3ea2f1d0abf3fc66cf29eebb70cbd4e7fe762ef8a09bcc06c8edf641230afec0"
      },
      api: {
        url: {
          scheme: "file",
          host: "localhost",
          port: portNumber,
          path: ""
        },
        acceptTransaction: {
          myAcceptDetails: "acceptance id"
        },
        rejectTransaction: {
          myRejectDetails: "rejection id"
        }
      }
    };

    const request1Txn = datona.comms.encodeTransaction(request1, requesterKey);

    describe("constructor", function() {

      it("throws a DatonaError if the signedTxnStr parameter is missing", function() {
        expect(function() {
          new datona.comms.SmartDataAccessRequest()
        }).to.throw(DatonaErrors.TypeError, "signedTxnStr is missing");
      });

      it("throws a DatonaError if the signedTxnStr parameter is the wrong type", function() {
        expect(function() {
          new datona.comms.SmartDataAccessRequest(request1, requesterKey)
        }).to.throw(DatonaErrors.TypeError, "invalid type. Expected string");
      });

      it("throws a DatonaError if the key parameter is missing", function() {
        expect(function() {
          new datona.comms.SmartDataAccessRequest(request1Txn)
        }).to.throw(DatonaErrors.TypeError, "key is missing");
      });

      it("throws a DatonaError if the key parameter is the wrong type", function() {
        expect(function() {
          new datona.comms.SmartDataAccessRequest(request1Txn, "wrong type")
        }).to.throw(DatonaErrors.TypeError, "invalid type. Expected Key");
      });

      it("throws a DatonaError if the txnType is missing", function() {
        expect(function() {
          var request = JSON.parse(JSON.stringify(request1));
          request.txnType = undefined;
          new datona.comms.SmartDataAccessRequest(
            datona.comms.encodeTransaction(request, ownerKey),
            requesterKey)
        }).to.throw(DatonaErrors.RequestError, "Invalid transaction type");
      });

      it("throws a DatonaError if the txnType is incorrect", function() {
        expect(function() {
          var request = JSON.parse(JSON.stringify(request1));
          request.txnType = "SmartDataAccessResponse";
          new datona.comms.SmartDataAccessRequest(
            datona.comms.encodeTransaction(request, ownerKey),
            requesterKey)
        }).to.throw(DatonaErrors.RequestError, "Invalid transaction type");
      });

      it("throws a DatonaError if the contract is missing", function() {
        expect(function() {
          var request = JSON.parse(JSON.stringify(request1));
          request.contract = undefined;
          new datona.comms.SmartDataAccessRequest(
            datona.comms.encodeTransaction(request, ownerKey),
            requesterKey)
        }).to.throw(DatonaErrors.RequestError, "contract is missing");
      });

      it("throws a DatonaError if the contract hash is missing", function() {
        expect(function() {
          var request = JSON.parse(JSON.stringify(request1));
          request.contract.hash = undefined;
          new datona.comms.SmartDataAccessRequest(
            datona.comms.encodeTransaction(request, ownerKey),
            requesterKey)
        }).to.throw(DatonaErrors.RequestError, "contract hash is missing");
      });

      it("throws a DatonaError if the api is missing", function() {
        expect(function() {
          var request = JSON.parse(JSON.stringify(request1));
          request.api = undefined;
          new datona.comms.SmartDataAccessRequest(
            datona.comms.encodeTransaction(request, ownerKey),
            requesterKey)
        }).to.throw(DatonaErrors.RequestError, "api is missing");
      });

      it("throws a DatonaError if the request url is missing", function() {
        expect(function() {
          var request = JSON.parse(JSON.stringify(request1));
          request.api.url = undefined;
          new datona.comms.SmartDataAccessRequest(
            datona.comms.encodeTransaction(request, ownerKey),
            requesterKey)
        }).to.throw(DatonaErrors.RequestError, "url is missing");
      });

      it("throws a DatonaError if the request url scheme is missing", function() {
        expect(function() {
          var request = JSON.parse(JSON.stringify(request1));
          request.api.url.scheme = undefined;
          new datona.comms.SmartDataAccessRequest(
            datona.comms.encodeTransaction(request, ownerKey),
            requesterKey)
        }).to.throw(DatonaErrors.RequestError, "scheme is missing");
      });

      it("throws a DatonaError if the request url host is missing", function() {
        expect(function() {
          var request = JSON.parse(JSON.stringify(request1));
          request.api.url.host = undefined;
          new datona.comms.SmartDataAccessRequest(
            datona.comms.encodeTransaction(request, ownerKey),
            requesterKey)
        }).to.throw(DatonaErrors.RequestError, "host is missing");
      });

      it("throws a DatonaError if the request url port is missing", function() {
        expect(function() {
          var request = JSON.parse(JSON.stringify(request1));
          request.api.url.port = undefined;
          new datona.comms.SmartDataAccessRequest(
            datona.comms.encodeTransaction(request, ownerKey),
            requesterKey)
        }).to.throw(DatonaErrors.RequestError, "port is missing");
      });

      it("can be constructed with valid parameters", function(){
        expect(function() {
          new datona.comms.SmartDataAccessRequest(request1Txn, requesterKey)
        }).to.not.throw();
      });

    });


    describe("accept", function() {

      const vaultUrl = {
        scheme: "file",
        host: "https://datonavault.com",
        port: 8963
      };

      it("throws a DatonaError if the contractAddress parameter is missing", function() {
        expect(function() {
          const request = new datona.comms.SmartDataAccessRequest(request1Txn, requesterKey);
          request.accept();
        }).to.throw(DatonaErrors.TypeError, "is missing");
      });

      it("throws a DatonaError if the contractAddress parameter is not an address", function() {
        expect(function() {
          const request = new datona.comms.SmartDataAccessRequest(request1Txn, requesterKey);
          request.accept("not an address", requester.address, "https://datonavault.com");
        }).to.throw(DatonaErrors.TypeError, "invalid type. Expected address");
      });

      it("throws a DatonaError if the vaultAddress parameter is missing", function() {
        expect(function() {
          const request = new datona.comms.SmartDataAccessRequest(request1Txn, requesterKey);
          request.accept(owner.address);
        }).to.throw(DatonaErrors.TypeError, "is missing");
      });

      it("throws a DatonaError if the contractAddress parameter is not an address", function() {
        expect(function() {
          const request = new datona.comms.SmartDataAccessRequest(request1Txn, requesterKey);
          request.accept(owner.address, "not an address", "https://datonavault.com");
        }).to.throw(DatonaErrors.TypeError, "invalid type. Expected address");
      });

      it("throws a DatonaError if the vaultUrl parameter is missing", function() {
        expect(function() {
          const request = new datona.comms.SmartDataAccessRequest(request1Txn, requesterKey);
          request.accept(owner.address, requester.address);
        }).to.throw(DatonaErrors.TypeError, "is missing");
      });

      it("sends the correct accept response", function() {
        const server = new Server();
        const request = new datona.comms.SmartDataAccessRequest(request1Txn, ownerKey);
        return request.accept(owner.address, requester.address, vaultUrl)
          .then( function(response){
            server.close();
            expect(response.txn.responseType).to.equal("success");
            expect(server.data.length).to.be.gt(0);
            const serverPacket = datona.comms.decodeTransaction(server.data);
            expect(serverPacket.signatory).to.equal(owner.address);
            expect(serverPacket.txn.myAcceptDetails).to.equal("acceptance id");
            expect(serverPacket.txn.contract).to.equal(owner.address);
            expect(serverPacket.txn.vaultAddress).to.equal(requester.address);
            expect(serverPacket.txn.vaultUrl.scheme).to.equal(vaultUrl.scheme);
            expect(serverPacket.txn.vaultUrl.host).to.equal(vaultUrl.host);
            expect(serverPacket.txn.vaultUrl.port).to.equal(vaultUrl.port);
          })
          .catch( function(error){
            server.close();
            throw error;
          });
      }).timeout(5000);

      it("rejects with a DatonaError if the connection is refused", function() {
        const server = new Server();
        var request2 = request1;
        request2.api.url.port++;
        const request2Txn = datona.comms.encodeTransaction(request2, requesterKey);
        const request = new datona.comms.SmartDataAccessRequest(request2Txn, ownerKey);
        return request.accept(owner.address, requester.address, vaultUrl)
          .then( function(response){
            server.close();
            return response;
          })
          .catch( function(error){
            server.close();
            throw error;
          })
          .should.eventually.be.rejectedWith(DatonaErrors.CommunicationError, "ECONNREFUSED");
      }).timeout(5000);

      it("rejects with a DatonaError if the connection times out", function() {
        const server = new Server();
        var request2 = request1;
        request2.api.url.host = "127.0.0.2";
        const request2Txn = datona.comms.encodeTransaction(request2, requesterKey);
        const request = new datona.comms.SmartDataAccessRequest(request2Txn, ownerKey);
        request.client.connectionTimeout = 50; // set low for testing
        return request.accept(owner.address, requester.address, vaultUrl)
          .then( function(response){
            server.close();
            return response;
          })
          .catch( function(error){
            server.close();
            throw error;
          })
          .should.eventually.be.rejectedWith(DatonaErrors.CommunicationError);
      }).timeout(5000);

      it("rejects with a DatonaError if the host is invalid", function() {
        const server = new Server();
        var request2 = request1;
        request2.api.url.host = "crap host";
        const request2Txn = datona.comms.encodeTransaction(request2, requesterKey);
        const request = new datona.comms.SmartDataAccessRequest(request2Txn, ownerKey);
        return request.accept(owner.address, requester.address, vaultUrl)
          .then( function(response){
            server.close();
            return response;
          })
          .catch( function(error){
            server.close();
            throw error;
          })
          .should.eventually.be.rejectedWith(DatonaErrors.CommunicationError);
      }).timeout(5000);

    });


    describe("reject", function() {

      const vaultUrl = "https://datonavault.com";

      it("throws a DatonaError if the reason parameter is missing", function() {
        expect(function() {
          const request = new datona.comms.SmartDataAccessRequest(request1Txn, requesterKey);
          request.reject();
        }).to.throw(DatonaErrors.TypeError, "is missing");
      });

      it("sends the correct reject response", function() {
        const server = new Server();
        const request = new datona.comms.SmartDataAccessRequest(request1Txn, ownerKey);
        const reason = "my reject reason!";
        return request.reject(reason)
          .then( function(response){
            server.close();
            expect(response.txn.responseType).to.equal("success");
            expect(server.data.length).to.be.gt(0);
            const serverPacket = datona.comms.decodeTransaction(server.data);
            expect(serverPacket.signatory).to.equal(owner.address);
            expect(serverPacket.txn.myRejectDetails).to.equal("rejection id");
            expect(serverPacket.txn.reason).to.equal(reason);
          })
          .catch( function(error){
            server.close();
            throw error;
          });
      }).timeout(5000);

    });

  });


});
