"use strict";

/*
 * Datona-lib General types
 *
 * Copyright (C) 2020 Datona Labs
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the GNU Lesser General Public
 * License as published by the Free Software Foundation; either
 * version 3 of the License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
 * Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public License
 * along with this program; if not, write to the Free Software Foundation,
 * Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02110-1301, USA.
 *
 */


/*
 * Constants
 */
const VALID_BLOCKCHAIN_ADDRESS_REGEX = /^0x[0-9a-fA-F]{40}$/;
const VALID_PRIVATE_KEY_REGEX = /^[0-9a-fA-F]{64}$/;
const VALID_HASH_REGEX = /^[0-9a-fA-F]{64}$/;


/*
 * Classes
 */

/*
 * Form for the name of a file within a vault.  File naming convention is as follows:
 *
 *     [directory/]<file>
 *
 * If the directory part is present it must be a single blockchain address and the file part can be any POSIX file name except . and ..
 * If not present then the file part must be a single blockchain address.
 * Nested directories are not permitted.
 *
 * E.g.:
 *    - Valid File:    0x0000000000000000000000000000000000000001
 *    - Valid File:    0x0000000000000000000000000000000000000002/my_file.txt
 *    - Invalid File:  my_file.txt
 *    - Invalid File;  0x0000000000000000000000000000000000000002/0x0000000000000000000000000000000000000001/my_file.txt
 */
class VaultFilename {

  constructor(filenameStr) {
    this.fullFilename = filenameStr;
    if (filenameStr.length <= 42) {
      this.isValid = VALID_BLOCKCHAIN_ADDRESS_REGEX.test(filenameStr);
      this.file = filenameStr;
      this.hasDirectory = false;
    } else {
      this.directory = filenameStr.substring(0, 42);
      this.file = filenameStr.substring(43);
      this.hasDirectory = true;
      this.isValid =
        VALID_BLOCKCHAIN_ADDRESS_REGEX.test(this.directory) &&
        filenameStr[42] === '/' &&                       // valid separator
        /^[^\0\/]*$/.test(this.file) &&                  // POSIX files can be any string but must not contain null or '/'
        this.file.length > 0 &&
        this.file !== "." &&                             // must not be a special file
        this.file !== "..";
    }
  };

}


module.exports = {
  VALID_BLOCKCHAIN_ADDRESS_REGEX: VALID_BLOCKCHAIN_ADDRESS_REGEX,
  VALID_PRIVATE_KEY_REGEX: VALID_PRIVATE_KEY_REGEX,
  VALID_HASH_REGEX: VALID_HASH_REGEX,
  VaultFilename: VaultFilename
};