
.. highlight:: js

.. role:: underline
    :class: underline

#######################################
Welcome to the Datona-Lib documentation
#######################################

Version 0.0.1.

*This is an alpha version designed for experimental use only.*


What is Datona-Lib?
===================

Datona-Lib is an open-source Node.js library that encapsulates the core cryptographic, blockchain, vault and communications features needed to develop on the `datona.io <https://datona.io>`_ platform.  It is available on `github here <https://github.com/Datona-Labs/datona-lib>`_.  It is intended for developers of vault servers, identity apps and requester software, and for those wanting to experiment with :ref:`Smart Data Access <WhatIsSDA>`.

Datona-Lib consists of four components:

* :ref:`datona-crypto` implements the core cryptographic functions such as hashing and digital signatures.
* :ref:`datona-vault` allows developers of owner and requester apps to interface with and manage a remote vault without needing to implement the :ref:`Datona Vault Application-Layer Request Protocol <VaultRequestProtocol>`.  For developers of vault servers it fully encapsulates the :ref:`Vault Keeper function <HowItWorks>`.
* :ref:`datona-comms` implements the Datona :ref:`ApplicationLayerProtocol`.
* :ref:`datona-blockchain` provides the interface to :ref:`Smart Data Access Contracts <WhatIsAnSdac>` on the blockchain.


Contents
========

.. toctree::
   :maxdepth: 2
   :caption: User Documenation

   what.rst
   howto.rst


.. toctree::
   :maxdepth: 2
   :caption: API Specification

   datona-blockchain.rst
   datona-vault.rst
   datona-crypto.rst
   datona-comms.rst
   types.rst
   datona-errors.rst
