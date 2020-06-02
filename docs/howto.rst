.. _HowToUse:

###################
How To Use
###################

This section describes the use of `datona-lib <https://github.com/Datona-Labs/datona-lib>`_ by the three primary types of developers: Requesters, Owner App Developers and Data Vault Service Providers.

See the :ref:`Smart Data Access Life-Cycle <Lifecycle>` for the overall process.

.. contents::
   :depth: 2
   :local:


**********
Requesters
**********

.. _BuildSDAC:

Building a Smart Data Access Contract
=====================================

All S-DACs must comply with the :ref:`Smart Data Access Contract Interface <SdacInterface>` but the implementation will depend on the use case.  S-DACs can be simple, for example to give indefinite access until terminated; or they can be highly complex giving access to different Requesters depending on a complex workflow supported by external blockchain oracles.

Here is an example of a simple contract that automatically terminates after a given number of days.  It permits access for a single Requester and permits the Owner or Requester to terminate at any time.

.. code-block:: solidity

    pragma solidity ^0.6.3;

    import "SDAC.sol";

    contract Duration_SDAC is SDAC {

        address public permittedRequester;
        uint public contractDuration;
        uint public contractStart;
        bool terminated = false;


        modifier onlyOwnerOrRequester {
            require( msg.sender == owner || msg.sender == permittedRequester );
            _;
        }

        constructor( address _permittedRequester, uint _contractDuration ) public {
            permittedRequester = _permittedRequester;
            contractDuration = _contractDuration;
            contractStart = block.timestamp;
        }

        function getPermissions( address requester, address file ) public view override returns (byte) {
            if ( file == address(0) && !hasExpired() ) {
                if (requester == owner) return NO_PERMISSIONS | READ_BIT | WRITE_BIT | APPEND_BIT;
                if (requester == permittedRequester) return NO_PERMISSIONS | READ_BIT;
            }
            return NO_PERMISSIONS;
        }

        function isPermitted( address requester ) public view returns (bool) {
            return ( getPermissions(requester, address(0)) & READ_BIT ) > 0;
        }

        function hasExpired() public view override returns (bool) {
            return terminated ||
                   (block.timestamp - contractStart) >= (contractDuration * 1 days);
        }

        function terminate() public override onlyOwnerOrRequester {
            terminated = true;
        }

        function getOwner() public view returns (address) {
            return owner;
        }

    }


File Permissions
----------------

:ref:`Protocol v0.0.2<SdacInterface>` introduced file-based read, write and append permissions to S-DACs.  This allows a vault to be split into compartments (files and directories) each having different access permissions for different actors.  This could be used, for example, to allow the Owner's name to be accessible to the Requester while their name and address is accessible to a third-party delivery company.

The S-DAC interface does not support standard file names. Each file and directory is instead uniquely identified by a hash. What hash name is given to each file is at the discretion of the user and should form part of the Smart Data Access Request.

The getPermissions function in the S-DAC is responsible for returning the correct permissions for the requester and file passed as its input parameters.  Permissions are returned as a single byte of the binary form ``d----rwa``, where d is the most significant bit and if set (1) indicates the file is a directory.  The read-bit, write-bit and append-bit will be set (1) if that permission is granted.

*Read* and *write* file permissions behave in the standard way.  The *append* permission allows the user to append data to a file but not to overwrite what has been written before.  This can be useful for log files and audit trails.  The append permission for a directory allows new files to be written to that directory but does not allow existing files to be overwritten.  There is no execute permission since files cannot be executed on a vault server.

The distinction between files and directories is in how the vault server responds to an access request.  For files the response will contain the data within the file, if the requester is permitted to access it. For directories it will contain a list of filenames. The files within a directory inherit their permissions from the parent directory and must be accessed with separate requests.

Here is an example abstract S-DAC that implements UNIX-like user/group/others permissions for individual files.

.. code-block:: solidity

    pragma solidity ^0.6.3;

    import "SDAC.sol";


    /*
     * Abstract file based SDAC that allows a vault server to manage multiple files and directories within a vault.
     * Each file or directory has its own unix-like user/group/others permissions of the form rwa (read, write, append).
     *
     * Groups and files are set on construction and remain static throughout the life of the contract. File owner, group and
     * permissions are also set on construction but can be modified later. As with unix file systems only the file's owner
     * can modify its group and permissions. Unlike unix systems there is no admin, root or sudo group.
     */

    struct FilePermissions {
        address user;
        address group;
        bytes2 permissions;
    }


    abstract contract FileBasedSdac is SDAC {

        mapping (address => FilePermissions) internal files;
        mapping (address => mapping(address => bool)) internal groups;

        // Internal permissions bitmap
        uint8 internal constant INTERNAL_PERMISSIONS_USER_BIT = 6;
        uint8 internal constant INTERNAL_PERMISSIONS_GROUP_BIT = 3;
        uint8 internal constant INTERNAL_PERMISSIONS_OTHERS_BIT = 0;
        bytes2 internal constant INTERNAL_PERMISSIONS_DIRECTORY_MASK = 0x0200;
        bytes2 internal constant INTERNAL_PERMISSIONS_USER_WRITE_MASK = 0x0080;


        // create a new user group
        function addGroup(address id, address[] memory users) internal {
            for (uint i=0; i<users.length; i++) {
                groups[id][users[i]] = true;
            }
        }


        // add a new file with the given permissions.  Permissions are a 2-byte field with the bit form ------dr warw arwa,
        // reflecting unix-like permissions for user, group, other.
        //   e.g. 0x01E0 describes a file (not a directory) with permissions rwar-----
        //   i.e. user (owner) has read, write, append permissions, group has read permissions and others have no permissions.
        function addFile(address id, FilePermissions memory permissions) internal {
            files[id] = permissions;
        }


        // File based permissions returned as a byte with the form d----rwa.
        // Mimics unix file permissions:
        //   - returns the owner permissions if the requester is the owner of the file
        //   - returns the group permissions if the requester is not the owner but belongs to the file's group
        //   - returns the other permissions if the requester is neither the owner nor a group member
        // Deliberately does not throw if a file does not exist, returns 0 instead.
        function getPermissions( address requester, address file ) public view override returns (byte) {
            address fileOwner = files[file].user;
            address fileGroup = files[file].group;
            byte directoryFlag = files[file].permissions & INTERNAL_PERMISSIONS_DIRECTORY_MASK > 0 ? DIRECTORY_BIT : byte(0);
            if ( fileOwner == address(0) || this.hasExpired() ) {
                return NO_PERMISSIONS;
            }
            else if (requester == fileOwner) {
                return (byte)(files[file].permissions >> INTERNAL_PERMISSIONS_USER_BIT) & ALL_PERMISSIONS | directoryFlag;
            }
            else if (groups[fileGroup][requester]) {
                return (byte)(files[file].permissions >> INTERNAL_PERMISSIONS_GROUP_BIT) & ALL_PERMISSIONS | directoryFlag;
            }
            else {
                return (byte)(files[file].permissions >> INTERNAL_PERMISSIONS_OTHERS_BIT) & ALL_PERMISSIONS | directoryFlag;
            }
        }


        // change a file's permissions
        function chmod(address file, bytes2 permissions) public {
            require( files[file].user == msg.sender, 'Operation not permitted' );
            require( (files[file].permissions & INTERNAL_PERMISSIONS_USER_WRITE_MASK) > 0, 'Operation not permitted' );
            files[file].permissions = permissions;
        }


        // change a file's owner
         function chown(address file, address user) public {
            require( files[file].user == msg.sender, 'Operation not permitted' );
            require( (files[file].permissions & INTERNAL_PERMISSIONS_USER_WRITE_MASK) > 0, 'Operation not permitted' );
            files[file].user = user;
        }


        // change a file's owner and group
        function chown(address file, address user, address group) public {
            chown(file, user);
            files[file].group = group;
        }


        // change a file's group
        function chgrp(address file, address group) public {
            require( files[file].user == msg.sender, 'Operation not permitted' );
            require( (files[file].permissions & INTERNAL_PERMISSIONS_USER_WRITE_MASK) > 0, 'Operation not permitted' );
            files[file].group = group;
        }

    }


Building a Smart Data Access Request
====================================

Here is an example :ref:`Smart Data Access Request Packet<SmartDataAccessRequestPacket>` for passing to a data owner.  The *hash* in this request is a hash of the runtime bytecode of the Duration_SDAC above.  The *url* in this request is the URL of the Requester's server that will handle a :ref:`Smart Data Access Response Packet<SmartDataAccessResponse>` from the Owner.

In this case the Requester has added a *customerId* field to the accept and reject transaction templates.  This number will be added to the response that the Owner returns to the Requester.

.. code-block:: json

  {
    "txnType": "SmartDataAccessRequest",
    "version": "0.0.1",
    "contract": {
      "hash": "5573012304cc4d87a7a07253c728e08250db6821a3dfdbbbcac9a24f8cd89ad4",
    },
    "api": {
      "url": {
        "scheme": "file",
        "host": "my.server.io",
        "port": "8601"
      },
      "acceptTransaction": {
        "customerId": "10001"
      },
      "rejectTransaction": {
        "customerId": "10001"
      }
    }
  }



Creating a Server to Handle a Smart Data Access Response
========================================================

If the Owner accepts the Smart Data Access Request then they will inform the Requester of the S-DAC's blockchain address and where the data is being held.  To do this the Requester must run a server to handle the :ref:`Smart Data Access Response Packet<SmartDataAccessResponse>`.

Example of a basic server.  When handling a response the server must perform some validation on the deployed contract.  As a minimum it must check that the deployed contract is of the expected type by checking its runtime bytecode.  In this example it also checks that the signatory of the response is the owner of the contract.

.. code-block:: javascript

  const datona = require('datona-lib');
  const assert = datona.assertions;

  //
  // Constants
  //

  const myKey = new datona.crypto.key("e68e40257cfee330038c49637fcffff82fae04b9c563f4ea071c20f2eb55063c");
  const sdacHash = "5573012304cc4d87a7a07253c728e08250db6821a3dfdbbbcac9a24f8cd89ad4";
  const sdacSourceCode = require("./contracts/" + sdacHash + ".json");


  //
  // Server
  //

  var customers = [];

  const myServer = net.createServer(connection);
  myServer.listen(8601);

  connection(c){

    c.on('data', (buffer) => {
      try {
        // Decode the transaction and validate the structure of the response packet.  These will throw if not valid
        const txn = datona.comms.decodeTransaction(data);
        const sdaResponse = txn.txn;
        assert.equals(sdaResponse.txnType, "SmartDataAccessResponse", "SDA Response is invalid: txnType")

        // Handle depending on the response type
        switch (sdaResponse.responseType) {
          case "accept":
            assert.isAddress(sdaResponse.contract, "SDA Response is invalid: contract")
            assert.isAddress(sdaResponse.vaultAddress, "SDA Response is invalid: vaultAddress")
            assert.isUrl(sdaResponse.vaultUrl, "SDA Response is invalid: vaultUrl")

            // Connect to the Owner's S-DAC on the blockchain
            const contract = new datona.blockchain.Contract(sdacSourceCode.abi, sdaResponse.contract);

            // Verify the signatory is the owner of the contract and that the correct contract has been deployed,
            contract.assertOwner(txn.signatory)
              .then( () => { contract.assertBytecode(sdacSourceCode.runtimeBytecode) })
              .then( () => {
                // Contract is valid so record the new customer and return a success response
                customers.push(txn.data);
                sendResponse(datona.comms.createSuccessResponse());
              })
              .catch( (error) => {
                sendResponse(datona.comms.createErrorResponse(error));
              });
            break;
          case "reject":
            logger.log("Customer reject: "+sdaResponse.reason);
            sendResponse(datona.comms.createSuccessResponse());
            break;
          default:
            throw new datona.errors.TransactionError("Invalid responseType: "+sdaResponse.responseType);
        }
      }
      catch (error) {
        sendResponse(datona.comms.createErrorResponse(error));
      }
    });

  }

  function sendResponse(c, response) {
    c.write(encodeTransaction(response, myKey));
    c.end();
  }


Monitoring For New Contracts
============================

An alternative to using a server to receive Smart Data Access Responses is to monitor the blockchain directly for new vaults that you are permitted to access.  This method will only work if you know the address and url of the vault server used by all customers, or if you require customers to identify the vault service in the contract itself.  The datona-blockchain :ref:`subscribe` function supports the registering of a callback to be called whenever a new contract of a given type (with a given runtime bytecode) is deployed on the blockchain and you are permitted to access the data it controls.

Example:

.. code-block:: javascript

  const myContract = require("../contracts/myContract.json");
  const subscription = subscribe(datona.crypto.hash(myContract.runtimeBytecode), registerNewCustomer, myKey.address);

  function registerNewCustomer(contractAddress) {
    const newCustomer = { contract: contractAddress };
    customers.push(newCustomer);
  }


.. _RequesterAccess:

Accessing a Customer's Data
===========================

To access a data from a customer's vault you will need the contract address, vault URL and vault server's public address from the SmartDataAccessResponse received from the data owner.  The datona-vault :ref:`RemoteVault<RemoteVault>` class is used to access the vault.

.. code-block:: javascript

  const customer = customers[0];
  const remoteVault = new RemoteVault(customer.vaultUrl, customer.contract, myKey, customer.vaultAddress);

  remoteVault.read()
    .then( (data) => { console.log("vault contains: "+data) )
    .catch( console.error );

If the vault contains specific files then they should be read individually:

.. code-block:: javascript

  const customersFolder = "0xF000000000000000000000000000000000000001"

  remoteVault.read(customersFolder)
    .then( (data) => { console.log("folder contains files:\n"+data) )
    .catch( console.error );

  remoteVault.read(customersFolder+"/name")
    .then( (data) => { console.log("Customer name: "+data) )
    .catch( console.error );

  remoteVault.read(customersFolder+"/email")
    .then( (data) => { console.log("Customer email: "+data) )
    .catch( console.error );


********************
Owner App Developers
********************

Receiving a Smart Data Access Request
=====================================

A Smart Data Access Request is passed from Requester to Owner as a :ref:`Signed Transaction<SignedTransaction>`.  Once received, the :ref:`SmartDataAccessRequest<SmartDataAccessRequest>` class is used to decode and validate it.  The app can then display the request to the Owner for acceptance or rejection.

.. code-block:: javascript

  const datona = require('datona-lib');

  const myKey = new datona.crypto.key("b94452c533536500e30f2253c96d123133ca1cbdb987556c2dc229573a2cd53c");

  const request = new datona.comms.SmartDataAccessRequest(signedTxnStr, myKey);


Accepting a Smart Data Access Request
=====================================

The following example demonstrates the use of the :ref:`Contract<Contract>` class to deploy a new S-DAC on the blockchain, and the :ref:`RemoteVault<RemoteVault>` class to create the vault.  It uses the *accept* method of the :ref:`SmartDataAccessRequest<SmartDataAccessRequest>` class to inform the Requester.

.. code-block:: javascript

  const vaultServerAddress = "0x288b32F2653C1d72043d240A7F938a114Ab69584",

  const vaultUrl = {
    scheme: "file",
    host: "datonavault.com",
    port: 8964
  }

  var myDataShares = [];

  //
  // Accept Request
  //

  // Read contract bytecode and ABI from file system and create a Contract object
  const contractSourceCode = require("./contracts/" + request.data.contract.hash);
  const sdac = new datona.blockchain.Contract(contractSourceCode.abi);

  // Function to create a new vault and store the data.  Returns a Promise.
  function createAndDeployVault(){
    const vault = new datona.vault.RemoteVault( vaultUrl, sdac.address, myKey, vaultServerAddress );
    return vault.create()
      .then( vault.write("Hello World!") );
  }

  // Function to send the contract address and vault URL to the requester.  Returns a Promise.
  function recordContractAndInformRequester(){
    myDataShares.push( {
      contract: sdac.address,
      vault: {
        address: vaultServerAddress,
        url: vaultUrl
      }
    });
    return request.accept(sdac.address, vaultServerAddress, vaultUrl);
  }

  // Deploy the contract, create the vault and inform the requester
  sdac.deploy(myKey, contractSourceCode.bytecode, [request.signatory])
    .then( createAndDeployVault )
    .then( recordContractAndInformRequester )
    .catch( console.error );


Accessing a Vault
=================

To access all data in the vault use the datona-vault :ref:`RemoteVault<RemoteVault>` class, in the same way as a Requester :ref:`accesses a customer's data<RequesterAccess>` above.

.. code-block:: javascript

  const dataShare = myDataShares[0];

  const remoteVault = new RemoteVault(dataShare.vault.url, dataShare.contract, myKey, dataShare.vault.address);

  remoteVault.read()
    .then( (data) => { console.log("vault contains: "+data) )
    .catch( console.error );

Reading from a Specific Vault File
----------------------------------

To read the data from a specific file in the vault include the filename as part of the read request.

.. code-block:: javascript

  remoteVault.read("0xF000000000000000000000000000000000000001/name.txt")
    .catch( console.error );

In this case the file is ``name.txt`` and it inherits its permissions from the parent directory ``0xF000000000000000000000000000000000000001``.  The permissions for this directory must be encoded in the contract.

Listing a Directory
-------------------

If the contract supports directories then its possible to list the files held a directory by simply reading it.

.. code-block:: javascript

  remoteVault.read("0xF000000000000000000000000000000000000001")
    .then( console.log );
    .catch( console.error );

If ``0xF000000000000000000000000000000000000001`` is a directory (has the directory bit set in its contract permissions) then the vault server will return a list of names of all the files in the vault directory, separated by newlines.  If the file is not a directory then the contents of the file will be returned.


Writing to a Vault
==================

To write (or overwrite) the data in the vault use the :ref:`RemoteVault<RemoteVault>` class.

.. code-block:: javascript

  const dataShare = myDataShares[0];

  const remoteVault = new RemoteVault(dataShare.vault.url, dataShare.contract, myKey, dataShare.vault.address);

  remoteVault.write("Hi World!")
    .catch( console.error );


Writing to a Specific Vault File
--------------------------------

To write (or overwrite) the data in a file include the filename as part of the write request.

.. code-block:: javascript

  remoteVault.write("Barney Rubble", "0xF000000000000000000000000000000000000001/name.txt")
    .catch( console.error );

In this case the file is ``name.txt`` and it inherits its permissions from the parent directory ``0xF000000000000000000000000000000000000001``.  The permissions for this directory must be encoded in the contract.


Appending to a Specific Vault File
----------------------------------

Appending data to a file is done in the same way as writing but uses the ``append`` method.

.. code-block:: javascript

  const logfile = "0xF000000000000000000000000000000000000002";

  remoteVault.append("\nThu 16 Apr 2020 14:34:47 BST - Name updated", logfile)
    .catch( console.error );


Deleting a Vault
================

To delete the data in the vault simply terminate the contract.  No-one can access the vault once the contract has been terminated, and the data vault server will delete the data when it next checks the contract.  If required the *delete* method of the :ref:`RemoteVault<RemoteVault>` class can be used to force the Data Vault Server to delete the data right away (not shown).

.. code-block:: javascript

  const dataShare = myDataShares[0];

  // Read contract bytecode and ABI from file system and create a Contract object
  const contractSourceCode = require("./contracts/" + dataShare.contract.hash);
  const sdac = new datona.blockchain.Contract(contractSourceCode.abi, dataShare.contract);

  // Terminate contract
  sdac.terminate(myKey)
    .catch( console.error );


***********************
Vault Service Providers
***********************

Creating a Data Vault Server
============================

A Data Vault Server can be a public cloud-based service, a locally hosted server within an organisation or a home-based server.  Whatever the type of server, it must implement the Datona :ref:`Application Layer Protocol <ApplicationLayerProtocol>` and undertake the appropriate permission checks before accepting a create, update, access or delete request.

The Datona Lib :ref:`VaultKeeper<VaultKeeper>` class provides these capabilities leaving the developer to implement the server's data layer.  The VaultKeeper provides the following capabilities:

* decoding and validating incoming :ref:`SignedTransaction` packets and the :ref:`VaultRequest` packet within;
* verifying the appropriate permissions for accepting requests against the S-DAC on the blockchain;
* if permitted, calls a user-defined :ref:`VaultDataServer<VaultDataServer>` instance to handle the request;
* constructing the appropriate success or error :ref:`VaultResponse` packet and encoding it as a :ref:`SignedTransaction`.

.. image:: images/vault_server-class_diagram.png

The diagram above shows the class relationships between the user-defined classes in black and the datona-lib classes in blue.  The user-defined ``DataServer`` class must implement the VaultDataServer interface and promise to handle the 4 types of data request.  All permission checks will have already been performed by the ``VaultKeeper`` so the ``DataServer`` need only perform the requests unconditionally.

Example bare-minimal server and VaultDataServer implementation.  This example is a plain TCP server.  It could instead be written as an HTTP or WebSocket server.

.. code-block:: javascript

  const datona = require("datona-lib");
  const net = require('net');

  const myKey = new datona.crypto.Key("ae139af24306ecac804cfe974398d6d76361287d7b96d9e165d9bcb99a64b6ce");


  //
  // Example Server.  Has no logging or sigterm detection.
  //

  const vaultManager = new RamBasedVaultDataServer();
  const vaultKeeper = new datona.vault.VaultKeeper(vaultManager, myKey);
  const server = net.createServer(connection);

  function connection(c){

    c.on('data', (buffer) => {
      vaultKeeper.handleSignedRequest(buffer.toString())
        .then( (response) => {
          c.write(response);
          c.end();
        })
        .catch( console.error ); // should never happen
    });

  }


  //
  // Example VaultDataServer.  All vaults are held in RAM!
  //

  class RamBasedVaultDataServer extends datona.vault.VaultDataServer {

    constructor() {
      super();
      this.vaults = {};
    }

    create(contract) {
      if (this.vaults[contract] != undefined) {
        throw new datona.errors.VaultError("attempt to create a vault that already exists: " + contract);
      }
    }

    write(contract, file, data) {
      if (this.vaults[contract] == undefined) {
        throw new datona.errors.VaultError("attempt to write to a vault that does not exist: " + contract);
      }
      this.vaults[contract][file] = data;
    };

    append(contract, file, data) {
      if (this.vaults[contract] == undefined) {
        throw new datona.errors.VaultError("attempt to append to a vault that does not exist: " + contract);
      }
      if (this.vaults[contract][file] === undefined) { this.vaults[contract][file] = data; }
      else this.vaults[contract][file] += data;
    };

    read(contract, file) {
      if (this.vaults[contract] == undefined) {
        throw new datona.errors.VaultError("attempt to access a vault that does not exist: " + contract);
      }
      if (this.vaults[contract][file] === undefined) {
        throw new datona.errors.VaultError("attempt to access a file that does not exist: " + contract+"/"+file);
      }
      return this.vaults[contract];
    };

    readDir(contract, dir) {
      if (this.vaults[contract] === undefined) {
        throw new datona.errors.VaultError("attempt to access a vault that does not exist: " + contract);
      }
      var contents = "";
      for (var file in this.vaults[contract]) {
        if (file.substring(0,43) === dir+"/") contents += (contents.length===0) ? file.substring(43) : "\n"+file.substring(43);
      }
      return contents;
    };

    delete(contract) {
      if (this.vaults[contract] == undefined) {
        throw new datona.errors.VaultError("attempt to delete a vault that does not exist: " + contract);
      }
      this.vaults[contract] = undefined;
    };

  }
