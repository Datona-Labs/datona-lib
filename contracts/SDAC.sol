pragma solidity ^0.6.3;

/*
 * Smart Data Access Contract
 *
 * All S-DACs must implement this interface
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

abstract contract SDAC {

    string public constant DatonaProtocolVersion = "0.0.2";

    // constants describing the permissions-byte structure of the form d----rwa.
    byte public constant NO_PERMISSIONS = 0x00;
    byte public constant ALL_PERMISSIONS = 0x07;
    byte public constant READ_BIT = 0x04;
    byte public constant WRITE_BIT = 0x02;
    byte public constant APPEND_BIT = 0x01;
    byte public constant DIRECTORY_BIT = 0x80;

    // owner of the contract
    address public owner = msg.sender;

    // File based d----rwa permissions.  Assumes the data vault has validated the requester's ID.
    // Address(0) is a special file representing the vault's root
    function getPermissions( address requester, address file ) public virtual view returns (byte);

    // returns true if the contract has expired either automatically or has been manually terminated
    function hasExpired() public virtual view returns (bool);

    // terminates the contract if the sender is permitted and any termination conditions are met
    function terminate() public virtual;

}

