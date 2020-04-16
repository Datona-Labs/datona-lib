.. _datona-vault:

############
datona-vault
############

.. _RemoteVault:

****************************
Class RemoteVault
****************************

Represents a single vault within a vault server controlled by a single S-DAC.  Is designed to be used by data owners to create, update and delete a vault, and by requesters to access a vault.  Extends :ref:`DatonaConnector`.

Properties
==========

* ``url`` *(URL)* - the URL given to the constructor
* ``remoteAddress`` *(Address)* - the public blockchain address of the remote data vault server given to the constructor.

Constructor
===========

Creates a new RemoteVault instance with a network client suitable for the given url scheme.

.. code-block:: javascript

    new RemoteVault(url, contractAddress, localPrivateKey, remoteAddress);

----------
Parameters
----------

1. ``url`` *(URL)* - the URL object identifying the server, port and URI scheme of the remote data vault server
2. ``contractAddress`` *(Address)* - The address of the contract that controls this vault
3. ``localPrivateKey`` *(Key)* - The Key object used to sign any transactions
4. ``remoteAddress`` - the public blockchain address of the remote data vault server.  Used for verifying received responses.

------
Throws
------

* ``VaultError`` - if the url scheme is unsupported

-------
Example
-------

.. code-block:: javascript

  const url = { scheme: "file", host: "datonavault.com", port: "8643" };
  const myContractAddress = "0x008Cd346b65F5aFa306Ef9160a84455D308e6851";
  const remoteAddress = "0x41A60F71063CD7c9e5247d3E7d551f91f94b5C3b";
  const remoteVault = new RemoteVault(url, myContractAddress, myKey, remoteAddress);

-----------------------------------------------------------------------------

create
======

Promises to create a new vault on the remote data vault server containing the given data.  This method creates the data request, signs it, initiates the vault request and handles the vault response.

.. code-block:: javascript

    create();

-------
Returns
-------

``Promise`` - A promise to create this vault and resolve if successful.  Promises to reject if the vault was not created for any reason.

Resolves With
~~~~~~~~~~~~~

``{ txn: VaultResponse, signatory: Address }`` - the server response transaction and signatory's address, validated to confirm it was sent by the ``remoteAddress`` given in the constructor.  See :ref:`VaultResponse`.  If the response is an error type then the promise will reject instead.

Rejects With
~~~~~~~~~~~~

* ``ContractOwnerError`` - if you are not the vault owner (the contract owner)
* ``ContractExpiryError`` - if the contract has expired
* ``VaultError`` - if the vault server failed to create the vault for any reason.
* ``CommunicationError`` - if communication with the vault server failed
* ``TransactionError`` - if the structure of the server response was invalid or was not signed by the vault server's remote.
* ``MalformedRequestError`` - if the request form is invalid or fields are missing or invalid
* ``InvalidSignatureError`` - if the signatory cannot be recovered from the signature

-------
Example
-------

.. code-block:: javascript

  const remoteVault = new RemoteVault(url, myContractAddress, myKey, remoteAddress);

  remoteVault.create()
    .then( () => { console.log("vault created successfully") })
    .catch( console.error );

-----------------------------------------------------------------------------

write
=====

Promises to write data to the vault, to a specific file if specified. This method creates the data request, signs it, initiates the vault request and handles the vault response.

.. code-block:: javascript

    write(data, [file]);

----------
Parameters
----------

1. ``data`` *(Object)* - the data to be stored
2. ``file`` *(Address)* - (Optional) the specific file to write to.  Defaults to the :ref:`ROOT_DIRECTORY<Contract>` if not given.

-------
Returns
-------

``Promise`` - A promise to write the data to the given file in this vault and resolve if successful.  Promises to reject if the vault was not updated for any reason.

Resolves With
~~~~~~~~~~~~~

``{ txn: VaultResponse, signatory: Address }`` - the server response transaction and signatory's address, validated to confirm it was sent by the ``remoteAddress`` given in the constructor.  See :ref:`VaultResponse`.  If the response is an error type then the promise will reject instead.

Rejects With
~~~~~~~~~~~~

* ``ContractOwnerError`` - if you are not the vault owner (the contract owner)
* ``ContractExpiryError`` - if the contract has expired
* ``VaultError`` - if the vault server failed to update the vault for any reason.
* ``CommunicationError`` - if communication with the vault server failed
* ``TransactionError`` - if the structure of the server response was invalid or was not signed by the vault server's remote.
* ``MalformedRequestError`` - if the request form is invalid or fields are missing or invalid
* ``InvalidSignatureError`` - if the signatory cannot be recovered from the signature

-------
Example
-------

.. code-block:: javascript

  const remoteVault = new RemoteVault(url, myContractAddress, myKey, remoteAddress);

  remoteVault.write("Hello World", "0xF000000000000000000000000000000000000002")
    .then( () => { console.log("vault updated successfully") })
    .catch( console.error );

-----------------------------------------------------------------------------

append
======

Promises to append data to the vault, to a specific file or directory if specified. This method creates the data request, signs it, initiates the vault request and handles the vault response.

When appending data to a directory, the data is written to a new file in that directory.  The ``file`` parameter must contain a unique file name, e.g. "0x0000000000000000000000000000000000000001/myfile1.txt"

.. code-block:: javascript

    append(data, [file]);

----------
Parameters
----------

1. ``data`` *(Object)* - the data to be appended
2. ``file`` *(Address)* - (Optional) the specific file to write to.  Defaults to the :ref:`ROOT_DIRECTORY<Contract>` if not given.

-------
Returns
-------

``Promise`` - A promise to write the data to the given file in this vault and resolve if successful.  Promises to reject if the vault was not updated for any reason.

Resolves With
~~~~~~~~~~~~~

``{ txn: VaultResponse, signatory: Address }`` - the server response transaction and signatory's address, validated to confirm it was sent by the ``remoteAddress`` given in the constructor.  See :ref:`VaultResponse`.  If the response is an error type then the promise will reject instead.

Rejects With
~~~~~~~~~~~~

* ``ContractOwnerError`` - if you are not the vault owner (the contract owner)
* ``ContractExpiryError`` - if the contract has expired
* ``VaultError`` - if the vault server failed to update the vault for any reason.
* ``CommunicationError`` - if communication with the vault server failed
* ``TransactionError`` - if the structure of the server response was invalid or was not signed by the vault server's remote.
* ``MalformedRequestError`` - if the request form is invalid or fields are missing or invalid
* ``InvalidSignatureError`` - if the signatory cannot be recovered from the signature

-------
Example
-------

.. code-block:: javascript

  const remoteVault = new RemoteVault(url, myContractAddress, myKey, remoteAddress);

  remoteVault.append("some additional info", "0xF000000000000000000000000000000000000002")
    .then( () => { console.log("vault appended successfully") })
    .catch( console.error );

-----------------------------------------------------------------------------

read
=====

Promises to retrieve the data from this vault if permitted.  This method creates the data request, signs it, initiates the vault request and handles the vault response.

.. code-block:: javascript

    read([file]);

----------
Parameters
----------

1. ``file`` *(Address)* - (Optional) the specific file or directory to read from.  Defaults to the :ref:`ROOT_DIRECTORY<Contract>` if not given.

-------
Returns
-------

``Promise`` - A promise to retrieve the data and resolve if successful.  Promises to reject if the vault could not be accessed for any reason.

Resolves With
~~~~~~~~~~~~~

``Object`` - the data returned from the vault in whatever format it was written.

Rejects With
~~~~~~~~~~~~

* ``PermissionError`` - if you are not permitted to access the vault
* ``ContractExpiryError`` - if the contract has expired
* ``VaultError`` - if the vault server could not handle the request for any reason.
* ``CommunicationError`` - if communication with the vault server failed
* ``TransactionError`` - if the structure of the server response was invalid or was not signed by the vault server's remote.
* ``MalformedRequestError`` - if the request form is invalid or fields are missing or invalid
* ``InvalidSignatureError`` - if the signatory cannot be recovered from the signature

-------
Example
-------

.. code-block:: javascript

  const remoteVault = new RemoteVault(url, myContractAddress, myKey, remoteAddress);

  remoteVault.read("0xF000000000000000000000000000000000000002")
    .then( (data) => { console.log("vault contains: "+data) )
    .catch( console.error );

-----------------------------------------------------------------------------

delete
======

Promises to delete this vault and its data provided the contract has expired or has been terminated.  This method creates the data request, signs it, initiates the vault request and handles the vault response.

.. code-block:: javascript

    delete();

-------
Returns
-------

``Promise`` - A promise to delete the vault and resolve if successful.  Promises to reject if the vault could not be deleted for any reason.

Resolves With
~~~~~~~~~~~~~

``{ txn: VaultResponse, signatory: Address }`` - the server response transaction and signatory's address, validated to confirm it was sent by the ``remoteAddress`` given in the constructor.  See :ref:`VaultResponse`.  If the response is an error type then the promise will reject instead.

Rejects With
~~~~~~~~~~~~

* ``ContractOwnerError`` - if you are not the vault owner (the contract owner)
* ``ContractExpiryError`` - if the contract has not expired
* ``VaultError`` - if the vault server could not handle the request for any reason.
* ``CommunicationError`` - if communication with the vault server failed
* ``TransactionError`` - if the structure of the server response was invalid or was not signed by the vault server's remote.
* ``MalformedRequestError`` - if the request form is invalid or fields are missing or invalid
* ``InvalidSignatureError`` - if the signatory cannot be recovered from the signature

-------
Example
-------

.. code-block:: javascript

  const remoteVault = new RemoteServer(url, myContractAddress, myKey, remoteAddress);

  remoteVault.delete()
    .then( () => { console.log("vault deleted") })
    .catch( console.error );

-----------------------------------------------------------------------------

.. _VaultKeeper:

****************************
Class VaultKeeper
****************************

Guardian of a Vault Data Server.  Designed to be used by developers of data vault servers, whether cloud based or locally hosted.

All create, update, access and delete requests go through the Vault Keeper, where they are approved or rejected against the Datona Smart Data Access Protocol.  If approved and permission granted by the vault's Smart Data Access Contract, the VaultKeeper passes the raw request to the VaultDataServer_ object given to the constructor.

Properties
==========

* ``vaultDataServer`` *(VaultDataServer)* - the VaultDataServer_ instance given to the constructor

Constructor
===========

Creates a new VaultKeeper instance

.. code-block:: javascript

    new VaultKeeper(vaultDataServer, key);

----------
Parameters
----------

1. ``vaultDataServer`` *(VaultDataServer)* - the VaultDataServer_ instance that provides the data server service.
2. ``key`` *(Key)* - The vault server's private key as a Key object.  Used to sign any transactions.  The signature is used by the remote client to authenticate the vault server and so this key must correspond to the vault server's public identity.

-------
Example
-------

.. code-block:: javascript

  DataServer = require('MyDataServer.js');
  const vaultManager = new DataServer();
  const vaultKeeper = new VaultKeeper(vaultManager, myKey);

-----------------------------------------------------------------------------

handleSignedRequest
===================

Primary method to process a signed VaultRequest from a client.  Decodes and processes the request, checks the validity of the signature, validates the request and passes the raw data request to the VaultDataServer_ instance given to the constructor.

.. code-block:: javascript

    handleSignedRequest(signedRequestStr);

----------
Parameters
----------

1. ``signedRequestStr`` *(SignedTransaction)* - the data to be stored

-------
Returns
-------

``Promise`` - A promise to resolve with a signed success or error :ref:`VaultResponse`.

Resolves With
~~~~~~~~~~~~~

``SignedTransaction`` - containing the VaultResponse and transaction signature, ready to send back to the client.

Rejects With
~~~~~~~~~~~~

Does not reject.  Any error is converted to signed error VaultResponse and resolved.

-------
Example
-------

.. code-block:: javascript

  const myDataVaultServer = net.createServer(connection);

  connection(c){

    c.on('data', (buffer) => {
      const data = buffer.toString();
      vaultKeeper.handleSignedRequest(data)
        .then( function(response){
          c.write(response);
          c.end();
        })
        .catch( console.error ); // should never happen
    });

  }

-----------------------------------------------------------------------------

createVault
===========

Can be used if handleSignedRequest_ is not appropriate.  Handles a valid create request.  This method checks the validity of the signature and validates the request before creating a new vault via the VaultDataServer.

.. code-block:: javascript

    createVault(request, signatory);

----------
Parameters
----------

1. ``request`` *(VaultRequest)* - VaultRequest of type 'create' containing the contract address and data to put in the vault
2. ``signatory`` *(Address)* - signatory the address that signed the request.  Must be the owner of the contract.

-------
Returns
-------

``Promise`` - A promise to create the vault and resolve a success or error response.

Resolves With
~~~~~~~~~~~~~

``SignedTransaction`` - containing the VaultResponse and transaction signature, ready to send back to the client.

Rejects With
~~~~~~~~~~~~

Does not reject.  Any error is converted to signed error VaultResponse and resolved.

An error response will be resolved if:

(a) the request is not a valid "create" request
(b) the signature is invalid;
(c) the signatory is not the owner of the contract
(d) the contract has expired
(e) the VaultDataServer returns an error

-------
Example
-------

.. code-block:: javascript

  const {txn, signatory} = comms.decodeTransaction(signedRequestStr);
  if (txn.requestType == "create") {
    vaultKeeper.createVault(txn, signatory)
      .then( myServer.sendResponse )
      .catch( console.error );  // should never happen
  }

-----------------------------------------------------------------------------

writeVault
===========

Can be used if handleSignedRequest_ is not appropriate.  Handles a valid write request.  This method checks the validity of the signature and validates the request before updating the vault via the VaultDataServer.

.. code-block:: javascript

    writeVault(request, signatory);

----------
Parameters
----------

1. ``request`` *(VaultRequest)* - VaultRequest of type 'write' containing the contract address, file to write and data to put in the vault
2. ``signatory`` *(Address)* - signatory the address that signed the request.  Must be the owner of the contract.

-------
Returns
-------

``Promise`` - A promise to write to the vault and resolve a success or error response.

Resolves With
~~~~~~~~~~~~~

``SignedTransaction`` - containing the VaultResponse and transaction signature, ready to send back to the client.

Rejects With
~~~~~~~~~~~~

Does not reject.  Any error is converted to signed error VaultResponse and resolved.

An error response will be resolved if:

(a) the request is not a valid "create" request
(b) the signature is invalid;
(c) the signatory is not the owner of the contract
(d) the contract has expired
(e) the VaultDataServer returns an error

-------
Example
-------

.. code-block:: javascript

  const {txn, signatory} = comms.decodeTransaction(signedRequestStr);
  if (txn.requestType == "write") {
    vaultKeeper.writeVault(txn, signatory)
      .then( myServer.sendResponse )
      .catch( console.error );  // should never happen
  }

-----------------------------------------------------------------------------

appendVault
===========

Can be used if handleSignedRequest_ is not appropriate.  Handles a valid append request.  This method checks the validity of the signature and validates the request before updating the vault via the VaultDataServer.

.. code-block:: javascript

    appendVault(request, signatory);

----------
Parameters
----------

1. ``request`` *(VaultRequest)* - VaultRequest of type 'append' containing the contract address, file to append and data to put in the vault
2. ``signatory`` *(Address)* - signatory the address that signed the request.  Must be the owner of the contract.

-------
Returns
-------

``Promise`` - A promise to append to the vault and resolve a success or error response.

Resolves With
~~~~~~~~~~~~~

``SignedTransaction`` - containing the VaultResponse and transaction signature, ready to send back to the client.

Rejects With
~~~~~~~~~~~~

Does not reject.  Any error is converted to signed error VaultResponse and resolved.

An error response will be resolved if:

(a) the request is not a valid "append" request
(b) the signature is invalid;
(c) the signatory is not the owner of the contract
(d) the contract has expired
(e) the VaultDataServer returns an error

-------
Example
-------

.. code-block:: javascript

  const {txn, signatory} = comms.decodeTransaction(signedRequestStr);
  if (txn.requestType == "append") {
    vaultKeeper.appendVault(txn, signatory)
      .then( myServer.sendResponse )
      .catch( console.error );  // should never happen
  }

-----------------------------------------------------------------------------

readVault
=========

Can be used if handleSignedRequest_ is not appropriate.  Handles a valid read request.  This method checks the validity of the signature and validates the request before accessing the vault via the VaultDataServer.

.. code-block:: javascript

    readVault(request, signatory);

----------
Parameters
----------

1. ``request`` *(VaultRequest)* - VaultRequest of type 'read' containing the contract address and file to read
2. ``signatory`` *(Address)* - signatory the address that signed the request.  Must be permitted to access the vault.

-------
Returns
-------

``Promise`` - A promise to access the vault and resolve a success or error response.

Resolves With
~~~~~~~~~~~~~

``SignedTransaction`` - containing the VaultResponse and transaction signature, ready to send back to the client.  A successful VaultResponse will contain the data from the vault.

Rejects With
~~~~~~~~~~~~

Does not reject.  Any error is converted to a signed error VaultResponse and resolved.

An error response will be resolved if:

(a) the request is not a valid "access" request
(b) the signature is invalid;
(c) the signatory is not permitted to access the vault (contract's isPermitted function returns false)
(d) the contract has expired
(e) the VaultDataServer returns an error

-------
Example
-------

.. code-block:: javascript

  const {txn, signatory} = comms.decodeTransaction(signedRequestStr);
  if (txn.requestType == "read") {
    vaultKeeper.readVault(txn, signatory)
      .then( myServer.sendResponse )
      .catch( console.error );  // should never happen
  }

-----------------------------------------------------------------------------

deleteVault
===========

Can be used if handleSignedRequest_ is not appropriate.  Handles a valid delete request.  This method checks the validity of the signature and validates the request before deleting the vault via the VaultDataServer.  The contract must have expired (contract's hasExpired function returns true) before a vault can be deleted.

.. code-block:: javascript

    deleteVault(request, signatory);

----------
Parameters
----------

1. ``request`` *(VaultRequest)* - VaultRequest of type 'delete' containing the contract address and data to put in the vault
2. ``signatory`` *(Address)* - signatory the address that signed the request.  Must be the owner of the contract.

-------
Returns
-------

``Promise`` - A promise to delete the vault and resolve a success or error response.

Resolves With
~~~~~~~~~~~~~

``SignedTransaction`` - containing the VaultResponse and transaction signature, ready to send back to the client.

Rejects With
~~~~~~~~~~~~

Does not reject.  Any error is converted to signed error VaultResponse and resolved.

An error response will be resolved if:

(a) the request is not a valid "delete" request
(b) the signature is invalid;
(c) the signatory is not the owner of the contract
(d) the contract has not expired
(e) the VaultDataServer returns an error

-------
Example
-------

.. code-block:: javascript

  const {txn, signatory} = comms.decodeTransaction(signedRequestStr);
  if (txn.requestType == "create") {
    vaultKeeper.deleteVault(txn, signatory)
      .then( myServer.sendResponse )
      .catch( console.error );  // should never happen
  }

-----------------------------------------------------------------------------

.. _VaultDataServer:

****************************
Interface VaultDataServer
****************************

To use the Datona VaultKeeper_, data vault developers must develop a class of this type that provides the data vault's data server capability.  For example, a class could be developed to interface with an existing database, a remote file server or a local file system.  If extending this interface, override the functions supported by your data server.

-----------------------------------------------------------------------------

create
======

Must create a new vault identified by the given contract address.  Must fail if the vault already exists.

.. code-block:: javascript

    create(contract);

----------
Parameters
----------

1. ``contract`` *(Address)* - the address of the contract to identify the vault.  Future write, append, read and delete requests will identify the vault using this contract address.

-------
Returns
-------

``Promise`` - A promise to create the vault.  Must reject with a VaultError object if unsuccessful.

-----------------------------------------------------------------------------

write
=====

Must unconditionally write the given data to the given file in the vault identified by the given contract address, overwriting its contents if it already exists.  Will fail if the vault does not exist.

.. code-block:: javascript

    write(contract, file, data);

----------
Parameters
----------

1. ``contract`` *(Address)* - the address of the contract to identify the vault.
2. ``file`` *(Address)* - the specific file to write to.
3. ``data`` *(Object)* - the data to store in the vault

-------
Returns
-------

``Promise`` - A promise to write the data to the file.  Must reject with a VaultError object if unsuccessful.

-----------------------------------------------------------------------------

append
======

Must unconditionally append the given data to the given file in the vault identified by the given contract address, creating the file if it does not exist.  Will fail if the vault does not exist.

.. code-block:: javascript

    append(contract, file, data);

----------
Parameters
----------

1. ``contract`` *(Address)* - the address of the contract to identify the vault.
2. ``file`` *(Address)* - the specific file to write to.
3. ``data`` *(Object)* - the data to append to the file

-------
Returns
-------

``Promise`` - A promise to append the data to the file.  Must reject with a VaultError object if unsuccessful.

-----------------------------------------------------------------------------

read
====

Must unconditionally return the data from the given file in the vault identified by the given contract address.  Will fail if the vault or file does not exist.

.. code-block:: javascript

    read(contract, file);

----------
Parameters
----------

1. ``contract`` *(Address)* - the address of the contract to identify the vault.
2. ``file`` *(Address)* - the specific file to write to.

-------
Returns
-------

``Promise`` - A promise to resolve the vault contents in the same form given when the file was written.  Must reject with a VaultError object if unsuccessful.

-----------------------------------------------------------------------------

readDir
=======

Must promise to unconditionally return a list of the names of files in the given directory within the vault identified by the given contract address.  Will fail if the vault does not exist.

.. code-block:: javascript

    read(contract, file);

----------
Parameters
----------

1. ``contract`` *(Address)* - the address of the contract to identify the vault.
2. ``file`` *(Address)* - the specific file to write to.

------
Throws
------

``VaultError`` - if the vault does not exist.

-------
Returns
-------

``Promise`` - A promise to resolve the directory listing in the format ``[<filename1>][\n<filename2>]...``   Equivalent to ``ls -c1`` in linux.  If the directory does not exist then then the empty string is resolved. Must reject with a VaultError object if unsuccessful.

-----------------------------------------------------------------------------

delete
======

Must promise to unconditionally delete the vault identified by the given contract address, including all files within.  Will fail if the vault does not exist.

.. code-block:: javascript

    deleteVault(contract);

----------
Parameters
----------

1. ``contract`` *(Address)* - the address of the contract to identify the vault.

-------
Returns
-------

``Promise`` - A promise to delete the vault and all data within it.  Must reject with a VaultError object if unsuccessful.
