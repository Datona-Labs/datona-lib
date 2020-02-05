<p align="center">
<img src="https://datonalabs.org/images/hex.png" width=150 />
</p>

# Datona IO Platform Library (datona-lib)

Core Javascript library for accessing the [Datona IO Platform](https://datona.io).

For more information about the platform see [What Is Smart Data Access](TODO) or download the [white paper](https://datonalabs.org/documents/WhitePaper.pdf).

## Features
- Fully encapsulates the [Datona Application Layer Protocol](TODO);
- Allows [Smart Data Access Contracts](TODO) on the blockchain to be deployed, managed and queried;
- Allows Data Vaults controlled by Smart Data Access Contracts to be created, updated, accessed and deleted on any compliant local or remote Data Vault Server;
- Provides all cryptographic functions needed to use the platform.

## Documentation
Full documentation is available on [ReadTheDocs](TODO).

## Installation

    $ npm install datona-lib

This will install datona-lib and all its dependencies to your local node project.

## Usage

You need to be running a local Ethereum node or have access to a remote node - e.g. [Infura](https://infura.io) to use this library.

```javascript
const datona = require('datona-lib');
```

See the [project documentation](TODO) for usage information.

## Projects utilising datona-lib

- [datona-cli](https://github.com/datona-labs/datona-cli)

If you have a project that you feel could be listed here, please [ask for it](https://github.com/datona-labs/datona-lib/issues/new)!


## Tests

By default, the tests are configured to use a local Ganache instance.  Ganache needs to be running before executing any of these test commands.

    $ npm test

Runs all tests except those few that depend on realtime delays in Ganache.

    $ npm run test-all

Runs all tests.

    $ npm run test-cov

Runs all tests and generates a coverage report.

## Community

- [Discord](https://discord.gg/YVaXcz)
- [Twitter](https://twitter.com/DatonaLabs)

## Copyright

Copyright (c) 2020 [Datona Labs](https://datonalabs.org)

Released under the [GNU Lesser General Public License](LICENSE)
