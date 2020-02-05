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
   * @param {address} contract of the contract that controls the vault
   * @param {data} the data to store in the vault
   * @returns {Promise} A promise to create the vault.
   */
  createVault(contract, data) {
    if (this.vaults[contract] != undefined) {
      throw new datona.errors.VaultError("attempt to create a vault that already exists: " + contract);
    }
    this.vaults[contract] = data;
  }

  /**
   * Updates the vault controlled by the given contract, overwriting it with the
   * given data.
   *
   * @param {address} address of the contract that controls the vault
   * @param {data} the data to store in the vault
   * @returns {Promise} A promise to update the data in the vault.
   */
  updateVault(contract, data) {
    if (this.vaults[contract] == undefined) {
      throw new datona.errors.VaultError("attempt to update a vault that does not exist: " + contract);
    }
    this.vaults[contract] = data;
  };

  /**
   * Obtains the data from the vault controlled by the given contract.
   *
   * @param {address} address of the contract that controls the vault
   * @returns {Promise} A promise to return the data within the vault.
   */
  accessVault(contract) {
    if (this.vaults[contract] == undefined) {
      throw new datona.errors.VaultError("attempt to access a vault that does not exist: " + contract);
    }
    return this.vaults[contract];
  };

  /**
   * Deletes the vault controlled by the given contract.
   *
   * @param {address} contract address of the contract that controls the vault
   * @returns {Promise} A promise to delete the vault.
   */
  deleteVault(contract) {
    if (this.vaults[contract] == undefined) {
      throw new datona.errors.VaultError("attempt to delete a vault that does not exist: " + contract);
    }
    this.vaults[contract] = undefined;
  };

}


module.exports = {
  RamBasedVaultDataServer: RamBasedVaultDataServer
}
