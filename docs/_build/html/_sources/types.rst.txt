##########
Core Types
##########

.. _Types:

.. list-table::
  :widths: auto
  :header-rows: 1

  * - Type
    - Definition
  * - *Address*
    - Blockchain address in the format ``/^0x[0-9a-fA-F]{40}$/``
  * - *DatonaSignature*
    - ECDSA secp256k1 signature - 130 hex-character string representing 64 byte signature (s) concatenated with 1 byte recovery (r) in that order
  * - *Hash*
    - keccak256 hash in the format ``/^[0-9a-fA-F]{64}$/``
  * - *PrivateKey*
    - Private key in the format ``/^[0-9a-fA-F]{64}$/``
  * - *PublicKey*
    - Public key in the format ``/^[0-9a-fA-F]{130}$/``
  * - *URL*
    - Server URL of the form: ``{ scheme: String, host: String, port: Number }``
  * - *VaultFile*
    - Name of a file or directory in a vault.  See VaultFile_ below.


.. _VaultFilename:

VaultFile
=========

A VaultFile name has the form ``[directory/]<file>``

If the directory part is present it must be a single blockchain address and the file part can be any POSIX file name except ``.`` and ``..``
If not present then the file part must be a single blockchain address.
Nested directories are not permitted.

Example valid files:

  * ``0x0000000000000000000000000000000000000001``
  * ``0x0000000000000000000000000000000000000002/my_file.txt``
  * ``0x0000000000000000000000000000000000000002/0x0000000000000000000000000000000000000001``

Example invalid files:

  * ``my_file.txt``
  * ``0x0000000000000000000000000000000000000002/0x0000000000000000000000000000000000000001/my_file.txt``

------------------------------------------------------------------------------

.. _ApplicationLayerProtocol:

##########################
Application Layer Protocol
##########################

*Version: 0.0.2*

*WARNING - This protocol is experimental and subject to change without notice.  The version will be updated if any change is made.*

This protocol uses `Semantic Versioning <https://semver.org/spec/v2.0.0.html>`_.

.. _SdacInterface:

Smart Data Access Contract Interface
====================================

All S-DACs must comply with the following interface.  In future the protocolVersion may be used to support backward compatibility.

.. code-block:: solidity

    pragma solidity ^0.6.3;

    abstract contract SDAC {

        string public constant DatonaProtocolVersion = "0.0.2";

        // constants describing the permissions-byte structure of the form d----rwa.
        byte public constant NO_PERMISSIONS = 0x00;
        byte public constant ALL_PERMISSIONS = 0x07;
        byte public constant READ_BIT = 0x04;
        byte public constant WRITE_BIT = 0x02;
        byte public constant APPEND_BIT = 0x01;
        byte public constant DIRECTORY_BIT = 0x80;

        address public owner = msg.sender;

        // File based d----rwa permissions.  Assumes the data vault has validated the requester's ID.
        // Address(0) is a special file representing the vault's root
        function getPermissions( address requester, address file ) public virtual view returns (byte);

        // returns true if the contract has expired either automatically or has been manually terminated
        function hasExpired() public virtual view returns (bool);

        // terminates the contract if the sender is permitted and any termination conditions are met
        function terminate() public virtual;

    }


.. _GeneralProtocol:

General Protocol
================

.. _SignedTransaction:

SignedTransaction
-----------------

All Datona transactions are sent as a SignedTransaction, which contains the raw Transaction_ and a digital signature.

.. code-block:: json

  {
    "txn": Transaction,
    "signature": DatonaSignature
  }

*where:*

  * ``signature`` is the DatonaSignature of the keccak256 hash of the ``txn`` element.

------------------------------------------------------------------------------

.. _Transaction:

Transaction
-----------

All transactions in the Datona Protocol have the following JSON structure:

.. code-block:: json

  {
    "txnType": String,
    ...
  }

.. list-table::
  :widths: 20 80
  :header-rows: 1

  * - Field
    - Description
  * - txnType
    - *(String)*.  The name of the transaction type used to identify the type of transaction.

------------------------------------------------------------------------------

.. _GeneralServerResponse:

GeneralServerResponse
---------------------

A basic acknowledgement or error response from a server to a client.

Acknowledgement
~~~~~~~~~~~~~~~

.. code-block:: json

  {
    "txnType": "GeneralResponse",
    "responseType":"success"
  }

.. list-table::
  :widths: 20 80
  :header-rows: 1

  * - Field
    - Description
  * - responseType
    - *(String)*  The type of the response: either “success” or “error”


Error
~~~~~

Error responses contain the fields of a DatonaError.

.. code-block:: json

  {
    "txnType": "GeneralResponse",
    "responseType":"error",
    "error": {
      "name": String,
      "message": String,
      "details": String
    }
  }

.. list-table::
  :widths: 20 80
  :header-rows: 1

  * - Field
    - Description
  * - name
    - *(String)*  Name of error
  * - message
    - *(String)*  Natural language error message
  * - details
    - *(String)*  Detailed error message, usually not suitable for displaying to the average user.  Possibly empty.


------------------------------------------------------------------------------

.. _SmartDataAccessRequestProtocol:

Smart Data Access Request Protocol
==================================

A SmartDataAccessRequest is sent from a requester to a data owner, to request data to be shared in a vault controlled by a Smart Data Access Contract.  The data owner can respond with a SmartDataAccessResponse accepting or rejecting the request.

The format of the response is specific to the requester’s use case.  Therefore, the SmartDataAccessRequest contains user defined acceptTransaction and rejectTransaction elements that the requester is free to tailor as needed.

If accepting the request, the owner’s application software is required to construct a SmartDataAccessResponse using the template given in the acceptTransaction element and extend it with (a) the url of the data vault server holding the data, and (b) the blockchain address of the deployed S-DAC.

If rejecting the request, the owner’s application software is required to construct a SmartDataAccessResponse using the template given in the rejectTransaction and extend it with the reason for the rejection.

.. _SmartDataAccessRequestPacket:

SmartDataAccessRequestPacket
----------------------------

The following JSON gives the minimal template spec for a Smart Data Access request from Requester to Owner.

.. code-block:: json

  {
    "txnType": "SmartDataAccessRequest",
    "version": "0.0.1",
    "contract": {
      "hash": Hash
    },
    "api": {
      "url": {
        "scheme": String,
        "host": String,
        "port": uint
      },
      "acceptTransaction": {},
      "rejectTransaction": {}
    }
  }

.. list-table::
  :widths: 20 80
  :header-rows: 1

  * - Field
    - Description
  * - version
    - *(String)*  The version of the Smart Data Access Request protocol with which this request is compliant.
  * - contract
    - *(Object)*  The requested S-DAC and associated details
  * - contract.hash
    - *(Hash)*  keccak256 hash of the requested S-DAC’s runtime bytecode
  * - api
    - *(Object)*.  Details of how the owner-end software should respond to the request.
  * - api.url
    - *(URL)*  URL of the Requester’s server that will handle the response.  See Type Definitions.
  * - api.acceptTransaction
    - *(Object)*  Template for the transaction that will be returned to the requester if the request is accepted.  Requester specific - for example can be configured to include an internal reference number.

      Shall be extended with the following fields:

      * *contract*: *Address* of the S-DAC deployed on the blockchain, staring with ``0x``

      * *vaultUrl*: *URL* of the vault service that is hosting the data, in the same format as *api.url* defined above.
  * - api.rejectTransaction
    - *(Object)*  Template for the transaction that will be returned to the requester if the request is rejected.  Will be extended with the following fields:

      * *reason*: ``String`` message containing the reason for the rejection


------------------------------------------------------------------------------

.. _SmartDataAccessResponse:

SmartDataAccessResponse
-----------------------

An accept response consists of copying the acceptTransaction object from the SmartDataAccessRequestPacket and adding the following elements:

.. code-block:: json

  {
    "txnType": "SmartDataAccessResponse",
    "responseType": "accept",
    "contract": Address,
    "vaultAddress": Address,
    "vaultUrl": {
      "scheme": String,
      "host": String,
      "port": uint
    }
    ... elements copied from the acceptTransaction object (if any)
  }


.. list-table::
  :widths: 20 80
  :header-rows: 1

  * - Field
    - Description
  * - contract
    - *(Address)*  Blockchain address of the deployed S-DAC
  * - vaultAddress
    - *(Address)*  Public address of the vault server (used to authenticate all comms with the server)
  * - vaultUrl
    - *(URL)*  URL of the Requester’s server that will handle the response.


A reject response consists of copying the rejectTransaction object from the SmartDataAccessRequestPacket and adding the following elements:

.. code-block:: json

  {
    "txnType": "SmartDataAccessResponse",
    "responseType": "reject",
    "reason": String
  }
  ... elements copied from the rejectTransaction object (if any)


------------------------------------------------------------------------------

.. _VaultRequestProtocol:

Vault Request Protocol
======================

VaultRequest packets are sent to a Data Vault Server to create, write, append, read or delete a vault.  The server promises to respond to any request with a VaultResponse packet indicating success or error.  The protocol consists of a single request and response.

.. _VaultRequest:

VaultRequest
------------

One of the following JSON requests:

create
~~~~~~

.. code-block:: json

  {
    "txnType": "VaultRequest",
    "requestType": "create",
    "contract": Address,
  }

write
~~~~~~

.. code-block:: json

  {
    "txnType": "VaultRequest",
    "requestType": "write",
    "contract": Address,
    "data": Object
  }

append
~~~~~~

.. code-block:: json

  {
    "txnType": "VaultRequest",
    "requestType": "append",
    "contract": Address,
    "data": Object
  }

read
~~~~~~

.. code-block:: json

  {
    "txnType": "VaultRequest",
    "requestType": "read",
    "contract": Address
  }

delete
~~~~~~

.. code-block:: json

  {
    "txnType": "VaultRequest",
    "requestType": "delete",
    "contract": Address
  }


.. list-table::
  :widths: 20 80
  :header-rows: 1

  * - Field
    - Description
  * - type
    - *(String)*  The type of request: either “create”, “write”, "append", “read” or “delete”
  * - contract
    - *(Address)*  The blockchain address of the Smart Data Access Contract that controls the vault.  The S-DAC must already be deployed on the blockchain.
  * - data
    - Any type.  The data to store in the vault or retrieved from the vault

------------------------------------------------------------------------------

.. _VaultResponse:

VaultResponse
-------------

Every Vault Request from the client is responded to with a Vault Response.  There are two types of response - success and error.

success
~~~~~~~

A success response conforms with the GeneralServerResponse_ Acknowledgement format.  If responding to a read request, the response will additionally contain a ``data`` field with returned vault contents.

.. code-block:: json

  {
    "txnType": "VaultResponse",
    "responseType":"success",
    "data": Object
  }

error
~~~~~

An error response conforms with the GeneralServerResponse_ Error format.

.. code-block:: json

  {
    "txnType": "VaultResponse",
    "responseType":"error",
    "error": {
      "name": String,
      "message": String,
      "details": String
    }
  }
