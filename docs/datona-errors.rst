##################
Errors
##################

.. _DatonaError:

****************************
Class DatonaError
****************************

Root class for all errors thrown by Datona software.  Extends ``Error``.

Properties
==========

* ``name`` *(String)* - the name of the error.  Same as the class name.
* ``message`` *(String)* - single line error message suitable for display to the end user
* ``details`` *(String)* - (Optional) detailed error message unsuitable for display to the end user

Constructor
===========

Creates a new RemoteVault instance with a network client suitable for the given url scheme.

.. code-block:: javascript

    new DatonaError(message, details);

----------
Parameters
----------

1. ``message`` *(String)* - single line error message suitable for display to the end user
2. ``details`` *(String)* - (Optional) detailed error message unsuitable for display to the end user

-------
Example
-------

.. code-block:: javascript

  const url = { scheme: "file", host: "datonavault.com", port: "8643" };
  const myContractAddress = "0x008Cd346b65F5aFa306Ef9160a84455D308e6851";
  const remoteAddress = "0x41A60F71063CD7c9e5247d3E7d551f91f94b5C3b";
  const remoteVault = new RemoteVault(url, myContractAddress, myKey, remoteAddress);

-----------------------------------------------------------------------------

toJSON
======

Converts this error into a JSON formatted string, excluding the stacktrace.

.. code-block:: javascript

    toJSON();

-------
Returns
-------

``String`` - A JSON formatted string representation of this error with name, message and details.

-----------------------------------------------------------------------------


toObject
========

Converts this error into a simple struct with just name, message and details, excluding the stacktrace.

.. code-block:: javascript

    toObject();

-------
Returns
-------

``{ name: String, message: String, details: String }``

-----------------------------------------------------------------------------


toString
========

Converts this error into a single line string suitable for logging, excluding the stacktrace.  If the error details property is longer than 96 chars then it will be truncated.

.. code-block:: javascript

    toString();

-------
Returns
-------

``String`` - String version of this object

-----------------------------------------------------------------------------

**********************
Classes of DatonaError
**********************

All error classes listed below are derived from `DatonaError`_ and have the same constructor parameters.  Each class may have its own subclass allowing catch blocks to switch based on error class.


Internal Errors
===============

``InternalError`` Class of exception for defensive programming checks. These errors are not expected to be raised and indicate a low-level software problem that needs raising with the software developer.


Developer Errors
================

``DeveloperError``.  Class of exception for software usage errors. These errors indicate a problem with how the developer is interfacing with or using this software.

*Subclasses*

``ArgumentError`` The caller of this method passed an invalid or missing argument

``TypeError`` The caller of this method passed an argument with an invalid type

``InvalidHashError`` The caller of this method passed an invalid hash


Cryptographic Errors
====================

``CryptographicError`` Class of cryptographic errors

*Subclasses*

``InvalidSignatureError`` The caller of this method passed an invalid hash

``HashingError`` The data could not be hashed


Blockchain Errors
=================

``BlockchainError`` Class of errors related to blockchain access and contract management

*Subclasses*

``ContractOwnerError`` This request must be made by the contract owner

``ContractTypeError`` Indicates the contract class is invalid

``ContractExpiryError`` This request must be made by the contract owner

``PermissionError`` Indicates the signatory does not have permission to perform this action


Transaction Errors
==================

``TransactionError`` Class of errors related to a communications transaction

*Subclasses*

``InvalidTransactionError`` Indicates the transaction type is invalid

``MalformedTransactionError`` Indicates the transaction has an invalid form

``RequestError`` Indicates the transaction contains an invalid request

``CommunicationError`` Class of errors related to a communications transaction


Vault Errors
============

``VaultError`` Class of errors related to vault management and guardianship

*Subclasses*

``FileSystemError`` Error resulting from filesystem access
