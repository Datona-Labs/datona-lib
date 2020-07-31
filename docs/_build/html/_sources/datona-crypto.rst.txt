.. _datona-crypto:

#############
datona-crypto
#############

The datona-crypto component provides all the datona-lib cryptographic classes and functions.

.. _Key:

*********
Class Key
*********

Encapsulates a private key and provides cryptographic functions that use it.  The Key is a core class of datona-lib.

Properties
==========

* ``privateKey`` *(PrivateKey)* - the private key given to the constructor
* ``publicKey`` *(PublicKey)* - the public key derived from the private key
* ``address`` *(Address)* - the public blockchain address derived from the private key

Constructor
===========

Constructs the instance with the given private key.

.. code-block:: javascript

    new Key(privateKey);

----------
Parameters
----------

1. ``privateKey`` *(PrivateKey)* - 32-byte private key in hex (64 hex characters)

-------
Example
-------

.. code-block:: javascript

  const myKey = new Key("e68e40257cfee330038c49637fcffff82fae04b9c563f4ea071c20f2eb55063c");
  console.log(myKey.address);
  > 0x41A60F71063CD7c9e5247d3E7d551f91f94b5C3b


-----------------------------------------------------------------------------

sign
====

Signs the given hash with this key.

.. code-block:: javascript

    sign(hash);

----------
Parameters
----------

1. ``hash`` *(Hash)* - 32-byte :ref:`hash<Types>` to sign in hex (64 hex characters)

-------
Returns
-------

``DatonaSignature`` - the signature of the given hash derived from this key

-------
Example
-------

.. code-block:: javascript

  const signature = myKey.sign(hash("Hello World!"));


-----------------------------------------------------------------------------

encrypt
=======

Encrypts the given data using the Elliptic Curve Integrated Encryption Scheme.  The symmetric encryption key is generated from this private key and the given public key.  The resulting encrypted data can be decrypted with this public key and the private part of the given public key.

The key derivation function used is the standard datona crypto hash function.  The encryption scheme used is AES-GCM.  ECIES has been selected instead of an asymmetric scheme like RSA for performance reasons.

.. code-block:: javascript

    encrypt(publicKeyTo, data);

----------
Parameters
----------

1. ``publicKeyTo`` *(address)*  public part of the remote key that will be used to decrypt this data
2. ``data`` *(bytes)* data to encrypt (e.g. as a string)

-------
Returns
-------

``bytes`` - the encrypted data

-------
Example
-------

.. code-block:: javascript

  const encryptedData = myKey.encrypt(theirPublicKey, "Hello World"))


-----------------------------------------------------------------------------

decrypt
=======

Decrypts the given data that has been encrypted with the ``encrypt`` function.  The given public key must be the public part of the private key used to encrypt the data and this key must be the private part of the public key used to encrypt the data.

.. code-block:: javascript

    decrypt(publicKeyFrom, data);

----------
Parameters
----------

1. ``publicKeyFrom`` *(address)*  public part of the remote key that was used to encrypt this data
2. ``data`` *(bytes)* the encrypted data

-------
Returns
-------

``bytes`` - the decrypted data

-------
Example
-------

.. code-block:: javascript

  const key1 = new Key("e68e40257cfee330038c49637fcffff82fae04b9c563f4ea071c20f2eb55063c");
  const key2 = new Key("b692ef5519cd87854b9bd97dd47a8929cbe473fe7a0da53e4ec79efec540cd2b");
  const encryptedData = key1.encrypt(key2.publicKey, "Hello World"));
  const decryptedData = key2.decrypt(key1.publicKey, encryptedData));
  assert(decryptedData == "Hello World");


-----------------------------------------------------------------------------

*********
Functions
*********

generateKey
===========

Generates a new Key object with a random private key.  NB: This function does not use a true random source.  Use only for experimental and test purposes.

.. code-block:: javascript

    generateKey();

-------
Returns
-------

``Key`` - a new Key object with a random private key.

-------
Example
-------

.. code-block:: javascript

  const myPrivateKey = datona.crypto.generateKey();


-----------------------------------------------------------------------------

sign
====

Signs the given hash using the given private key.

.. code-block:: javascript

    sign(hash, privateKey);

----------
Parameters
----------

1. ``hash`` *(Hash)* - 32-byte :ref:`hash<Types>` to sign in hex (64 hex characters)
2. ``privateKey`` *(PrivateKey)* - 32-byte :ref:`private key<Types>` in hex (64 hex characters)

-------
Returns
-------

``DatonaSignature`` - the signature of the given hash derived from the given key

-------
Example
-------

.. code-block:: javascript

  const myPrivateKey = "e68e40257cfee330038c49637fcffff82fae04b9c563f4ea071c20f2eb55063c";
  const signature = sign(hash("Hello World!"), myPrivateKey);


-----------------------------------------------------------------------------

verify
======

Verifies that the signatory of the given hash and signature matches the given address

.. code-block:: javascript

    verify(hash, signature, address);

----------
Parameters
----------

1. ``hash`` *(Hash)* - 32-byte :ref:`hash<Types>` to sign in hex (64 hex characters)
2. ``signature`` *(DatonaSignature)* - 65-byte :ref:`DatonaSignature<Types>` in hex (130 hex characters)
3. ``address`` *(Address)* - expected signatory :ref:`address<Types>` to verify against

-------
Returns
-------

``bool`` - true if signatory matches the given address

------
Throws
------

* ``InvalidHashError`` if the hash is invalid
* ``InvalidSignatureError`` if the signatory could not be recovered

-------
Example
-------

.. code-block:: javascript

  const myKey = new Key("e68e40257cfee330038c49637fcffff82fae04b9c563f4ea071c20f2eb55063c");
  const myHash = hash("Hello World!");
  const signature = myKey.sign(myHash);
  const matches = verify(myHash, signature, myKey.address);

  console.log(matches);
  > true


-----------------------------------------------------------------------------

recover
=======

Recovers the address of the signatory of the given hash and signature

.. code-block:: javascript

    recover(hash, signature);

----------
Parameters
----------

1. ``hash`` *(Hash)* - 32-byte :ref:`hash<Types>` to sign in hex (64 hex characters)
2. ``signature`` *(DatonaSignature)* - 65-byte :ref:`DatonaSignature<Types>` in hex (130 hex characters)

-------
Returns
-------

``Address`` - address of the signatory (with leading 0x)

------
Throws
------

* ``InvalidHashError`` if the hash is invalid
* ``InvalidSignatureError`` if the signatory could not be recovered

-------
Example
-------

.. code-block:: javascript

  const myKey = new Key("e68e40257cfee330038c49637fcffff82fae04b9c563f4ea071c20f2eb55063c");
  const myHash = hash("Hello World!");
  const signature = myKey.sign(myHash);
  const address = recover(myHash, signature);

  console.log(address);
  > 0x41A60F71063CD7c9e5247d3E7d551f91f94b5C3b

  console.log(myKey.address == address);
  > true


-----------------------------------------------------------------------------

hash
====

Generates a keccak256 hash of the given data string

.. code-block:: javascript

    hash(data);

----------
Parameters
----------

1. ``data`` *(Buffer)* - the data to be hashed

-------
Returns
-------

``Hash`` - :ref:`hash<Types>` of the given data as a 32-byte hex string (64 hex characters)

-------
Example
-------

.. code-block:: javascript

  const myHash = hash("Hello World!");

  console.log(myHash);
  > 3ea2f1d0abf3fc66cf29eebb70cbd4e7fe762ef8a09bcc06c8edf641230afec0


-----------------------------------------------------------------------------

fileToHash
==========

Generates a keccak256 hash of the given file's contents.  Can handle files of any length.

.. code-block:: javascript

    fileToHash(path, nonce);

----------
Parameters
----------

1. ``path`` *(String)* - the file path
2. ``nonce`` *(String)* - (Optional) if present the nonce is appended to the file contents to form part of the hash

-------
Returns
-------

``Promise`` - A promise to resolve with the hash of the file contents

Resolves With
~~~~~~~~~~~~~

``Hash`` - :ref:`hash<Types>` of the given data as a 32-byte hex string (64 hex characters)

Rejects With
~~~~~~~~~~~~

* ``FileSystemError`` - if the file cannot be read

-------
Example
-------

.. code-block:: javascript

  fileToHash("../myFiles/myFile.txt")
    .then( (hash) => { console.log("hash="+hash) })
    .catch(console.error);

  > hash=3ea2f1d0abf3fc66cf29eebb70cbd4e7fe762ef8a09bcc06c8edf641230afec0


-----------------------------------------------------------------------------

calculateContractAddress
========================

Generates a contract address

.. code-block:: javascript

    calculateContractAddress(ownerAddress, nonce);

----------
Parameters
----------

1. ``ownerAddress`` *(Address)* - the blockchain address of the deployer
2. ``nonce`` *(uint)* - the owner's next transaction nonce

-------
Returns
-------

``Address`` - blockchain address of the contract

-------
Example
-------

.. code-block:: javascript

  const contractAddress = calculateContractAddress(myKey.address, 1);

-----------------------------------------------------------------------------

publicKeyToAddress
==================

Calculates the address from a public key

.. code-block:: javascript

    publicKeyToAddress(publicKey);

----------
Parameters
----------

1. ``publicKey`` *(Uint8Array)* - public key as a byte buffer

-------
Returns
-------

``Address`` - blockchain address of the public key

-------
Example
-------

.. code-block:: javascript

  const address = publicKeyToAddress(myKey.publicKey);


-----------------------------------------------------------------------------

hexToUint8Array
===============

Basic conversion function to convert a hex string to a Uint8Array

.. code-block:: javascript

    hexToUint8Array(hex);

----------
Parameters
----------

1. ``hex`` *(String)* - string of hex characters (without ``0x`` prefix)

-------
Returns
-------

``Uint8Array`` - Uint8Array representation of the hex string

-------
Example
-------

.. code-block:: javascript

  const array = hexToUint8Array("010203fdfeff");


-----------------------------------------------------------------------------

uint8ArrayToHex
===============

Basic conversion function to convert a Uint8Array to a hex string

.. code-block:: javascript

    uint8ArrayToHex(array);

----------
Parameters
----------

1. ``array`` *(Uint8Array)* - array to convert

-------
Returns
-------

``String`` - hex representation of the array (without ``0x`` prefix)

-------
Example
-------

.. code-block:: javascript

  const myArray = new Uint8Array([1, 2, 3, 253, 254, 255]);
  const hex = uint8ArrayToHex(myArray);
  console.log(hex)

  > 010203fdfeff

