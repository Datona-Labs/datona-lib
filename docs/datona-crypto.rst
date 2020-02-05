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

*********
Functions
*********

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