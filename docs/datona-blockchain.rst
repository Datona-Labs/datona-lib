.. _datona-blockchain:

#################
datona-blockchain
#################

Gives access to the Datona blockchain (Ethereum right now), providing functions to deploy, manage and access S-DACs.  Is designed to be used by both owner-end software (identity apps) and vault software.  Uses `web3 <https://github.com/ethereum/web3.js>`_.


*********
Constants
*********

* ``ZERO_ADDRESS`` *(Address)* = ``"0x0000000000000000000000000000000000000000"``


.. _Permissions:

****************************
Class Permissions
****************************

Encapsulates file/directory permissions returned by the ``getPermissions`` method of an SDAC.  Provides accessor functions to read properties of the permissions.

Properties
==========

* ``permissions`` *(byte)* - the raw permissions provided to the constructor.  Is expected to be of the form specified in the :ref:`SDAC Interface<SdacInterface>`.

Constructor
===========

Decodes a raw permissions byte.

.. code-block:: javascript

    new Permissions(permissionsByte);

----------
Parameters
----------

1. ``permissionsByte`` *(byte or String)* - the raw permissions byte either as an integer or a string of the form ``0xNN``.

------
Throws
------

* ``TypeError`` if the permissionsByte is a string and does not have the form ``0xNN``

-------
Example
-------

.. code-block:: javascript

  // using string format
  const permissions = new Permissions("0x87");

  // using byte returned from contract
  myContract.getPermissions(myAddress)
    .then( function(rawPermissions) {
        const permissions = new Permissions(rawPermissions);
        if (permissions.canRead()) { ...
        }
    });


-----------------------------------------------------------------------------

canRead
=======

Accesses the READ bit in the raw permissions.

.. code-block:: javascript

    if (permissions.canRead()) { ... }

-------
Returns
-------

``boolean`` - true if the bit is set in the raw permissions.

-----------------------------------------------------------------------------

canWrite
========

Accesses the WRITE bit in the raw permissions.

.. code-block:: javascript

    if (permissions.canWrite()) { ... }

-------
Returns
-------

``boolean`` - true if the bit is set in the raw permissions.

-----------------------------------------------------------------------------

canAppend
=========

Accesses the APPEND bit in the raw permissions.

.. code-block:: javascript

    if (permissions.canAppend()) { ... }

-------
Returns
-------

``boolean`` - true if the bit is set in the raw permissions.

-----------------------------------------------------------------------------

isDirectory
===========

Accesses the DIRECTORY bit in the raw permissions.

.. code-block:: javascript

    if (permissions.isDirectory()) { ... }

-------
Returns
-------

``boolean`` - true if the bit is set in the raw permissions.

-----------------------------------------------------------------------------


.. _Contract:

****************************
Class Contract
****************************

Represents a Smart Data Access Contract on the blockchain.  Provides functions to interact with the contract.

Constants
=========

Bit masks for the permissions byte returned by a Smart Data Access Contract:

* static ``NO_PERMISSIONS`` *(byte)* = ``0x00``
* static ``ALL_PERMISSIONS`` *(byte)* = ``0x07``;
* static ``READ_BIT`` *(byte)* = ``0x04``;
* static ``WRITE_BIT`` *(byte)* = ``0x02``;
* static ``APPEND_BIT`` *(byte)* = ``0x01``;
* static ``DIRECTORY_BIT`` *(byte)* = ``0x80``;

Reserved Addresses used by a Smart Data Access Contract:

* static ``ROOT_DIRECTORY`` *(Address)* = ``"0x0000000000000000000000000000000000000000"``;

Properties
==========

* ``address`` *(Address)* - the public blockchain address of the contract.  Will be ``undefined`` unless given in the constructor, set using setAddress_, or deployed using the deploy_ function.

Constructor
===========

Creates a new Contract instance.  Connects with the blockchain (if not connected already).

.. code-block:: javascript

    new Contract(abi, [address]);

----------
Parameters
----------

1. ``abi`` *(Object)* - The smart contract's `abi <https://solidity.readthedocs.io/en/latest/abi-spec.html>`_
2. ``address`` *(Address)* - (Optional) The address of the contract on the blockchain, if already deployed.  Exclude if constructing a new contract.  Note, the address can be set later via setAddress_ if preferred.

------
Throws
------

* ``BlockchainError`` - if it can't connect with the blockchain or the abi is invalid.

-------
Example
-------

.. code-block:: javascript

  const myContract = require("../contracts/myContract.json");
  const contract = new Contract(myContract.abi);


-----------------------------------------------------------------------------

setAddress
==========

Sets the address of this contract on the blockchain.  Can be used as an alternative to passing it in the constructor.

.. code-block:: javascript

    setAddress(address);

----------
Parameters
----------

1. ``address`` *(Address)* - address of the contract on the blockchain

------
Throws
------

* ``BlockchainError`` - if the address is already set

-------
Example
-------

.. code-block:: javascript

  const myContract = require("../contracts/myContract.json");
  const contract = new Contract(myContract.abi);
  contract.setAddress("0xfb3e6dd29d01c1b5b99e46db3fe26df1138b73d1");


-----------------------------------------------------------------------------

deploy
======

Deploys this contract on the blockchain.

.. code-block:: javascript

    deploy(key, bytecode, [constructorArgs]);

----------
Parameters
----------

1. ``key`` *(Key)* - the Datona Key object used to sign the transaction
2. ``bytecode`` *(string)* - the contract creation bytecode (in hex with no leading 0x)
3. ``constructorArgs`` *(Array)* - (Optional) arguments to pass to the contract's constructor

-------
Returns
-------

``Promise`` - A promise to deploy the contract on the blockchain, returning the contract address.

Resolves With
~~~~~~~~~~~~~

``Address`` - The blockchain address of the deployed contract.  Resolves after the transaction has been mined.

Rejects With
~~~~~~~~~~~~

* ``BlockchainError`` - if deployment failed.  If the blockchain VM reverted the transaction then examine the blockchain receipt in the error details.

------
Throws
------

* ``BlockchainError`` - if the bytecode is invalid

-------
Example
-------

.. code-block:: javascript

  const myContract = require("../contracts/myContract.json");
  const contract = new Contract(myContract.abi);

  var contractAddress;

  contract.deploy(myKey, myContract.bytecode, [1, requesterAddress])
    .then( function(address){
      contractAddress = address;
      const vault = new datona.vault.RemoteVault( vaultUrl, contractAddress, myKey );
      return vault.write("Hello World");
    })
    .catch( function(error){
      console.error(error);
    });


-----------------------------------------------------------------------------

getOwner
========

Gets the owner of the contract

.. code-block:: javascript

    getOwner();

-------
Returns
-------

``Promise`` - A promise to return owner's address

Resolves With
~~~~~~~~~~~~~

``Address`` - The owner's address

Rejects With
~~~~~~~~~~~~

* ``BlockchainError`` - if the contract owner could not be retrieved from the blockchain.

------
Throws
------

* ``BlockchainError`` - if the contract hasn't been deployed or mapped to a blockchain address.

-------
Example
-------

.. code-block:: javascript

  const myContract = require("../contracts/myContract.json");
  const contract = new Contract(myContract.abi, myContractAddress);

  contract.getOwner()
    .then(console.log)
    .catch(console.error);


-----------------------------------------------------------------------------

hasExpired
==========

Resolves true if the smart data access contract has expired.

.. code-block:: javascript

    hasExpired();

-------
Returns
-------

``Promise`` - A promise to return the expiry status

Resolves With
~~~~~~~~~~~~~

``boolean`` - True if the contract has expired.  False otherwise.

Rejects With
~~~~~~~~~~~~

* ``BlockchainError`` - if the expiry status could not be retrieved from the blockchain.

------
Throws
------

* ``BlockchainError`` - if the contract hasn't been deployed or mapped to a blockchain address.

-------
Example
-------

.. code-block:: javascript

  const myContract = require("../contracts/myContract.json");
  const contract = new Contract(myContract.abi, myContractAddress);

  contract.hasExpired()
    .then( function(expired){
      if (expired) {
        console.log("contract has expired");
      }
    })
    .catch(console.error);


-----------------------------------------------------------------------------

getPermissions
==============

Promises to call the contract's getPermissions method and return the permissions byte as a Permissions_ object.

.. code-block:: javascript

    getPermissions(requester, [file]);

----------
Parameters
----------

1. ``requester`` *(Address)* - the address of the requester that wants to read the data
2. ``file`` *(Address)* - (Optional) the specific file to check.  Defaults to the ``ROOT_DIRECTORY`` if not given.

-------
Returns
-------

``Promise`` - A promise to return the permissions byte encapsulated in a Permissions object

Resolves With
~~~~~~~~~~~~~

``Permissions`` - the Permissions_ object representing the permissions byte returned by the SDAC.

Rejects With
~~~~~~~~~~~~

* ``BlockchainError`` - if the permission status could not be retrieved from the blockchain.

------
Throws
------

* ``BlockchainError`` - if the contract hasn't been deployed or mapped to a blockchain address.

-------
Example
-------

.. code-block:: javascript

  const myContract = require("../contracts/myContract.json");
  const contract = new Contract(myContract.abi, myContractAddress);
  const fileId = "0x0000000000000000000000000000000000000001";
  const vaultUrl = "file://datonavault.com:8124";
  const vaultOwner = "0x288b32F2653C1d72043d240A7F938a114Ab69584";

  contract.getPermissions(myKey.address, fileId)
    .then( function(permissions){
      if (permissions.canRead() && !permissions.isDirectory()) {
        const vault = new datona.vault.RemoteVault( vaultUrl, contract.address, myKey, vaultOwner );
        return vault.read(fileId);
      }
    })
    .catch(console.error);

-----------------------------------------------------------------------------

canRead
=======

Resolves true if the owner of the given address is permitted to read the data from a given file in the vault controlled by this contract.

.. code-block:: javascript

    canRead(requester, [file]);

----------
Parameters
----------

1. ``requester`` *(Address)* - the address of the requester that wants to read the data
2. ``file`` *(Address)* - (Optional) the specific file to check.  Defaults to the ``ROOT_DIRECTORY`` if not given.

-------
Returns
-------

``Promise`` - A promise to return the permission status

Resolves With
~~~~~~~~~~~~~

``boolean`` - True if the address is permitted to read the file.  False otherwise.

Rejects With
~~~~~~~~~~~~

* ``BlockchainError`` - if the permission status could not be retrieved from the blockchain.

------
Throws
------

* ``BlockchainError`` - if the contract hasn't been deployed or mapped to a blockchain address.

-------
Example
-------

.. code-block:: javascript

  const myContract = require("../contracts/myContract.json");
  const contract = new Contract(myContract.abi, myContractAddress);
  const fileId = "0x0000000000000000000000000000000000000001";
  const vaultUrl = "file://datonavault.com:8124";
  const vaultOwner = "0x288b32F2653C1d72043d240A7F938a114Ab69584";

  contract.canRead(myKey.address, fileId)
    .then( function(permitted){
      if (permitted) {
        const vault = new datona.vault.RemoteVault( vaultUrl, contract.address, myKey, vaultOwner );
        return vault.read(fileId);
      }
    })
    .catch(console.error);

-----------------------------------------------------------------------------

canWrite
========

Resolves true if the owner of the given address is permitted to write to (or overwrite) a given file or directory in the vault controlled by this contract.

If permitted to write to a directory, the user can add a new file to the directory or can overwrite any file within that directory.

.. code-block:: javascript

    canWrite(requester, [file]);

----------
Parameters
----------

1. ``requester`` *(Address)* - the address of the requester that wants to write to the file
2. ``file`` *(Address)* - (Optional) the specific file or directory to check.  Defaults to the ``ROOT_DIRECTORY`` if not given.

-------
Returns
-------

``Promise`` - A promise to return the permission status

Resolves With
~~~~~~~~~~~~~

``boolean`` - True if the address is permitted to write to the file.  False otherwise.

Rejects With
~~~~~~~~~~~~

* ``BlockchainError`` - if the permission status could not be retrieved from the blockchain.

------
Throws
------

* ``BlockchainError`` - if the contract hasn't been deployed or mapped to a blockchain address.

-------
Example
-------

.. code-block:: javascript

  const myContract = require("../contracts/myContract.json");
  const contract = new Contract(myContract.abi, myContractAddress);
  const fileId = "0x0000000000000000000000000000000000000001";
  const vaultUrl = "file://datonavault.com:8124";
  const vaultOwner = "0x288b32F2653C1d72043d240A7F938a114Ab69584";

  contract.canWrite(myKey.address, fileId)
    .then( function(permitted){
      if (permitted) {
        const vault = new datona.vault.RemoteVault( vaultUrl, contract.address, myKey, vaultOwner );
        return vault.write("hello world", fileId);
      }
    })
    .catch(console.error);

-----------------------------------------------------------------------------

canAppend
=========

Resolves true if the owner of the given address is permitted to append to (or overwrite) a given file or directory in the vault controlled by this contract.

If permitted to append to a directory, the user can add a new file to the directory or can append to any file within that directory. It does not mean that existing files in that directory are (over)writable - use canWrite to determine this.

.. code-block:: javascript

    canAppend(requester, [file]);

----------
Parameters
----------

1. ``requester`` *(Address)* - the address of the requester that wants to append to the file
2. ``file`` *(Address)* - (Optional) the specific file to check.  Defaults to the ``ROOT_DIRECTORY`` if not given.

-------
Returns
-------

``Promise`` - A promise to return the permission status

Resolves With
~~~~~~~~~~~~~

``boolean`` - True if the address is permitted to append to the file.  False otherwise.

Rejects With
~~~~~~~~~~~~

* ``BlockchainError`` - if the permission status could not be retrieved from the blockchain.

------
Throws
------

* ``BlockchainError`` - if the contract hasn't been deployed or mapped to a blockchain address.

-------
Example
-------

.. code-block:: javascript

  const myContract = require("../contracts/myContract.json");
  const contract = new Contract(myContract.abi, myContractAddress);
  const fileId = "0x0000000000000000000000000000000000000001";
  const vaultUrl = "file://datonavault.com:8124";
  const vaultOwner = "0x288b32F2653C1d72043d240A7F938a114Ab69584";

  contract.canAppend(myKey.address, fileId)
    .then( function(permitted){
      if (permitted) {
        const vault = new datona.vault.RemoteVault( vaultUrl, contract.address, myKey, vaultOwner );
        return vault.append("some more info", fileId);
      }
    })
    .catch(console.error);

-----------------------------------------------------------------------------

getBytecode
===========

Gets the runtime bytecode of this contract from the blockchain

.. code-block:: javascript

    getBytecode();

-------
Returns
-------

``Promise`` - A promise to return the bytecode

Resolves With
~~~~~~~~~~~~~

``String`` - The runtime bytecode (in hex)

Rejects With
~~~~~~~~~~~~

* ``BlockchainError`` - if the bytecode could not be retrieved from the blockchain.

------
Throws
------

* ``BlockchainError`` - if the contract hasn't been deployed or mapped to a blockchain address.

-------
Example
-------

.. code-block:: javascript

  const myContract = require("../contracts/myContract.json");
  const contract = new Contract(myContract.abi, myContractAddress);

  contract.getBytecode()
    .then(console.log)
    .catch(console.error);
  > 60806040526004361061009e576000357c0100000000000...

-----------------------------------------------------------------------------

call
====

Calls the given view or pure contract method with the given arguments.  Use transact_ to call a state-modifying method instead.

.. code-block:: javascript

    call(method, [args);

----------
Parameters
----------

1. ``method`` *(String)* - the name of the contract method to call
2. ``args`` *(Array)* - (Optional) arguments to pass to the method

-------
Returns
-------

``Promise`` - A promise to return the output from the method.

Resolves With
~~~~~~~~~~~~~

The datatype that the contract method returns, e.g. ``string``, ``boolean``, ``integer``.

Rejects With
~~~~~~~~~~~~

* ``BlockchainError`` - if the call failed.  Examine the error details for more information.

------
Throws
------

* ``BlockchainError`` - if the contract hasn't been deployed or mapped to a blockchain address, the method does not exist or the method arguments are invalid.

-------
Example
-------

.. code-block:: javascript

  const myContract = require("../contracts/myContract.json");
  const contract = new Contract(myContract.abi);

  contract.call("isPermitted", [myKey.address])
    .then( function(permitted){
        console.log("isPermitted returned "+permitted);
    })
    .catch(console.error);
  > isPermitted returned true

-----------------------------------------------------------------------------

transact
========

Calls the given state-modifying contract method with the given arguments.  Use call_ to call a view or pure method instead.

.. code-block:: javascript

    call(key, method, [args);

----------
Parameters
----------

1. ``key`` *(Key)* - the key used to sign the transaction
2. ``method`` *(String)* - the name of the contract method to call
3. ``args`` *(Array)* - (Optional) arguments to pass to the method

-------
Returns
-------

``Promise`` - A promise to return the output from the method.

Resolves With
~~~~~~~~~~~~~

The datatype that the contract method returns, e.g. ``string``, ``boolean``, ``integer``.  Resolves after the transaction has been mined.

Rejects With
~~~~~~~~~~~~

* ``BlockchainError`` - if the call failed.  Examine the error details for more information.

------
Throws
------

* ``BlockchainError`` - if the contract hasn't been deployed or mapped to a blockchain address, the method does not exist or the method arguments are invalid.

-------
Example
-------

.. code-block:: javascript

  const myContract = require("../contracts/myContract.json");
  const contract = new Contract(myContract.abi);

  contract.transact(myKey, "terminate")
    .then( function(){
        console.log("contract has been terminated");
    })
    .catch(console.error);

-----------------------------------------------------------------------------

terminate
=========

Terminates this contract by calling it's ``terminate`` method.

.. code-block:: javascript

    terminate(key);

----------
Parameters
----------

1. ``key`` *(Key)* - the key used to sign the transaction

-------
Returns
-------

``Promise`` - A promise to attempt to terminate the contract

Resolves With
~~~~~~~~~~~~~

Resolves with no data if successful.  Resolves after the transaction has been mined.

Rejects With
~~~~~~~~~~~~

* ``BlockchainError`` - if the contract could not be terminated.

------
Throws
------

* ``BlockchainError`` - if the contract hasn't been deployed or mapped to a blockchain address.

-------
Example
-------

.. code-block:: javascript

  const myContract = require("../contracts/myContract.json");
  const contract = new Contract(myContract.abi, myContractAddress);

  contract.terminate()
    .then( function(){
      console.log("contract terminated");
    })
    .catch(console.error);

-----------------------------------------------------------------------------

assertBytecode
==============

Asserts that the contract's runtime bytecode equals the expected bytecode given.

.. code-block:: javascript

    assertBytecode(expectedBytecode);

----------
Parameters
----------

1. ``expectedBytecode`` *(String)* - the bytecode to test

-------
Returns
-------

``Promise`` - A promise to resolve if the bytecodes match, and to reject if not.

Resolves With
~~~~~~~~~~~~~

Resolves with no data if the contract's bytecode matches the bytecode given.

Rejects With
~~~~~~~~~~~~

* ``ContractTypeError`` - if the bytecodes do not match
* ``BlockchainError`` - if the bytecode could not be retrieved from the blockchain.

------
Throws
------

* ``BlockchainError`` - if the contract hasn't been deployed or mapped to a blockchain address.

-------
Example
-------

.. code-block:: javascript

  const myContract = require("../contracts/myContract.json");
  const contract = new Contract(myContract.abi, myContractAddress);

  contract.assertBytecode(myContract.runtimeBytecode)
    .then( function(){
      console.log("contract bytecode is as expected");
    })
    .catch(console.error);

-----------------------------------------------------------------------------

assertOwner
===========

Asserts that the contract's runtime bytecode equals the expected bytecode given.

.. code-block:: javascript

    assertOwner(expectedOwner);

----------
Parameters
----------

1. ``expectedOwner`` *(Address)* - the owner address to test

-------
Returns
-------

``Promise`` - A promise to resolve if the addresses match, and to reject if not.

Resolves With
~~~~~~~~~~~~~

Resolves with no data if the contract's owner matches the address given.

Rejects With
~~~~~~~~~~~~

* ``ContractOwnerError`` - if the owner does not match
* ``BlockchainError`` - if the owner could not be retrieved from the blockchain.

------
Throws
------

* ``BlockchainError`` - if the contract hasn't been deployed or mapped to a blockchain address.

-------
Example
-------

.. code-block:: javascript

  const myContract = require("../contracts/myContract.json");
  const contract = new Contract(myContract.abi, myContractAddress);

  contract.assertOwner(myKey.address)
    .then( function(){
      console.log("I am the owner of contract "+contract.address);
    })
    .catch(console.error);

-----------------------------------------------------------------------------

assertNotExpired
================

Resolves provided the contract has not expired.

.. code-block:: javascript

    assertNotExpired();

-------
Returns
-------

``Promise`` - A promise to resolve if the contract has not expired, and to reject if not.

Resolves With
~~~~~~~~~~~~~

Resolves with no data if the contract has not expired.

Rejects With
~~~~~~~~~~~~

* ``ContractExpiryError`` - if the contract has expired
* ``BlockchainError`` - if the expiry status could not be retrieved from the blockchain.

------
Throws
------

* ``BlockchainError`` - if the contract hasn't been deployed or mapped to a blockchain address.

-------
Example
-------

.. code-block:: javascript

  const myContract = require("../contracts/myContract.json");
  const contract = new Contract(myContract.abi, myContractAddress);

  contract.assertOwner(myKey.address)
    .then( contract.assertNotExpired )
    .then( updateMyData )
    .catch(console.error);

-----------------------------------------------------------------------------

assertHasExpired
================

Resolves provided the contract has expired.

.. code-block:: javascript

    assertNotExpired();

-------
Returns
-------

``Promise`` - A promise to resolve if the contract has expired, and to reject if not.

Resolves With
~~~~~~~~~~~~~

Resolves with no data if the contract has expired.

Rejects With
~~~~~~~~~~~~

* ``ContractExpiryError`` - if the contract has not expired
* ``BlockchainError`` - if the expiry status could not be retrieved from the blockchain.

------
Throws
------

* ``BlockchainError`` - if the contract hasn't been deployed or mapped to a blockchain address.

-------
Example
-------

.. code-block:: javascript

  const myContract = require("../contracts/myContract.json");
  const contract = new Contract(myContract.abi, myContractAddress);

  contract.terminate(myKey)
    .then( contract.assertHasExpired )
    .then( function(){
      console.log("Double checked. Contract has been terminated.");
    })
    .catch(console.error);

-----------------------------------------------------------------------------

assertCanRead
=============

Resolves provided the given address is permitted to read the given file or directory in the vault controlled by this contract.

.. code-block:: javascript

    assertCanRead(requester, [file]);

----------
Parameters
----------

1. ``requester`` *(Address)* - the address of the requester that wants to read the data
2. ``file`` *(Address)* - (Optional) the specific file to check.  Defaults to the ``ROOT_DIRECTORY`` if not given.

-------
Returns
-------

``Promise`` - A promise to resolve if the given address is permitted to read the given file, and to reject if not.

Resolves With
~~~~~~~~~~~~~

``Permissions`` - the Permissions_ object representing the permissions byte returned by the SDAC. Only resolves if the requester is permitted.

Rejects With
~~~~~~~~~~~~

* ``PermissionError`` - if permission is not granted
* ``BlockchainError`` - if the expiry status could not be retrieved from the blockchain.

------
Throws
------

* ``BlockchainError`` - if the contract hasn't been deployed or mapped to a blockchain address.

-------
Example
-------

.. code-block:: javascript

  const expectedContract = require("../contracts/myContract.json");
  const contract = new Contract(expectedContract.abi, customer.contractAddress);
  const fileId = "0x0000000000000000000000000000000000000001";

  contract.assertBytecode(expectedContract.runtimeBytecode)
    .then( () => { return contract.assertOwner(customer.address) })
    .then( () => { return contract.assertCanRead(myKey.address, fileId) })
    .then( function(){
      console.log("Confirmed customer's contract is valid");
    })
    .catch(console.error);

-----------------------------------------------------------------------------

assertCanWrite
==============

Resolves provided the given address is permitted to write to the given file or directory in the vault controlled by this contract.

.. code-block:: javascript

    assertCanWrite(requester, [file]);

----------
Parameters
----------

1. ``requester`` *(Address)* - the address of the requester that wants to write the data
2. ``file`` *(Address)* - (Optional) the specific file to check.  Defaults to the ``ROOT_DIRECTORY`` if not given.

-------
Returns
-------

``Promise`` - A promise to resolve if the given address is permitted to write to the given file, and to reject if not.

Resolves With
~~~~~~~~~~~~~

``Permissions`` - the Permissions_ object representing the permissions byte returned by the SDAC. Only resolves if the requester is permitted.

Rejects With
~~~~~~~~~~~~

* ``PermissionError`` - if permission is not granted
* ``BlockchainError`` - if the expiry status could not be retrieved from the blockchain.

------
Throws
------

* ``BlockchainError`` - if the contract hasn't been deployed or mapped to a blockchain address.

-------
Example
-------

.. code-block:: javascript

  const expectedContract = require("../contracts/myContract.json");
  const contract = new Contract(expectedContract.abi, customer.contractAddress);
  const ownersFile = "0x0000000000000000000000000000000000000001";
  const resultsFile = "0x0000000000000000000000000000000000000002";

  contract.assertBytecode(expectedContract.runtimeBytecode)
    .then( () => { return contract.assertOwner(customer.address) })
    .then( () => { return contract.assertCanRead(myKey.address, ownersFile) })
    .then( () => { return contract.assertCanWrite(myKey.address, resultsFile) })
    .then( function(){
      console.log("Confirmed customer's contract is valid");
    })
    .catch(console.error);

-----------------------------------------------------------------------------

assertCanAppend
===============

Resolves provided the given address is permitted to append to the given file or directory in the vault controlled by this contract.

.. code-block:: javascript

    assertCanAppend(requester, [file]);

----------
Parameters
----------

1. ``requester`` *(Address)* - the address of the requester that wants to append the data
2. ``file`` *(Address)* - (Optional) the specific file to check.  Defaults to the ``ROOT_DIRECTORY`` if not given.

-------
Returns
-------

``Promise`` - A promise to resolve if the given address is permitted to append to the given file, and to reject if not.

Resolves With
~~~~~~~~~~~~~

``Permissions`` - the Permissions_ object representing the permissions byte returned by the SDAC. Only resolves if the requester is permitted.

Rejects With
~~~~~~~~~~~~

* ``PermissionError`` - if permission is not granted
* ``BlockchainError`` - if the expiry status could not be retrieved from the blockchain.

------
Throws
------

* ``BlockchainError`` - if the contract hasn't been deployed or mapped to a blockchain address.

-------
Example
-------

.. code-block:: javascript

  const expectedContract = require("../contracts/myContract.json");
  const contract = new Contract(expectedContract.abi, customer.contractAddress);
  const ownersFile = "0x0000000000000000000000000000000000000001";
  const logFile = "0x0000000000000000000000000000000000000002";

  contract.assertBytecode(expectedContract.runtimeBytecode)
    .then( () => { return contract.assertOwner(customer.address) })
    .then( () => { return contract.assertCanRead(myKey.address, ownersFile) })
    .then( () => { return contract.assertCanAppend(myKey.address, logFile) })
    .then( function(){
      console.log("Confirmed customer's contract is valid");
    })
    .catch(console.error);

-----------------------------------------------------------------------------

.. _GenericSmartDataAccessContract:

************************************
Class GenericSmartDataAccessContract
************************************

Instance of Contract_ providing an interface to any Smart Data Access Contract.  Maps to a contract at the given address using the standard :ref:`SDAC Interface<SdacInterface>` ABI.

Constructor
===========

Creates a new Contract instance.  Connects with the blockchain (if not connected already).

.. code-block:: javascript

    new GenericSmartDataAccessContract(address);

----------
Parameters
----------

1. ``address`` *(Address)* - The address of the contract on the blockchain.

------
Throws
------

* ``BlockchainError`` - if it can't connect with the blockchain.

-------
Example
-------

.. code-block:: javascript

  const contract = new GenericSmartDataAccessContract(customer.contractAddress);

-----------------------------------------------------------------------------


*********
Functions
*********

.. _setProvider:

setProvider
===========

Overrides the default gateway service to the blockchain (that configured in config.json).  Supported URL schemes (protocols) are ws, wss, http and https.

.. code-block:: javascript

    setProvider(url);

----------
Parameters
----------

1. ``url`` *(URL)* - url of the blockchain provider


------
Throws
------

* ``BlockchainError`` - if the url is invalid or the scheme (protocol) is not supported.

-------
Example
-------

.. code-block:: javascript

  const myGateway = { scheme: "https", host: "kovan.infura.com:, port: "" };

  datona.blockchain.setProvider(myGateway);

-----------------------------------------------------------------------------

.. _sendTransaction:

sendTransaction
===============

Promises to publish a transaction on the blockchain.  There are three types of transactions: balance transfers between accounts; contract deployment and contract function calls.  The ``Contract`` class above should be used for contract deployment and calls.

.. code-block:: javascript

    sendTransaction(key, transaction);

----------
Parameters
----------

1. ``key`` *(Key)* - the Datona Key object used to sign the transaction
2. ``transaction`` *(Object)* - Object containing the transaction

The Transaction parameter has the following structure:
  - ``from`` *(String)* - (optional) source address.  Will be auto populated from the ``key`` parameter if not given.
  - ``to`` *(String)* - destination address (account or contract address).  Leave undefined if this is a deployment transaction.
  - ``value`` *(Number|String|BN|BigNumber)* - eth to transfer to the destination in wei, if any.  Can be omitted if this is a contract deployment or call.
  - ``data`` *(String)* - hex string data (with ``0x`` prefix) to include in the transaction.  If a contract deployment, this is the contract bytecode.  If a contract call this is the call information.
  - ``gasPrice`` *(Number)* - (optional) the price you are offering to pay per unit of gas in wei.  If not given, the gas price will be auto populated using the median gas price of the last few blocks.
  - ``gas`` *(Number|String|BN|BigNumber)* - (optional) the maximum amount of gas allowed for the transaction (gas limit). Warning - A high gas limit is used if the ``gas`` parameter is not given.
  - ``nonce`` *(Number)* - (optional) must be the correct value for the sending address.  The EVM expects this nonce to increment each time a transaction is successfully published from the sending address.  The nonce will be automatically calculated so it should be left undefined unless you know what you are doing.

-------
Returns
-------

``Promise`` - A promise to publish the transaction.

Resolves With
~~~~~~~~~~~~~

``receipt`` - An object containing the EVM receipt.  Will only resolve if the receipt's status is ``0x01`` - will reject if not.  See `here <https://ethereum.stackexchange.com/questions/6531/structure-of-a-transaction-receipt>`_ for information on the receipt structure.

Rejects With
~~~~~~~~~~~~

* ``BlockchainError`` - if the transaction is invalid, could not be published or was rejected by the EVM.

-------
Example
-------

.. code-block:: javascript

  const myTransaction = {
    to: "0xc16a409a39EDe3F38E212900f8d3afe6aa6A8929",
    value: 1000,
    data: "0x01020304
  }

  datona.blockchain.sendTransaction(myKey, myTransaction)
    .then(console.log)
    .catch(console.error);

-----------------------------------------------------------------------------

.. _subscribe:

subscribe
=========

Subscribes the client to receive notification of a new contract deployed to the blockchain with the given code hash.  Optionally, the client can receive notification only if the given address is permitted to access the data controlled by the contract.

.. code-block:: javascript

    subscribe(bytecodeHash, callback, [permittedAddress]);

----------
Parameters
----------

1. ``bytecodeHash`` *(Hash)* - hash of the runtime bytecode of the new contract to monitor for
2. ``callback`` *(function)* - function to call if new contract is found: ``function callback(contractAddress, bytecodeHash)``
3. ``permittedAddress`` *(String)* - (Optional) address to check if permitted

**callback parameters**

1. ``contractAddress`` *(Address)* - blockchain address of the new contract
2. ``bytecodeHash`` *(Hash)* - (Optional) hash of the runtime bytecode of the new contract.  Allows the same callback to be used for multiple subscriptions.

-------
Returns
-------

``Hash`` - unique subscription id (can be used to unsubscribe_ later).

------
Throws
------

* ``BlockchainError`` - if web3 cannot be subscribed to

-------
Example
-------

.. code-block:: javascript

  const myContract = require("../contracts/myContract.json");
  const subscription = subscribe(datona.crypto.hash(myContract.runtimeBytecode), registerNewCustomer, myKey.address);

  function registerNewCustomer(contractAddress) {
    const contract = new Contract(myContract.abi, contractAddress);
    contract.getOwner()
      .then( function(ownerAddress){
        const newCustomer = { owner: ownerAddress, contract: contractAddress };
        customers.push(newCustomer);
      })
      .catch( function(error){
        console.error("Couldn't get owner of new customer contract.  Try again later. "+contractAddress+" - "+error.message);
        const newCustomer = { owner: undefined, contract: contractAddress };
        customers.push(newCustomer);
      });
  }

-----------------------------------------------------------------------------

unsubscribe
===========

Unsubscribes a previous subscription.  The subscription is identified by the subscription id returned from the original call to subscribe_.

.. code-block:: javascript

    unsubscribe(subscriptionId);

----------
Parameters
----------

1. ``subscriptionId`` *(Hash)* - the subscription to unsubscribe

-------
Returns
-------

``uint`` - the number of subscriptions unsubscribed.

-------
Example
-------

.. code-block:: javascript

  const myContract = require("../contracts/myContract.json");
  const subscription = subscribe(datona.crypto.hash(myContract.runtimeBytecode), registerNewCustomer, myKey.address);

  ...

  if( unsubscribe(subscription) == 0 ) console.error("failed to unsubscribe");


-----------------------------------------------------------------------------

close
=====

Closes the connection to the blockchain.  Should be called on program exit if any blockchain functions have been used.

.. code-block:: javascript

    close();

------
Throws
------

* ``BlockchainError`` - if the connection cannot be closed.
