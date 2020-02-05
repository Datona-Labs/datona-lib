.. _datona-comms:

############
datona-comms
############

The ``datona-comms`` component implements the Datona application layer protocol, providing classes and functions to facilitate communication between two datona enabled software applications.

.. _SmartDataAccessRequest:

****************************
Class SmartDataAccessRequest
****************************

Encapsulates a Smart Data Access request from a Requester to an Owner.  This class validates the request and allows the user to accept or reject the request.  If accept or reject is called, this class connects to the Requester's remote server to send the response.

Properties
==========

* ``data`` *(Object)* - the transaction data object decoded from the signed transaction given to the constructor
* ``remoteAddress`` *(Address)* - the public blockchain address of the remote server, as decoded from the signed transaction given to the constructor

Constructor
===========

Decodes and validates a raw request transaction from a requester, creating a new SmartDataAccessRequest instance.

.. code-block:: javascript

    new SmartDataAccessRequest(signedTxnStr, localPrivateKey);

----------
Parameters
----------

1. ``signedTxnStr`` *(String)* - The raw, signed request from the Requester
2. ``localPrivateKey`` *(Key)* - The Key object used to sign any transaction responses

------
Throws
------

* ``TransactionError`` - if the general transaction structure or signature is invalid
* ``RequestError`` - if the transaction is not a :ref:`SmartDataAccessRequestPacket` type or does not have the necessary request data

-------
Example
-------

.. code-block:: javascript

  const request = new SmartDataAccessRequest(rawTxn, myKey);


-----------------------------------------------------------------------------

accept
======

Sends a :ref:`SmartDataAccessResponse` to the requester, giving the blockchain address of the SDAC and the URL of the vault that contains the data.  Before responding to the requester it is expected that the contract is already deployed on the blockchain and a vault has already been created with the shared data.

.. code-block:: javascript

    accept(contractAddress, vaultUrl);

----------
Parameters
----------

1. ``contractAddress`` *(Address)* - The blockchain address of the deployed SDAC
2. ``vaultUrl`` *(URL)* - The URL of the vault holding the data

-------
Returns
-------

``Promise`` - a promise to return the remote server response.

Resolves With
~~~~~~~~~~~~~

``{ txn: Object, signatory: Address }`` - the server response transaction and signatory's address, validated to confirm it was sent by the requester (i.e. the same signatory as the original request).

Rejects With
~~~~~~~~~~~~

* ``CommunicationError`` - if communication with the requester's server failed
* ``TransactionError`` - if the structure of the server response was invalid or was not signed by the requester.
* ``InvalidTransactionError`` - if the server response is not a valid :ref:`GeneralServerResponse`.

-------
Example
-------

.. code-block:: javascript

  const request = new SmartDataAccessRequest(rawTxn, myKey);
  const vaultUrl = { scheme: "file", host: "datonavault.com", port: "8643" };

  // Read contract bytecode and ABI from file system and create a Contract object
  const contractSourceCode = require("./contracts/" + request.contract.hash);
  const contract = new datona.blockchain.Contract(contractSourceCode.abi);

  // Function to create a new vault and store the data.  Returns a Promise.
  function createAndDeployVault(){
    const vault = new datona.vault.RemoteVault( vaultUrl, contract.address, myPrivateKey );
    return vault.create("Hello World!");
  }

  // Function to send the contract address and vault URL to the requester.  Returns a Promise.
  function informRequester(){
    return request.accept(contract.address, vaultUrl);
  }

  return contract.deploy(contractSourceCode.bytecode, request.signatory)
    .then( createAndDeployVault })
    .then( informRequester )
    .then( console.log )
    .catch( console.error );


-----------------------------------------------------------------------------

reject
======

Sends a :ref:`SmartDataAccessResponse` to the requester rejecting the request.  This is not strictly necessary since the requester cannot rely on receiving a response.  However, it is polite!

.. code-block:: javascript

    reject([reason]);

----------
Parameters
----------

1. ``reason`` *(String)* - *(Optional)* the reason for rejecting the request

-------
Returns
-------

``Promise`` - a promise to return the remote server response.

Resolves With
~~~~~~~~~~~~~

``{ txn: Object, signatory: Address }`` - the server response transaction and signatory's address, validated to confirm it was sent by the requester (i.e. the same signatory as the original request).

Rejects With
~~~~~~~~~~~~

* ``CommunicationError`` - if communication with the requester's server failed
* ``TransactionError`` - if the structure of the server response was invalid or was not signed by the requester.
* ``InvalidTransactionError`` - if the server response is not a valid :ref:`GeneralServerResponse`.

-------
Example
-------

.. code-block:: javascript

  const request = new SmartDataAccessRequest(rawTxn, myKey);
  request.reject("you are sharing my data with mail spammers")
    .then(console.log)
    .catch(console.error);


------------------------------------------------------------------------------

.. _DatonaConnector:

*********************
Class DatonaConnector
*********************

Enables communications with a remote server abstracting away the underlying network protocols.  Currently, only the *file* schema (plain tcp connection) is supported.  Other protocols, such as http, will be supported in the future.

Designed to be used as a superclass, this class is extended by the SmartDataAccessRequest_ and :ref:`RemoteVault` classes.

Properties
==========

* ``remoteAddress`` *(Address)* - the public blockchain address of the remote server, as given to the constructor

Constructor
===========

Creates a new DatonaConnector instance with a network client suitable for the given url scheme.

.. code-block:: javascript

    new DatonaConnector(url, localPrivateKey, remoteAddress);

----------
Parameters
----------

1. ``url`` *(URL)* - the URL object identifying the server, port and URI scheme
2. ``localPrivateKey`` *(Key)* - The Key object used to sign any transactions
3. ``remoteAddress`` - the public blockchain address of the remote application.  Used for verifying received responses.

------
Throws
------

* ``RequestError`` - if the url scheme is unsupported

-------
Example
-------

.. code-block:: javascript

  const url = { scheme: "file", host: "datonavault.com", port: "8643" };
  const remoteAddress = "0x41A60F71063CD7c9e5247d3E7d551f91f94b5C3b";
  const remoteServer = new DatonaConnector( url, myKey, remoteAddress);

------------------------------------------------------------------------------

send
====

Serialises the given object, signs it and returns a promise to send it to the requester.

.. code-block:: javascript

    send(txn);

----------
Parameters
----------

1. ``txn`` *(Object)* - the transaction to sign and send

-------
Returns
-------

``Promise`` - a promise to return the remote server response.

Resolves With
~~~~~~~~~~~~~

``{ txn: Object, signatory: Address }`` - the server response transaction and signatory's address, validated to confirm it was sent by the ``remoteAddress`` given in the constructor.

Rejects With
~~~~~~~~~~~~

* ``CommunicationError`` - if communication with the requester's server failed
* ``TransactionError`` - if the structure of the server response was invalid or was not signed by the requester.

-------
Example
-------

.. code-block:: javascript

  const txn = { txnType: "VaultRequest", requestType: "access", contract: myContractAddress };

  remoteServer.send(txn)
    .then( console.log )
    .catch( console.error );

------------------------------------------------------------------------------

*********
Functions
*********

encodeTransaction
=================

Signs the given transaction object and encodes it ready for transmission.

.. code-block:: javascript

    encodeTransaction(txn, key);

----------
Parameters
----------

1. ``txn`` *(Object)* - The transaction to encode and sign
2. ``key`` *(Key)* - The key used to sign the transaction

-------
Returns
-------

``String`` - a :ref:`SignedTransaction` object as a JSON formatted string

-------
Example
-------

.. code-block:: javascript

  const myKey = new datona.crypto.Key("b94452c533536500e30f2253c96d123133ca1cbdb987556c2dc229573a2cd53c");

  const txn = { txnType: "GeneralResponse", responseType: "success" };

  const signedTxnStr = encodeTransaction(txn, myKey);


------------------------------------------------------------------------------

decodeTransaction
=================

Decodes the given transaction object and returns the data payload.

.. code-block:: javascript

    decodeTransaction(signedTxnStr);

----------
Parameters
----------

1. ``signedTxnStr`` *(String)* - The JSON formatted :ref:`SignedTransaction`

-------
Returns
-------

``Object`` - object containing the transaction and the signatory's address

.. code-block:: javascript

    {
      txn: Object,
      signatory: Address
    }

-------
Throws
-------

``TransactionError`` - if the transaction data or signature is invalid

-------
Example
-------

.. code-block:: javascript

  try {
    const txn = decodeTransaction(signedTxnStr);
    console.log("transaction type: "+txn.txn.txnType);
    console.log("signatory: "+txn.signatory);
  }
  catch (error) {
    console.error(error.toString());
  }


------------------------------------------------------------------------------

validateResponse
================

Validates the a pre-decoded response transaction against the :ref:`GeneralServerResponse` format.  If the response is valid and the response type

.. code-block:: javascript

    validateResponse(txn, [expectedTxnType]);

----------
Parameters
----------

1. ``txn`` *(Object)* - the transaction to validate
2. ``expectedTxnType`` *(String)* - (optional) the expected txnType of the response to override the default of *GeneralResponse*

-------
Throws
-------

``InvalidTransactionError`` - if the transaction structure is invalid or the txnType does not match the expectedTxnType.

-------
Example
-------

.. code-block:: javascript

  try {
    validateResponse(myTransaction, "VaultResponse");
    // no error was thrown so must be a valid VaultResponse
  }
  catch (error) {
    console.error(error.toString());
  }


------------------------------------------------------------------------------

createSuccessResponse
=====================

Constructs a :ref:`GeneralServerResponse` Success transaction, optionally of the given type.

.. code-block:: javascript

    createSuccessResponse([txnType]);

----------
Parameters
----------

1. ``txnType`` *(String)* - (optional) txnType to override default of *GeneralResponse*

----------
Returns
----------

``Object`` - (optional) txnType the :ref:`GeneralServerResponse` transaction

-------
Example
-------

.. code-block:: javascript

  const response = createSuccessResponse();
  const sdarResponse = createSuccessResponse("SmartDataAccessResponse");

------------------------------------------------------------------------------

createErrorResponse
===================

Constructs a :ref:`GeneralServerResponse` Error transaction, optionally of the given type.

.. code-block:: javascript

    createErrorResponse(error, [txnType]);

----------
Parameters
----------

1. ``error`` *(Error)* - the error to insert in the transaction
2. ``txnType`` *(String)* - (optional) txnType to override default of *GeneralResponse*

----------
Returns
----------

``Object`` - (optional) txnType the :ref:`GeneralServerResponse` transaction

-------
Example
-------

.. code-block:: javascript

  ...
  catch (error) {
    const response = createErrorResponse(error);
    const signedTxnStr = encodeTransaction(response, myKey);
    ...
  }
