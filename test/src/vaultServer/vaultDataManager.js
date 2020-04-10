const datona = require('../../../src/datona');

class RamBasedVaultDataServer extends datona.vault.VaultDataServer {

  /** */
  constructor() {
    super();
    this.vaults = {};
  }

  /**
   * Creates a new vault controlled by the given contract, storing the given
   * data.
   *
   * @param {address} contract address of the contract that controls the vault
   * @param {Object} data the data to store in the vault
   * @returns {Promise} A promise to create the vault.
   */
  create(contract) {
    if (this.vaults[contract] !== undefined) {
      throw new datona.errors.VaultError("attempt to create a vault that already exists: " + contract);
    }
    this.vaults[contract] = {};
  }

  /**
   * Creates or overwrites the given vault file.
   *
   * @param {address} contract address of the contract that controls the vault
   * @param {Object} data the data to store in the vault
   * @returns {Promise} A promise to update the data in the vault.
   */
  write(contract, file, data) {
    if (this.vaults[contract] === undefined) {
      throw new datona.errors.VaultError("attempt to update a vault that does not exist: " + contract);
    }
    this.vaults[contract][file] = data;
  };

  /**
   * Creats or appends the given vault file
   *
   * @param {address} contract address of the contract that controls the vault
   * @param {Object} data the data to store in the vault
   * @returns {Promise} A promise to update the data in the vault.
   */
  append(contract, file, data) {
    if (this.vaults[contract] === undefined) {
      throw new datona.errors.VaultError("attempt to update a vault that does not exist: " + contract);
    }
    if (this.vaults[contract][file] === undefined) { this.vaults[contract][file] = data; }
    else this.vaults[contract][file] += data;
  };

  /**
   * Obtains the data from the vault controlled by the given contract.
   *
   * @param {address} contract address of the contract that controls the vault
   * @returns {Promise} A promise to return the data within the vault.
   */
  read(contract, file) {
    if (this.vaults[contract] === undefined) {
      throw new datona.errors.VaultError("attempt to access a vault that does not exist: " + contract);
    }
    if (this.vaults[contract][file] === undefined) {
      throw new datona.errors.VaultError("attempt to access a file that does not exist: " + contract+"/"+file);
    }
    return this.vaults[contract][file];
  };

  /**
   * Deletes the vault controlled by the given contract.
   *
   * @param {address} contract address of the contract that controls the vault
   * @returns {Promise} A promise to delete the vault.
   */
  delete(contract) {
    if (this.vaults[contract] === undefined) {
      throw new datona.errors.VaultError("attempt to delete a vault that does not exist: " + contract);
    }
    this.vaults[contract] = undefined;
  };

}


module.exports = {
  RamBasedVaultDataServer: RamBasedVaultDataServer
};
