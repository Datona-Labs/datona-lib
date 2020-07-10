const chai = require('chai');
chai.use(require('chai-as-promised'));
const datona = require("../src/datona");
const DatonaError = datona.errors.DatonaError;

const expect = chai.expect;
const should = chai.should();

describe("Crypto", function() {

  const hash = "000102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f"; // random hash
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

  describe("generateKey function", function() {

    var key;

    it("creates a new Key object", function() {
      key = datona.crypto.generateKey();
      expect(key.privateKey.toString('hex')).to.match(/^[0-9a-fA-F]{64}$/);
      expect(key.address).to.match(/^0x[0-9a-fA-F]{40}$/);
    });

    it("creates a second, different Key object", function() {
      var key2 = datona.crypto.generateKey();
      expect(key2.privateKey.toString('hex')).to.match(/^[0-9a-fA-F]{64}$/);
      expect(key2.address).to.match(/^0x[0-9a-fA-F]{40}$/);
      expect(key2.privateKey).to.not.equal(key.privateKey);
      expect(key2.address).to.not.equal(key.address);
    });

  });

  describe("sign function", function() {

    describe("called with", function() {

      it("no argument results in an error", function() {
        expect(function() {
          datona.crypto.sign()
        }).to.throw(DatonaError, "hash is missing or empty");
      });

      it("an empty data argument results in an error", function() {
        expect(function() {
          datona.crypto.sign("", owner.privateKey)
        }).to.throw(DatonaError, "hash is missing or empty");
      });

      it("no key argument results in an error", function() {
        expect(function() {
          datona.crypto.sign(hash)
        }).to.throw(DatonaError, "privateKey is missing or empty");
      });

      it("an empty key argument results in an error", function() {
        expect(function() {
          datona.crypto.sign(hash, "")
        }).to.throw(DatonaError, "privateKey is missing or empty");
      });

      it("an invalid private key results in an error", function() {
        expect(function() {
          datona.crypto.sign(hash, "my_invalid_private_key")
        }).to.throw(DatonaError, "privateKey: invalid type. Expected hex string");
      });

    });

    it("returns a hex signature string for a valid hash and key", function() {
      var signature = datona.crypto.sign(hash, owner.privateKey);
      expect(signature).to.match(/^[0-9a-f]+$/);
    });

  });


  describe("getSignatory", function() {

    it("returns the correct signer's address", function() {
      var signature = datona.crypto.sign(hash, owner.privateKey);
      expect(datona.crypto.getSignatory(hash, signature)).to.equal(owner.address);
    });

  });


  describe("hash function", function() {

    it("calculates the correct hash for a simple string", function() {
      expect(datona.crypto.hash("Hello World!")).to.equal("3ea2f1d0abf3fc66cf29eebb70cbd4e7fe762ef8a09bcc06c8edf641230afec0");
    });

    it("calculates the correct hash for a long string", function() {
      const text = `
                Lorem ipsum dolor sit amet, consectetur adipiscing elit. Cras blandit nisi diam, eget ornare ligula volutpat quis. Fusce non dapibus dui. Aliquam ac ex justo. Ut tristique quis elit quis interdum. Mauris ullamcorper leo orci, id vehicula nisl egestas quis. Vivamus quis velit dapibus, congue erat id, porta eros. Aliquam ut imperdiet nisl. Aliquam egestas augue vitae magna vehicula, in luctus lorem consectetur. Etiam a imperdiet odio, nec venenatis urna. Suspendisse iaculis id mauris eu aliquam. Phasellus finibus tristique mi, et euismod sem rutrum at. Maecenas aliquam consequat tellus, vel auctor massa gravida non. Donec ornare quam justo, quis blandit ante ultricies venenatis.

                Phasellus lacinia purus in mauris hendrerit, bibendum blandit lectus pharetra. Suspendisse eleifend diam non orci consectetur porta. Ut consequat elit enim, sit amet viverra massa tristique in. Fusce velit nibh, consequat ac purus ac, placerat vehicula nisl. Etiam eleifend, lacus nec cursus tincidunt, libero felis egestas lectus, vitae tincidunt neque odio vel leo. Aenean in eros sed lectus placerat venenatis eget in ipsum. Donec justo sapien, hendrerit vitae tellus in, lobortis congue tellus. Maecenas viverra tempus suscipit. Phasellus eu augue ut felis lobortis tempor.

                Nam cursus odio sapien. Ut aliquet, odio at porttitor facilisis, elit dolor scelerisque lectus, sit amet scelerisque nibh lacus nec nisl. Quisque in ligula eu ex aliquet mattis a non turpis. Duis mauris magna, pharetra in diam vulputate, rhoncus porttitor turpis. Pellentesque diam justo, aliquet ut ultrices ut, ornare vitae lacus. Suspendisse ac ante eu sem lobortis accumsan vitae non ex. Sed feugiat ipsum erat, ac rutrum nulla scelerisque ut. Pellentesque quis luctus lacus. Nunc consectetur tortor libero, sit amet luctus nisl bibendum vel. Duis sem massa, pulvinar eget est ac, rhoncus scelerisque eros. Suspendisse rutrum sapien orci, vitae faucibus mi aliquet et. Nam id vestibulum dolor, ac dictum nisi.

                Quisque ut imperdiet dolor. Vivamus lobortis, nibh at sagittis hendrerit, urna neque molestie lorem, non ultrices neque sem in risus. Donec sed rhoncus nisl. Aliquam eget magna non nisl aliquet suscipit quis non ipsum. Nulla sit amet velit quam. Proin vitae mattis mi, vitae fermentum dolor. Donec at enim ultricies, feugiat turpis et, sollicitudin erat. Nulla dictum, odio ut tincidunt egestas, neque libero vehicula velit, vel ultricies dui enim placerat lacus. Duis quis imperdiet mauris. Cras blandit sapien eget sapien sodales, eget feugiat dui varius. Nulla facilisi. Aliquam ultricies, leo sed lobortis imperdiet, turpis sapien convallis elit, ut pulvinar lacus ligula ac elit. Aenean venenatis eu justo ut vulputate. Fusce pulvinar enim at viverra facilisis. Phasellus non blandit purus. Aliquam id arcu vitae enim condimentum pharetra.

                Integer posuere massa eu elit porta iaculis. Donec bibendum, diam rhoncus cursus feugiat, ligula ligula tempor est, eget ornare mauris nulla non est. Phasellus tempor efficitur erat, eget gravida nulla pretium id. Phasellus bibendum quis diam in imperdiet. Vivamus pellentesque risus libero, non imperdiet lacus scelerisque quis. Vivamus condimentum pretium lorem, et mollis diam consectetur et. Curabitur cursus, odio eu blandit porttitor, tortor sapien aliquet nibh, non porta elit libero quis ligula. Etiam vitae mauris tortor. Ut pretium quam eget ex lacinia rhoncus. Proin quis quam sit amet risus pellentesque porta ut sit amet urna. Mauris posuere eleifend sapien, ac suscipit magna sodales a. Sed gravida erat et diam suscipit iaculis. Sed lobortis est ac dui egestas, ornare malesuada odio facilisis. Etiam ullamcorper porttitor nisi in euismod. Donec ac sagittis tellus, quis dapibus ligula.
			      `;
      expect(datona.crypto.hash(text)).to.equal("20a39c5a3c8b006065fbb57eff6e6ee6b63c425d8f121c7fd2de83199a2a16a8");
    });

  });


  describe("fileToHash function", function() {

    it("rejects with a FileSystemError if the file does not exist", function() {
     return datona.crypto.fileToHash("non-existent-file")
       .should.eventually.be.rejectedWith(datona.errors.FileSystemError, "no such file or directory");
    });

    it("calculates the correct hash for a file", function() {
      expect(datona.crypto.fileToHash("LICENSE")).to.eventually.equal("d94fe86957166f63cdafc835df8885fae8b7ab5bf00d9af0c09b2f2298a35386");
    });

  });


  describe("recover function", function() {

    var signature = datona.crypto.sign(hash, owner.privateKey);

    describe("called with", function() {

      it("no argument results in an error", function() {
        expect(function() {
          datona.crypto.recover()
        }).to.throw(DatonaError, "hash is missing or invalid");
      });

      it("an empty hash argument results in an error", function() {
        expect(function() {
          datona.crypto.recover("", signature, owner.address)
        }).to.throw(DatonaError, "hash is missing or invalid");
      });

      it("no signature argument results in an error", function() {
        expect(function() {
          datona.crypto.recover(hash)
        }).to.throw(DatonaError, "signature is missing or empty");
      });

      it("an empty signature argument results in an error", function() {
        expect(function() {
          datona.crypto.recover(hash, "", owner.address)
        }).to.throw(DatonaError, "signature is missing or empty");
      });

      it("an invalid signature argument results in an error", function() {
        expect(function() {
          datona.crypto.recover(hash, signature + "#&%", owner.address)
        }).to.throw(DatonaError, "signature: invalid type. Expected hex string");
      });

      it("an invalid length hash results in an error", function() {
        expect(function() {
          datona.crypto.recover(hash + "ab", signature, owner.address)
        }).to.throw(DatonaError, "hash is missing or invalid");
      });

      it("a hash with invalid characters results in an error", function() {
        var invalidHash = "g" + hash.substr(1);
        expect(function() {
          datona.crypto.recover(invalidHash, signature, owner.address)
        }).to.throw(DatonaError, "hash is missing or invalid");
      });

    });

    it("returns the correct signer's address", function() {
      expect(datona.crypto.recover(hash, signature)).to.equal(owner.address);
    });

  });


  describe("verify function", function() {

    var signature = datona.crypto.sign(hash, owner.privateKey);

    describe("called with", function() {

      it("no argument results in an error", function() {
        expect(function() {
          datona.crypto.verify()
        }).to.throw(DatonaError, "address is missing or empty");
      });

      it("an empty hash argument results in an error", function() {
        expect(function() {
          datona.crypto.verify("", signature, owner.address)
        }).to.throw(DatonaError, "hash is missing or invalid");
      });

      it("no signature argument results in an error", function() {
        expect(function() {
          datona.crypto.verify(hash)
        }).to.throw(DatonaError, "address is missing or empty");
      });

      it("an empty signature argument results in an error", function() {
        expect(function() {
          datona.crypto.verify(hash, "", owner.address)
        }).to.throw(DatonaError, "signature is missing or empty");
      });

      it("an invalid signature argument results in an error", function() {
        expect(function() {
          datona.crypto.verify(hash, signature + "#&%", owner.address)
        }).to.throw(DatonaError, "signature: invalid type. Expected hex string");
      });

      it("no address argument results in an error", function() {
        expect(function() {
          datona.crypto.verify(hash, signature)
        }).to.throw(DatonaError, "address is missing or empty");
      });

      it("an empty address argument results in an error", function() {
        expect(function() {
          datona.crypto.verify(hash, signature, "")
        }).to.throw(DatonaError, "address is missing or empty");
      });

      it("an invalid length hash results in an error", function() {
        expect(function() {
          datona.crypto.verify(hash + "ab", signature, owner.address)
        }).to.throw(DatonaError, "hash is missing or invalid");
      });

      it("a hash with invalid characters results in an error", function() {
        var invalidHash = "g" + hash.substr(1);
        expect(function() {
          datona.crypto.verify(invalidHash, signature, owner.address)
        }).to.throw(DatonaError, "hash is missing or invalid");
      });

    });

    it("returns true for the correct signer's address", function() {
      expect(datona.crypto.verify(hash, signature, owner.address)).to.equal(true);
    });

    it("returns false for an incorrect signer's address", function() {
      expect(datona.crypto.verify(hash, signature, "0xfb3e6dd29d01c1b5b99e46db3fe26df1138b73d2")).to.equal(false);
    });

  });


  describe("calculateContractAddress function", function() {

    const ownerAddress = "0xc16a409a39EDe3F38E212900f8d3afe6aa6A8929";

    describe("called with", function() {

      it("no argument results in an error", function() {
        expect(function() {
          datona.crypto.calculateContractAddress()
        }).to.throw(DatonaError, "ownerAddress is missing or empty");
      });

      it("an empty ownerAddress argument results in an error", function() {
        expect(function() {
          datona.crypto.calculateContractAddress("", 0)
        }).to.throw(DatonaError, "ownerAddress is missing or empty");
      });

      it("no nonce argument results in an error", function() {
        expect(function() {
          datona.crypto.calculateContractAddress(ownerAddress)
        }).to.throw(DatonaError, "nonce is missing or empty");
      });

      it("an invalid nonce argument results in an error", function() {
        expect(function() {
          datona.crypto.calculateContractAddress(ownerAddress, "0")
        }).to.throw(DatonaError, "nonce: invalid type. Expected number");
      });

    });

    it("returns the correct contract address with nonce=0", function() {
      var address = datona.crypto.calculateContractAddress(ownerAddress, 0);
      expect(address.toLowerCase()).to.equal("0xee3782320af2eb54b4b0d6f2b45b8a0326e2e409");
    });

    it("returns the correct contract address with nonce=3", function() {
      var address = datona.crypto.calculateContractAddress(ownerAddress, 3);
      expect(address.toLowerCase()).to.equal("0x9b0e06b0ceb584c1f5b46b18d6edec09d5bc073e");
    });

  });


  describe("Key class", function() {

    describe("constructor", function () {

      it("when called with no argument results in an error", function () {
        expect(function () {
          new datona.crypto.Key()
        }).to.throw(DatonaError, "privateKey is missing or empty");
      });

      it("when called with an empty privateKey argument results in an error", function () {
        expect(function () {
          new datona.crypto.Key("")
        }).to.throw(DatonaError, "privateKey is missing or empty");
      });

      it("when called with an invalid private key results in an error", function () {
        expect(function () {
          new datona.crypto.Key("my_invalid_private_key")
        }).to.throw(DatonaError, "privateKey: invalid type. Expected hex string");
      });

      it("calculates the correct private key and address when called with a valid privateKey", function () {
        const key = new datona.crypto.Key(owner.privateKey);
        expect(key.privateKey.toString('hex')).to.equal(owner.privateKey);
        expect(key.address).to.equal(owner.address);
      });

    });

    describe("sign function", function () {

      const key = new datona.crypto.Key(owner.privateKey);

      describe("called with", function () {

        it("no argument results in an error", function () {
          expect(function () {
            key.sign()
          }).to.throw(DatonaError, "hash is missing or empty");
        });

        it("an empty data argument results in an error", function () {
          expect(function () {
            key.sign("")
          }).to.throw(DatonaError, "hash is missing or empty");
        });

        it("an invalid hash results in an error", function () {
          expect(function () {
            key.sign("my_invalid_hash")
          }).to.throw(DatonaError, "hash: invalid type. Expected hex string");
        });

      });

      it("returns a hex signature string for a valid hash and key", function () {
        var signature = key.sign(hash);
        expect(signature).to.match(/^[0-9a-f]+$/);
      });

    });

    describe("encrypt function", function () {

      describe("called with", function () {

        it("no argument results in an error", function () {
          expect(function () {
            ownerKey.encrypt()
          }).to.throw(DatonaError, "public key is missing or empty");
        });

        it("data missing results in an error", function () {
          expect(function () {
            ownerKey.encrypt(requesterKey.publicKey);
          }).to.throw(DatonaError, "data is missing or empty");
        });

        it("an invalid public key results in an error", function () {
          expect(function () {
            ownerKey.encrypt(requesterKey, "Hello World")
          }).to.throw(DatonaError, "public key: invalid type");
        });

      });

      it("confirm ECIES shared secret is the same when calculated at both ends", function () {
        const ecdsa = require('secp256k1');
        const ownerCalculatedSecret = ecdsa.ecdh(requesterKey.publicKey, ownerKey.privateKey).toString('hex');
        const requesterCalulatedSecret = ecdsa.ecdh(ownerKey.publicKey, requesterKey.privateKey).toString('hex');
        expect(ownerCalculatedSecret).to.equal(requesterCalulatedSecret);
      });

      it("confirm ECIES shared secret is not the same when calculated by a third party", function () {
        const ecdsa = require('secp256k1');
        const key = new datona.crypto.Key(owner.privateKey);
        const ownerCalculatedSecret = ecdsa.ecdh(requesterKey.publicKey, ownerKey.privateKey).toString('hex');
        const otherCalulatedSecret = ecdsa.ecdh(ownerKey.publicKey, key.privateKey).toString('hex');
        expect(ownerCalculatedSecret).to.not.equal(otherCalulatedSecret);
      });

      it("returns the correct encrypted data", function () {
        expect(ownerKey.encrypt(requesterKey.publicKey, "Hello World")).to.not.equal("Hello World");
      });

      it("returns the correct encrypted data when the key has been JSON stringified then JSON parsed", function () {
        const key = JSON.parse(JSON.stringify(requesterKey));
        key.privateKey = Buffer.from(key.privateKey);  // need to typecast Buffers since JSON does not do it
        key.publicKey = Buffer.from(key.publicKey);
        expect(ownerKey.encrypt(key.publicKey, "Hello World")).to.not.equal("Hello World");
      });

    });

    describe("decrypt function", function () {

      describe("called with", function () {

        it("no argument results in an error", function () {
          expect(function () {
            ownerKey.decrypt()
          }).to.throw(DatonaError, "public key is missing or empty");
        });

        it("data missing results in an error", function () {
          expect(function () {
            ownerKey.decrypt(requesterKey.publicKey);
          }).to.throw(DatonaError, "data is missing or empty");
        });

        it("an invalid public key results in an error", function () {
          expect(function () {
            ownerKey.decrypt(requesterKey, "Hello World")
          }).to.throw(DatonaError, "public key: invalid type");
        });

      });

      it("requester can decode message encrypted by owner", function () {
        expect(requesterKey.decrypt(ownerKey.publicKey, ownerKey.encrypt(requesterKey.publicKey, "Hello World"))).to.equal("Hello World");
      });

    });

  });


  describe("hex conversion functions", function () {

    describe("called with", function () {

      it("uint8ArrayToHex with no argument results in an error", function () {
        expect(function () {
          datona.crypto.uint8ArrayToHex();
        }).to.throw(DatonaError, "buffer is missing or empty");
      });

      it("uint8ArrayToHex with an invalid parameter results in an error", function () {
        expect(function () {
          datona.crypto.uint8ArrayToHex(ownerKey.address);
        }).to.throw(DatonaError, "buffer: invalid type");
      });

      it("hexToUint8Array with no argument results in an error", function () {
        expect(function () {
          datona.crypto.hexToUint8Array();
        }).to.throw(DatonaError, "hexString is missing or empty");
      });

      it("hexToUint8Array with an invalid parameter results in an error", function () {
        expect(function () {
          datona.crypto.hexToUint8Array(ownerKey.publicKey);
        }).to.throw(DatonaError, "hexString: invalid type");
      });

    });

    it("hexToUint8Array generates the correct result", function () {
      expect(datona.crypto.hexToUint8Array("0001fF")).to.eql(Buffer.from([0,1,255]));
    });

    it("uint8ArrayToHex generates the correct result", function () {
      expect(datona.crypto.uint8ArrayToHex(new Uint8Array([0,1,255]))).to.equal("0001ff");
    });

    it("functions are the inverse of each other", function () {
      const hexString = owner.address.slice(2);
      expect(datona.crypto.hexToUint8Array(datona.crypto.uint8ArrayToHex(ownerKey.publicKey))).to.eql(ownerKey.publicKey);
      expect(datona.crypto.uint8ArrayToHex(datona.crypto.hexToUint8Array(hexString))).to.equal(hexString);
    });

  });

});
