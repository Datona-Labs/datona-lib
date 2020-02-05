const chai = require('chai');
chai.use(require('chai-as-promised'));
const datona = require("../src/datona");
const DatonaError = datona.errors.DatonaError;

const expect = chai.expect;

describe("Crypto", function() {

  const hash = "000102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f"; // random hash
  const ethId = { // taken from Ganache
    privateKey: "b94452c533536500e30f2253c96d123133ca1cbdb987556c2dc229573a2cd53c",
    address: "0xfb3e6dd29d01c1b5b99e46db3fe26df1138b73d1"
  };

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
          datona.crypto.sign("", ethId.privateKey)
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
      var signature = datona.crypto.sign(hash, ethId.privateKey);
      expect(signature).to.match(/^[0-9a-f]+$/);
    });

  });


  describe("getSignatory", function() {

    it("returns the correct signer's address", function() {
      var signature = datona.crypto.sign(hash, ethId.privateKey);
      expect(datona.crypto.getSignatory(hash, signature)).to.equal(ethId.address);
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


  describe("recover function", function() {

    var signature = datona.crypto.sign(hash, ethId.privateKey);

    describe("called with", function() {

      it("no argument results in an error", function() {
        expect(function() {
          datona.crypto.recover()
        }).to.throw(DatonaError, "hash is missing or invalid");
      });

      it("an empty hash argument results in an error", function() {
        expect(function() {
          datona.crypto.recover("", signature, ethId.address)
        }).to.throw(DatonaError, "hash is missing or invalid");
      });

      it("no signature argument results in an error", function() {
        expect(function() {
          datona.crypto.recover(hash)
        }).to.throw(DatonaError, "signature is missing or empty");
      });

      it("an empty signature argument results in an error", function() {
        expect(function() {
          datona.crypto.recover(hash, "", ethId.address)
        }).to.throw(DatonaError, "signature is missing or empty");
      });

      it("an invalid signature argument results in an error", function() {
        expect(function() {
          datona.crypto.recover(hash, signature + "#&%", ethId.address)
        }).to.throw(DatonaError, "signature: invalid type. Expected hex string");
      });

      it("an invalid length hash results in an error", function() {
        expect(function() {
          datona.crypto.recover(hash + "ab", signature, ethId.address)
        }).to.throw(DatonaError, "hash is missing or invalid");
      });

      it("a hash with invalid characters results in an error", function() {
        var invalidHash = "g" + hash.substr(1);
        expect(function() {
          datona.crypto.recover(invalidHash, signature, ethId.address)
        }).to.throw(DatonaError, "hash is missing or invalid");
      });

    });

    it("returns the correct signer's address", function() {
      expect(datona.crypto.recover(hash, signature)).to.equal(ethId.address);
    });

  });


  describe("verify function", function() {

    var signature = datona.crypto.sign(hash, ethId.privateKey);

    describe("called with", function() {

      it("no argument results in an error", function() {
        expect(function() {
          datona.crypto.verify()
        }).to.throw(DatonaError, "address is missing or empty");
      });

      it("an empty hash argument results in an error", function() {
        expect(function() {
          datona.crypto.verify("", signature, ethId.address)
        }).to.throw(DatonaError, "hash is missing or invalid");
      });

      it("no signature argument results in an error", function() {
        expect(function() {
          datona.crypto.verify(hash)
        }).to.throw(DatonaError, "address is missing or empty");
      });

      it("an empty signature argument results in an error", function() {
        expect(function() {
          datona.crypto.verify(hash, "", ethId.address)
        }).to.throw(DatonaError, "signature is missing or empty");
      });

      it("an invalid signature argument results in an error", function() {
        expect(function() {
          datona.crypto.verify(hash, signature + "#&%", ethId.address)
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
          datona.crypto.verify(hash + "ab", signature, ethId.address)
        }).to.throw(DatonaError, "hash is missing or invalid");
      });

      it("a hash with invalid characters results in an error", function() {
        var invalidHash = "g" + hash.substr(1);
        expect(function() {
          datona.crypto.verify(invalidHash, signature, ethId.address)
        }).to.throw(DatonaError, "hash is missing or invalid");
      });

    });

    it("returns true for the correct signer's address", function() {
      expect(datona.crypto.verify(hash, signature, ethId.address)).to.equal(true);
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

    describe("constructor", function() {

      it("when called with no argument results in an error", function() {
        expect(function() {
          new datona.crypto.Key()
        }).to.throw(DatonaError, "privateKey is missing or empty");
      });

      it("when called with an empty privateKey argument results in an error", function() {
        expect(function() {
          new datona.crypto.Key("")
        }).to.throw(DatonaError, "privateKey is missing or empty");
      });

      it("when called with an invalid private key results in an error", function() {
        expect(function() {
          new datona.crypto.Key("my_invalid_private_key")
        }).to.throw(DatonaError, "privateKey: invalid type. Expected hex string");
      });

      it("calculates the correct private key and address when called with a valid privateKey", function() {
        const key = new datona.crypto.Key(ethId.privateKey);
        expect(key.privateKey.toString('hex')).to.equal(ethId.privateKey);
        expect(key.address).to.equal(ethId.address);
      });

    });

    describe("sign function", function() {

      const key = new datona.crypto.Key(ethId.privateKey);

      describe("called with", function() {

        it("no argument results in an error", function() {
          expect(function() {
            key.sign()
          }).to.throw(DatonaError, "hash is missing or empty");
        });

        it("an empty data argument results in an error", function() {
          expect(function() {
            key.sign("")
          }).to.throw(DatonaError, "hash is missing or empty");
        });

        it("an invalid hash results in an error", function() {
          expect(function() {
            key.sign("my_invalid_hash")
          }).to.throw(DatonaError, "hash: invalid type. Expected hex string");
        });

      });

      it("returns a hex signature string for a valid hash and key", function() {
        var signature = key.sign(hash);
        expect(signature).to.match(/^[0-9a-f]+$/);
      });

    });

  });

});
