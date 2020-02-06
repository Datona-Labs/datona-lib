const chai = require('chai');
chai.use(require('chai-as-promised'));
const assert = chai.assert;
const expect = chai.expect;
const should = chai.should();
const datona = require("../src/datona");
const DatonaErrors = datona.errors;

const sdacInterface = require("../contracts/SDAC.json");
const testSDAC = require("../contracts/TestContract.json");

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

const zeroAddress = "0x0000000000000000000000000000000000000000";

describe("Blockchain", function() {

  this.timeout(200000);

  var contract; // used throughout

  describe("Contract", function() {

    describe("constructor", function() {

      it("throws a DatonaError if the abi is undefined", function() {
        expect(function() {
            const contract = new datona.blockchain.Contract();
          })
          .to.throw(DatonaErrors.TypeError, "abi is null");
      });

      it("throws a DatonaError if the abi is the incorrect type", function() {
        expect(function() {
            const contract = new datona.blockchain.Contract(testSDAC);
          })
          .to.throw(DatonaErrors.TypeError, "invalid type. Expected Array");
      });

      it("throws a DatonaError if the address is the incorrect type", function() {
        expect(function() {
            const contract = new datona.blockchain.Contract(testSDAC.abi, 4);
          })
          .to.throw(DatonaErrors.TypeError, "invalid type. Expected address");
      });

      it("throws a DatonaError if the address is invalid", function() {
        expect(function() {
            const contract = new datona.blockchain.Contract(testSDAC.abi, owner.address+"0");
          })
          .to.throw(DatonaErrors.TypeError, "invalid type. Expected address");
      });

      it("class can be constructed", function() {
        const contract = new datona.blockchain.Contract(testSDAC.abi);
      });

    });


    describe(".deploy", function() {

      before( function(){
        contract = new datona.blockchain.Contract(testSDAC.abi);
      });

      it("throws a DatonaError if the key is undefined", function() {
        expect(function() {
            contract.deploy(undefined, testSDAC.bytecode, [requester.address, 1])
          })
          .to.throw(DatonaErrors.TypeError, "key is missing or empty");
      });

      it("throws a DatonaError if the key is the incorrect type", function() {
        expect(function() {
            contract.deploy("string, not Key", testSDAC.bytecode, [requester.address, 1])
          })
          .to.throw(DatonaErrors.TypeError, "invalid type. Expected Key");
      });

      it("throws a DatonaError if the bytecode is undefined", function() {
        expect(function() {
            contract.deploy(ownerKey, undefined, [requester.address, 1])
          })
          .to.throw(DatonaErrors.TypeError, "bytecode is missing or empty");
      });

      it("throws a DatonaError if the bytecode is an empty string", function() {
        expect(function() {
            contract.deploy(ownerKey, "", [requester.address, 1])
          })
          .to.throw(DatonaErrors.TypeError, "bytecode is missing or empty");
      });

      it("throws a DatonaError if the bytecode is an invalid type", function() {
        expect(function() {
            contract.deploy(ownerKey, testSDAC, [requester.address, 1])
          })
          .to.throw(DatonaErrors.TypeError, "bytecode: invalid type. Expected hex string");
      });

      it("throws a DatonaError if the bytecode is not a hex string", function() {
        expect(function() {
            contract.deploy(ownerKey, "00112233g", [requester.address, 1])
          })
          .to.throw(DatonaErrors.TypeError, "bytecode: invalid type. Expected hex string");
      });

      it("throws a DatonaError if the constructorArgs is not an array", function() {
        expect(function() {
            contract.deploy(ownerKey, testSDAC.bytecode, requester.address)
          })
          .to.throw(DatonaErrors.TypeError, "constructorArgs: invalid type. Expected Array");
      });

      it("throws a DatonaError if the constructor arguments are of an invalid type", function() {
        expect(function() {
            contract.deploy(ownerKey, testSDAC.bytecode, [requester.address, "invalid type"])
          })
          .to.throw(DatonaErrors.BlockchainError, "invalid type");
      });

      it("throws a DatonaError if there are too many constructor arguments", function() {
        expect(function() {
            contract.deploy(ownerKey, testSDAC.bytecode, [requester.address, 1, 2])
          })
          .to.throw(DatonaErrors.BlockchainError, "Invalid number of parameters");
      });

      it("throws a DatonaError if there are too few constructor arguments", function() {
        expect(function() {
            contract.deploy(ownerKey, testSDAC.bytecode, [requester.address])
          })
          .to.throw(DatonaErrors.BlockchainError, "Invalid number of parameters");
      });

      it("rejects with a BlockchainError if the key's public address is invalid", function() {
        const invalidKey = new datona.crypto.Key(owner.privateKey);
        invalidKey.address = invalidKey.address.slice(0, -1);
        return contract.deploy(invalidKey, testSDAC.bytecode, [requester.address, 1])
          .should.eventually.be.rejectedWith(DatonaErrors.BlockchainError);
      });

      it("rejects with a BlockchainError if the nonce is invalid", function() {
        // Force the nonce to be invalid by faking the key's address so the nonce is retrieved for the wrong address
        const incorrectKey = new datona.crypto.Key(owner.privateKey);
        incorrectKey.address = requester.address;
        return contract.deploy(incorrectKey, testSDAC.bytecode, [requester.address, 1])
          .should.eventually.be.rejectedWith(DatonaErrors.BlockchainError, "nonce");
      });

      it("rejects with a BlockchainError if the contract constructor throws", function() {
        // Force the constructor to throw by passing the zero address
        return contract.deploy(ownerKey, testSDAC.bytecode, [zeroAddress, 1])
          .should.eventually.be.rejectedWith(DatonaErrors.BlockchainError);
      });

      it("resolves with a receipt indicating success if all is well", function() {
        return contract.deploy(ownerKey, testSDAC.bytecode, [requester.address, 100])
          .then(
            function(contractAddress) {
              expect(contractAddress).to.match(/^0x[0-9a-fA-F]{40}$/);
            }
          );
      });

      it("throws a DatonaError if trying to deploy the same contract twice", function() {
        expect(function() {
            contract.deploy(ownerKey, testSDAC.bytecode, [requester.address, 1])
          })
          .to.throw(DatonaErrors.BlockchainError, "contract already deployed");
      });

    });


    describe(".setAddress", function(){

      var unattachedContract;

      before( function(){
        unattachedContract = new datona.blockchain.Contract(testSDAC.abi);
      });

      it("throws a DatonaError if the address is undefined", function() {
        expect(function() {
            unattachedContract.setAddress()
          })
          .to.throw(DatonaErrors.TypeError, "address is missing or empty");
      });

      it("throws a DatonaError if the address is too short", function() {
        expect(function() {
            const invalidAddress = owner.address.slice(0, -1);
            unattachedContract.setAddress(invalidAddress)
          })
          .to.throw(DatonaErrors.TypeError, "address: invalid type. Expected address");
      });

      it("throws a DatonaError if the address is too long", function() {
        expect(function() {
            const invalidAddress = owner.address + "1";
            unattachedContract.setAddress(invalidAddress)
          })
          .to.throw(DatonaErrors.TypeError, "address: invalid type. Expected address");
      });

      it("throws a DatonaError if the address contains invalid hex characters", function() {
        expect(function() {
            const invalidAddress = owner.address.slice(0,19) + "g" + owner.address.slice(21);
            unattachedContract.setAddress(invalidAddress)
          })
          .to.throw(DatonaErrors.TypeError, "address: invalid type. Expected address");
      });

      it("succeeds if address is valid", function() {
        expect(function() {
            unattachedContract.setAddress(owner.address);
          })
          .to.not.throw();
      });

      it("throws a DatonaError if the address is already set", function() {
        expect(function() {
          unattachedContract.setAddress(owner.address);
          })
          .to.throw(DatonaErrors.BlockchainError, "address already set");
      });

      it("throws a DatonaError if the contract is already deployed", function() {
        expect( function(){ contract.setAddress(owner.address) } )
          .to.throw(DatonaErrors.BlockchainError, "address already set");
      });

    });


    describe(".call", function() {

      it("throws a DatonaError if the contract has not been deployed", function() {
        const localContract = new datona.blockchain.Contract(testSDAC.abi);
        expect(function() {
            return localContract.call("owner");
          })
          .to.throw(DatonaErrors.BlockchainError, "contract has not been deployed or mapped to an existing contract");
      });

      it("throws a DatonaError if the method is undefined", function() {
        expect(function() {
            contract.call()
          })
          .to.throw(DatonaErrors.TypeError, "method is missing or empty");
      });

      it("throws a DatonaError if the method is not found in the contract abi", function() {
        expect(function() {
            contract.call("nonExistentFunction");
          })
          .to.throw(DatonaErrors.BlockchainError, "method 'nonExistentFunction' does not exist");
      });

      it("throws a DatonaError if the method is incorrect type", function() {
        expect(function() {
            contract.call({ a:0, b:"hello world"});
          })
          .to.throw(DatonaErrors.TypeError, "Expected string");
      });

      it("throws a DatonaError if the args parameter is not an array", function() {
        expect(function() {
            contract.call("isPermitted", "changeOwnership")
          })
          .to.throw(DatonaErrors.TypeError, "args: invalid type. Expected Array");
      });

      it("throws a DatonaError if the method arguments are missing", function() {
        expect(function() {
            contract.call("isPermitted");
          })
          .to.throw(DatonaErrors.BlockchainError, "Invalid number of parameters");
      });

      it("throws a DatonaError if too many arguments", function() {
        expect(function() {
            contract.call("isPermitted", [requester.address, "extra argument"]);
          })
          .to.throw(DatonaErrors.BlockchainError, "Invalid number of parameters");
      });

      it("throws a DatonaError if the method call fails", function() {
        expect(function() {
            contract.call("isPermitted", ["invalid address"])
          })
          .to.throw(DatonaErrors.BlockchainError, "invalid address");
      });

      it("is successful for method with no arguments", function() {
        return contract.call("hasExpired")
          .should.eventually.equal(false);
      });

      it("is successful for method with arguments", function() {
        return contract.call("isPermitted",[requester.address])
          .should.eventually.equal(true);
      });

      it("can be used with SDAC interface", function() {
        const sdac = new datona.blockchain.Contract(sdacInterface.abi, contract.address);
        return sdac.call("isPermitted", [requester.address])
          .should.eventually.equal(true);
      });

    });


    describe(".transact", function() {

      it("throws a DatonaError if the contract has not been deployed", function() {
        const localContract = new datona.blockchain.Contract(testSDAC.abi);
        expect(function() {
            return localContract.transact(ownerKey, "changeOwnership", [owner.address]);
          })
          .to.throw(DatonaErrors.BlockchainError, "contract has not been deployed or mapped to an existing contract");
      });

      it("throws a DatonaError if the key is undefined", function() {
        expect(function() {
            contract.transact(undefined, "changeOwnership", [owner.address])
          })
          .to.throw(DatonaErrors.TypeError, "key is missing or empty");
      });

      it("throws a DatonaError if the key is the incorrect type", function() {
        expect(function() {
            contract.transact("string, not Key", "changeOwnership", [owner.address])
          })
          .to.throw(DatonaErrors.TypeError, "invalid type. Expected Key");
      });

      it("throws a DatonaError if the method is undefined", function() {
        expect(function() {
            contract.transact(ownerKey, undefined, [owner.address])
          })
          .to.throw(DatonaErrors.TypeError, "method is missing or empty");
      });

      it("throws a DatonaError if the method is an empty string", function() {
        expect(function() {
            contract.transact(ownerKey, "", [owner.address])
          })
          .to.throw(DatonaErrors.TypeError, "method is missing or empty");
      });

      it("throws a DatonaError if the method is an invalid type", function() {
        expect(function() {
            contract.transact(ownerKey, testSDAC, owner.address)
          })
          .to.throw(DatonaErrors.TypeError, "method: invalid type. Expected string");
      });

      it("throws a DatonaError if the args parameter is not an array", function() {
        expect(function() {
            contract.transact(ownerKey, "changeOwnership", owner.address)
          })
          .to.throw(DatonaErrors.TypeError, "args: invalid type. Expected Array");
      });

      it("throws a DatonaError if the method arguments are of an invalid type", function() {
        expect(function() {
            contract.transact(ownerKey, "changeOwnership", ["invalid type"])
          })
          .to.throw(DatonaErrors.BlockchainError, "invalid type");
      });

      it("throws a DatonaError if the method does not exist", function() {
        expect(function() {
            contract.transact(ownerKey, "nonExistentMethod")
          })
          .to.throw(DatonaErrors.BlockchainError, "'nonExistentMethod' does not exist");
      });

      it("rejects with a BlockchainError if the key's public address is invalid", function() {
        const invalidKey = new datona.crypto.Key(owner.privateKey);
        invalidKey.address = invalidKey.address.slice(0, -1);
        return contract.transact(invalidKey, "changeOwnership", [owner.address])
          .should.eventually.be.rejectedWith(DatonaErrors.BlockchainError);
      });

      it("rejects with a BlockchainError if the nonce is invalid", function() {
        // Force the nonce to be invalid by faking the key's address so the nonce is retrieved for the wrong address
        const incorrectKey = new datona.crypto.Key(owner.privateKey);
        incorrectKey.address = requester.address;
        return contract.transact(incorrectKey, "changeOwnership", [owner.address])
          .should.eventually.be.rejectedWith(DatonaErrors.BlockchainError, "nonce");
      });

      it("throws a DatonaError if there are the wrong number of method arguments", function() {
        expect(function() {
            contract.transact(ownerKey, "changeOwnership", [owner.address, 1])
          })
          .to.throw(DatonaErrors.BlockchainError, "Invalid number of parameters");
      });

      it("rejects with a BlockchainError if the contract method throws", function() {
        // Force the method to throw by sending as the wrong owner
        return contract.transact(requesterKey, "changeOwnership", [zeroAddress])
          .should.eventually.be.rejectedWith(DatonaErrors.BlockchainError);
      });

      it("resolves with a receipt indicating success if all is well", function() {
        return contract.transact(ownerKey, "changeOwnership", [owner.address])
          .then(
            function(receipt) {
              expect(receipt.status).to.equal(true);
            }
          );
      });

      it("can be used with SDAC interface", function() {
        const sdac = new datona.blockchain.Contract(sdacInterface.abi, contract.address);
        return sdac.call("hasExpired")
          .then(
            function(expired){
              expect(expired).to.equal(false);
              return sdac.transact(ownerKey, "getOwner");
            }
          )
          .then(
            function(receipt) {
              expect(receipt.status).to.equal(true);
              return sdac.call("hasExpired");
            }
          )
          .then(
            function(expired){
              expect(expired).to.equal(false);
            }
          )
      });

    });


      describe(".getOwner", function() {

        it("throws a DatonaError if the contract has not been deployed", function() {
          const localContract = new datona.blockchain.Contract(testSDAC.abi);
          expect(function() {
              return localContract.getOwner();
            })
            .to.throw(DatonaErrors.BlockchainError, "contract has not been deployed or mapped to an existing contract");
        });

        it("return the correct address after deploying", function() {
          return contract.getOwner()
            .should.eventually.satisfy((addr) => addr.toUpperCase() == owner.address.toUpperCase());
        });

        it("return the correct address for a second time from the same contract", function() {
          return contract.getOwner()
            .should.eventually.satisfy((addr) => addr.toUpperCase() == owner.address.toUpperCase());
        });

        it("return the correct address after mapping address to existing contract", function() {
          const localContract = new datona.blockchain.Contract(testSDAC.abi);
          localContract.setAddress(contract.address);
          return localContract.getOwner()
            .should.eventually.satisfy((addr) => addr.toUpperCase() == owner.address.toUpperCase());
        });

        it("can be used with SDAC interface", function() {
          const localContract = new datona.blockchain.Contract(sdacInterface.abi, contract.address);
          return localContract.getOwner()
            .should.eventually.satisfy((addr) => addr.toUpperCase() == owner.address.toUpperCase());
        });

      });


      describe(".hasExpired", function() {

        it("throws a DatonaError if the contract has not been deployed", function() {
          const localContract = new datona.blockchain.Contract(testSDAC.abi);
          expect(function() {
              return localContract.hasExpired();
            })
            .to.throw(DatonaErrors.BlockchainError, "contract has not been deployed or mapped to an existing contract");
        });

        it("return the correct value after deploying", function() {
          return contract.hasExpired()
            .should.eventually.equal(false);
        });

        it("return the correct vaule for a second time from the same contract", function() {
          return contract.hasExpired()
            .should.eventually.equal(false);
        });

        it("return the correct value after mapping address to existing contract", function() {
          const localContract = new datona.blockchain.Contract(testSDAC.abi);
          localContract.setAddress(contract.address);
          return localContract.hasExpired()
            .should.eventually.equal(false)
        });

        it("can be used with SDAC interface", function() {
          const localContract = new datona.blockchain.Contract(sdacInterface.abi, contract.address);
          return localContract.hasExpired()
            .should.eventually.equal(false);
        });

      });


      describe(".isPermitted", function() {

        it("throws a DatonaError if the contract has not been deployed", function() {
          const localContract = new datona.blockchain.Contract(testSDAC.abi);
          expect(function() {
              return localContract.isPermitted(requester.address);
            })
            .to.throw(DatonaErrors.BlockchainError, "contract has not been deployed or mapped to an existing contract");
        });

        it("return the correct value after deploying", function() {
          return contract.isPermitted(requester.address)
            .should.eventually.equal(true);
        });

        it("throws a DatonaError if the address is missing", function() {
          expect(function() {
              contract.isPermitted();
            })
            .to.throw(DatonaErrors.TypeError, "address is missing");
        });

        it("throws a DatonaError if the address is not an address", function() {
          expect(function() {
              contract.isPermitted(requester.address+"0");
            })
            .to.throw(DatonaErrors.TypeError, "Expected address");
        });

        it("return the correct vaule for a second time from the same contract", function() {
          return contract.isPermitted(requester.address)
            .should.eventually.equal(true);
        });

        it("returns false if the address is not permitted access", function() {
          return contract.isPermitted(owner.address)
            .should.eventually.equal(false);
        });

        it("return the correct value after mapping address to existing contract", function() {
          const localContract = new datona.blockchain.Contract(testSDAC.abi);
          localContract.setAddress(contract.address);
          return localContract.isPermitted(requester.address)
            .should.eventually.equal(true)
        });

        it("can be used with SDAC interface", function() {
          const localContract = new datona.blockchain.Contract(sdacInterface.abi, contract.address);
          return localContract.isPermitted(requester.address)
            .should.eventually.equal(true);
        });

      });


      describe(".getBytecode", function() {

        it("throws a DatonaError if the contract has not been deployed", function() {
          const localContract = new datona.blockchain.Contract(testSDAC.abi);
          expect(function() {
              return localContract.getBytecode();
            })
            .to.throw(DatonaErrors.BlockchainError, "contract has not been deployed or mapped to an existing contract");
        });

        it("return the correct bytecode after deploying", function() {
          return contract.getBytecode()
            .should.eventually.equal(testSDAC.runtimeBytecode);
        });

        it("return the correct bytecode for a second time from the same contract", function() {
          return contract.getBytecode()
            .should.eventually.equal(testSDAC.runtimeBytecode);
        });

        it("return the correct bytecode after mapping address to existing contract", function() {
          const localContract = new datona.blockchain.Contract(testSDAC.abi);
          localContract.setAddress(contract.address);
          return localContract.getBytecode()
            .should.eventually.equal(testSDAC.runtimeBytecode);
        });

      });


      describe(".assertBytecode", function() {

        it("throws a DatonaError if the contract has not been deployed", function() {
          const localContract = new datona.blockchain.Contract(testSDAC.abi);
          expect(function() {
              return localContract.assertBytecode(testSDAC.runtimeBytecode);
            })
            .to.throw(DatonaErrors.BlockchainError, "contract has not been deployed or mapped to an existing contract");
        });

        it("resolve when asserted with the correct bytecode", function() {
          return contract.assertBytecode(testSDAC.runtimeBytecode)
            .should.eventually.be.fulfilled;
        });

        it("reject with a BlockchainError when asserted with a trivially different bytecode", function() {
          return contract.assertBytecode(testSDAC.runtimeBytecode+"0")
            .should.eventually.be.rejectedWith(DatonaErrors.BlockchainError, "bytecode does not match");
        });

        it("reject with a BlockchainError when parameter is missing", function() {
          return contract.assertBytecode()
          .should.eventually.be.rejectedWith(DatonaErrors.BlockchainError, "bytecode does not match");
        });

      });


      describe(".assertOwner", function() {

        it("throws a DatonaError if the contract has not been deployed", function() {
          const localContract = new datona.blockchain.Contract(testSDAC.abi);
          expect(function() {
              return localContract.assertOwner(owner.address);
            })
            .to.throw(DatonaErrors.BlockchainError, "contract has not been deployed or mapped to an existing contract");
        });

        it("resolve when asserted with the owner address", function() {
          return contract.assertOwner(owner.address)
            .should.eventually.be.fulfilled;
        });

        it("reject with a ContractOwnerError when asserted with a different address", function() {
          return contract.assertOwner(requester.address)
            .should.eventually.be.rejectedWith(DatonaErrors.ContractOwnerError, "owner does not match");
        });

        it("throw an error when the address is invalid", function() {
          expect(function() {
              return contract.assertOwner(owner.address+"0");
            })
            .to.throw(DatonaErrors.TypeError, "expectedOwner: invalid type. Expected address");
        });

        it("reject with a ContractOwnerError when the address is missing", function() {
          expect(function() {
              return contract.assertOwner();
            })
            .to.throw(DatonaErrors.TypeError, "expectedOwner is missing or empty");
        });

      });


      describe(".assertNotExpired", function() {

        it("throws a DatonaError if the contract has not been deployed", function() {
          const localContract = new datona.blockchain.Contract(testSDAC.abi);
          expect(function() {
              return localContract.assertNotExpired();
            })
            .to.throw(DatonaErrors.BlockchainError, "contract has not been deployed or mapped to an existing contract");
        });

        it("resolve when contract has not expired", function() {
          return contract.assertNotExpired()
            .should.eventually.be.fulfilled;
        });

      });

      describe(".assertIsPermitted", function() {

        it("throws a DatonaError if the contract has not been deployed", function() {
          const localContract = new datona.blockchain.Contract(testSDAC.abi);
          expect(function() {
              return localContract.assertIsPermitted(requester.address);
            })
            .to.throw(DatonaErrors.BlockchainError, "contract has not been deployed or mapped to an existing contract");
        });

        it("resolve when the address is permitted", function() {
          return contract.assertIsPermitted(requester.address)
            .should.eventually.be.fulfilled;
        });

      });

    describe(".terminate", function() {

      it("throws a DatonaError if the contract has not been deployed", function() {
        const localContract = new datona.blockchain.Contract(testSDAC.abi);
        expect(function() {
            return localContract.terminate(ownerKey);
          })
          .to.throw(DatonaErrors.BlockchainError, "contract has not been deployed or mapped to an existing contract");
      });

      it("throws a DatonaError if the key is undefined", function() {
        expect(function() {
            contract.terminate();
          })
          .to.throw(DatonaErrors.TypeError, "key is missing or empty");
      });

      it("throws a DatonaError if the key is the incorrect type", function() {
        expect(function() {
            contract.terminate("ownerKey");
          })
          .to.throw(DatonaErrors.TypeError, "invalid type. Expected Key");
      });

      it("resolve when all is well", function() {
        return contract.terminate(ownerKey)
          .should.eventually.be.fulfilled;
      });

    });

    describe(".assertNotExpired", function() {

      it("reject with a BlockchainError when contract has been terminated", function() {
        return contract.assertNotExpired()
          .should.eventually.be.rejectedWith(DatonaErrors.BlockchainError, "contract has expired");
      });

    });

    describe(".assertIsPermitted", function() {

      it("reject with a PermissionError when the address is not permitted", function() {
        return contract.assertIsPermitted(owner.address)
          .should.eventually.be.rejectedWith(DatonaErrors.PermittedError, "permission denied");
      });

    });


  });


  describe("subscribe/unsubscribe", function() {

    /*
     * NOTE: These are real-time tests.  They need to use timeouts to wait for
     * the asynchronous Ganache subscribe feature.
     */

    const bcHash = datona.crypto.hash(testSDAC.runtimeBytecode);

    class SubscriptionHandler {
      constructor(){
        this.contracts = [];
      }
      callback(contractAddress, bytecodeHash){
        var found = false;
        this.contracts.forEach(address => found |= (address == contractAddress) );
        if (!found) this.contracts.push(contractAddress);
        else console.log(this.name+": found");
      };
    }

    function sleep(ms) {
      return new Promise(resolve => setTimeout(resolve, ms));
    }

    it("throws a DatonaError if the bytecodeHash is undefined", function() {
      expect(function() {
          datona.blockchain.subscribe();
        })
        .to.throw(DatonaErrors.TypeError, "bytecodeHash is missing or empty");
    });

    it("throws a DatonaError if the bytecodeHash is invalid", function() {
      subscriptionHandler = new SubscriptionHandler(bcHash);
      expect(function() {
          datona.blockchain.subscribe(bcHash+"0", subscriptionHandler.callback);
        })
        .to.throw(DatonaErrors.TypeError, "invalid type");
    });

    it("throws a DatonaError if the callback is not a function", function() {
      expect(function() {
          datona.blockchain.subscribe(bcHash, "not a function");
        })
        .to.throw(DatonaErrors.TypeError, "invalid type. Expected function");
    });


    describe("with no permission check", function(){

      it("can purge any previously deployed contracts in this test run", function() {
        const sdacSH = new SubscriptionHandler();
        const subscriptionId = datona.blockchain.subscribe(bcHash, sdacSH.callback.bind(sdacSH));
        return new Promise(resolve => setTimeout(resolve, 400))
          .then( function(){ expect(datona.blockchain.unsubscribe(subscriptionId)).to.equal(1) });
      });

      it("can subscribe and unsubscribe", function() {
        const sdacSH = new SubscriptionHandler();
        const hash1 = datona.crypto.hash("1");
        const hash2 = datona.crypto.hash("2");
        const hash3 = datona.crypto.hash("3");
        const subscriptionId1 = datona.blockchain.subscribe(hash1, sdacSH.callback.bind(sdacSH));
        const subscriptionId2 = datona.blockchain.subscribe(hash2, sdacSH.callback.bind(sdacSH));
        const subscriptionId3 = datona.blockchain.subscribe(hash3, sdacSH.callback.bind(sdacSH));
        expect(datona.blockchain.unsubscribe(subscriptionId1)).to.equal(1);
        expect(datona.blockchain.unsubscribe(subscriptionId1)).to.equal(0);
        expect(datona.blockchain.unsubscribe(subscriptionId2)).to.equal(1);
        expect(datona.blockchain.unsubscribe(subscriptionId2)).to.equal(0);
        expect(datona.blockchain.unsubscribe(subscriptionId3)).to.equal(1);
        expect(datona.blockchain.unsubscribe(subscriptionId3)).to.equal(0);
      });

      it("will receive notification of a deployed contract", function() {
        const sdacSH = new SubscriptionHandler();
        assert(sdacSH.contracts.length == 0);
        const subscriptionId = datona.blockchain.subscribe(bcHash, sdacSH.callback.bind(sdacSH));
        assert(sdacSH.contracts.length == 0);
        contract = new datona.blockchain.Contract(testSDAC.abi);
        return contract.deploy(ownerKey, testSDAC.bytecode, [requester.address, 10])
          .then( async function(contractAddress){
            for (i=0; i<50 && sdacSH.contracts.length == 0; i++) {
              await sleep(100);
            }
            expect(datona.blockchain.unsubscribe(subscriptionId)).to.equal(1);
            if (sdacSH.contracts.length == 0) throw "Contract deployment notification not received";
            expect(sdacSH.contracts.length).to.equal(1);
            expect(sdacSH.contracts[0].toLowerCase()).to.equal(contractAddress.toLowerCase());
          });
      });

      it("will not receive notification of a deployed contract if contract hash is different", function() {
        const nonSdacHash = datona.crypto.hash("hello world");
        const sdacSH = new SubscriptionHandler();
        const nonSdacSH = new SubscriptionHandler();
        assert(sdacSH.contracts.length == 0);
        assert(nonSdacSH.contracts.length == 0);
        const sdacSubscriptionId = datona.blockchain.subscribe(bcHash, sdacSH.callback.bind(sdacSH));
        const nonSdacSubscriptionId = datona.blockchain.subscribe(nonSdacHash, nonSdacSH.callback.bind(nonSdacSH));
        assert(sdacSH.contracts.length == 0);
        assert(nonSdacSH.contracts.length == 0);
        contract = new datona.blockchain.Contract(testSDAC.abi);
        return contract.deploy(ownerKey, testSDAC.bytecode, [requester.address, 10])
          .then( async function(contractAddress){
            for (i=0; i<50 && sdacSH.contracts.length == 0; i++) {
              await sleep(100);
            }
            await sleep(100); // give chance for second callback to be called
            expect(datona.blockchain.unsubscribe(sdacSubscriptionId)).to.equal(1);
            expect(datona.blockchain.unsubscribe(nonSdacSubscriptionId)).to.equal(1);
            expect(sdacSH.contracts.length).to.equal(1);
            expect(nonSdacSH.contracts.length).to.equal(0);
          });
      });

    });

    describe("with permission check", function(){

      it("can purge any previously deployed contracts in this test run", function() {
        const sdacSH = new SubscriptionHandler();
        const subscriptionId = datona.blockchain.subscribe(bcHash, sdacSH.callback.bind(sdacSH));
        return new Promise(resolve => setTimeout(resolve, 400))
          .then( function(){ expect(datona.blockchain.unsubscribe(subscriptionId)).to.equal(1) });
      });

      it("will receive notification of a deployed contract with permission granted", function() {
        const sdacSH = new SubscriptionHandler();
        assert(sdacSH.contracts.length == 0);
        const subscriptionId = datona.blockchain.subscribe(bcHash, sdacSH.callback.bind(sdacSH), requester.address, testSDAC.abi);
        assert(sdacSH.contracts.length == 0);
        contract = new datona.blockchain.Contract(testSDAC.abi);
        return contract.deploy(ownerKey, testSDAC.bytecode, [requester.address, 10])
          .then( async function(contractAddress){
            for (i=0; i<50 && sdacSH.contracts.length == 0; i++) {
              await sleep(100);
            }
            expect(datona.blockchain.unsubscribe(subscriptionId)).to.equal(1);
            if (sdacSH.contracts.length == 0) throw "Contract deployment notification not received";
            expect(sdacSH.contracts.length).to.equal(1);
            expect(sdacSH.contracts[0].toLowerCase()).to.equal(contractAddress.toLowerCase());
          });
      });

      it("will not receive notification of a deployed contract if permission not granted", function() {
        const sdacSH = new SubscriptionHandler(); sdacSH.name = "sdacSH";
        const anotherSdacSH = new SubscriptionHandler(); anotherSdacSH.name = "anotherSdacSH";
        assert(sdacSH.contracts.length == 0);
        assert(anotherSdacSH.contracts.length == 0);
        const sdacSubscriptionId = datona.blockchain.subscribe(bcHash, sdacSH.callback.bind(sdacSH));
        const anotherSdacSubscriptionId = datona.blockchain.subscribe(bcHash, anotherSdacSH.callback.bind(anotherSdacSH), owner.address, testSDAC.abi);
        assert(sdacSH.contracts.length == 0);
        assert(anotherSdacSH.contracts.length == 0);
        contract = new datona.blockchain.Contract(testSDAC.abi);
        return contract.deploy(ownerKey, testSDAC.bytecode, [requester.address, 10])
          .then( async function(contractAddress){
            for (i=0; i<50 && sdacSH.contracts.length == 0; i++) {
              await sleep(100);
            }
            await sleep(1000); // give plenty of time for permission check to run
            expect(datona.blockchain.unsubscribe(sdacSubscriptionId)).to.equal(1);
            expect(datona.blockchain.unsubscribe(anotherSdacSubscriptionId)).to.equal(1);
            expect(sdacSH.contracts.length).to.equal(1);
            expect(anotherSdacSH.contracts.length).to.equal(0);
          });
      });

    });

  });

  after( function(){
    datona.blockchain.close();
  });

});
