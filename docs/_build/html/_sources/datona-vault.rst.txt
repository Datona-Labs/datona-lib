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

    create(data);

----------
Parameters
----------

1. ``data`` *(Object)* - the data to be stored

-------
Returns
-------

``Promise`` - A promise to store the data in this vault and resolve if successful.  Promises to reject if the vault was not created for any reason.

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

  remoteVault.create("Hello World!")
    .then( () => { console.log("vault created successfully") })
    .catch( console.error );

-----------------------------------------------------------------------------

update
======

Promises to rewrite the data held in this vault.  This method creates the data request, signs it, initiates the vault request and handles the vault response.

.. code-block:: javascript

    update(data);

----------
Parameters
----------

1. ``data`` *(Object)* - the data to be stored

-------
Returns
-------

``Promise`` - A promise to update the data in this vault and resolve if successful.  Promises to reject if the vault was not updated for any reason.

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

  remoteVault.update("Bye World!")
    .then( () => { console.log("vault updated successfully") })
    .catch( console.error );

-----------------------------------------------------------------------------

access
======

Promises to retrieve the data from this vault if permitted.  This method creates the data request, signs it, initiates the vault request and handles the vault response.

.. code-block:: javascript

    access();

-------
Returns
-------

``Promise`` - A promise to retrieve the data and resolve if successful.  Promises to reject if the vault could not be accessed for any reason.

Resolves With
~~~~~~~~~~~~~

``Object`` - the data returned from the vault exactly as it was originally passed to the create_ or update_ method.

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

  remoteVault.access()
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

Handles a valid create request.  This method checks the validity of the signature and validates the request before creating a new vault via the VaultDataServer.

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

updateVault
===========

Handles a valid update request.  This method checks the validity of the signature and validates the request before updating the vault via the VaultDataServer.

.. code-block:: javascript

    updateVault(request, signatory);

----------
Parameters
----------

1. ``request`` *(VaultRequest)* - VaultRequest of type 'update' containing the contract address and data to put in the vault
2. ``signatory`` *(Address)* - signatory the address that signed the request.  Must be the owner of the contract.

-------
Returns
-------

``Promise`` - A promise to update the vault and resolve a success or error response.

Resolves With
~~~~~~~~~~~~~

``SignedTransaction`` - containing the VaultResponse and transaction signature, ready to send back to the client.

Rejects With
~~~~~~~~~~~~

Does not reject.  Any error is converted to signed error VaultResponse and resolved.

An error response will be resolved if:

(a) the request is not a valid "update" request
(b) the signature is invalid;
(c) the signatory is not the owner of the contract
(d) the contract has expired
(e) the VaultDataServer returns an error

-------
Example
-------

.. code-block:: javascript

  const {txn, signatory} = comms.decodeTransaction(signedRequestStr);
  if (txn.requestType == "update") {
    vaultKeeper.updateVault(txn, signatory)
      .then( myServer.sendResponse )
      .catch( console.error );  // should never happen
  }

-----------------------------------------------------------------------------

accessVault
===========

Handles a valid access request.  This method checks the validity of the signature and validates the request before accessing the vault via the VaultDataServer.

.. code-block:: javascript

    accessVault(request, signatory);

----------
Parameters
----------

1. ``request`` *(VaultRequest)* - VaultRequest of type 'access' containing the contract address and data to put in the vault
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
  if (txn.requestType == "access") {
    vaultKeeper.accessVault(txn, signatory)
      .then( myServer.sendResponse )
      .catch( console.error );  // should never happen
  }

-----------------------------------------------------------------------------

deleteVault
===========

Handles a valid delete request.  This method checks the validity of the signature and validates the request before deleting the vault via the VaultDataServer.  The contract must have expired (contract's hasExpired function returns true) before a vault can be deleted.

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
    vaultKeeper.createVault(txn, signatory)
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

createVault
===========

Must promise to create a new vault identified by the given contract address and containing the given data.  Must fail if the vault already exists.

.. code-block:: javascript

    createVault(contract, data);

----------
Parameters
----------

1. ``contract`` *(Address)* - the address of the contract to identify the vault.  Future update, access and delete requests will identify the vault using this contract address.
2. ``data`` *(Object)* - the data to store in the vault

-------
Returns
-------

``Promise`` - A promise to resolve if successful or reject with an Error object if unsuccessful.

-----------------------------------------------------------------------------

updateVault
===========

Must promise to unconditionally update the vault identified by the given contract address, overwriting its contents with the given data.  Will fail if the vault does not exist.

.. code-block:: javascript

    updateVault(contract, data);

----------
Parameters
----------

1. ``contract`` *(Address)* - the address of the contract to identify the vault.
2. ``data`` *(Object)* - the data to store in the vault

-------
Returns
-------

``Promise`` - A promise to resolve if successful or reject with an Error object if unsuccessful.

-----------------------------------------------------------------------------

accessVault
===========

Must promise to unconditionally return the data from the vault identified by the given contract address.  Will fail if the vault does not exist.

.. code-block:: javascript

    accessVault(contract);

----------
Parameters
----------

1. ``contract`` *(Address)* - the address of the contract to identify the vault.

-------
Returns
-------

``Promise`` - A promise to resolve the vault contents in the same form given when the vault was created.  Must reject with an Error object if unsuccessful.

-----------------------------------------------------------------------------

deleteVault
===========

Must promise to unconditionally delete the vault identified by the given contract address, overwriting its contents with the given data.  Will fail if the vault does not exist.

.. code-block:: javascript

    deleteVault(contract);

----------
Parameters
----------

1. ``contract`` *(Address)* - the address of the contract to identify the vault.

-------
Returns
-------

``Promise`` - A promise to resolve if successful or reject with an Error object if unsuccessful.
