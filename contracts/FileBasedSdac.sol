pragma solidity ^0.6.3;
pragma experimental ABIEncoderV2;

/*
 * Example of a basic Smart Information Contract
 */

abstract contract SDAC {

    string public constant sdacProtocolVersion = "0.2";

    // retained for backward compatibility. Basic vault-wide read permission. Assumes the data vault has validated the requester's ID
    function isPermitted( address requester ) virtual public view returns (bool);

    // file based permissions. Assumes the data vault has validated the requester's ID. File address(0) is a special file representing the vault's root
    function getPermissions( address requester, address file ) virtual public view returns (byte);

    // returns true if the contract has expired either automatically or manually
    function hasExpired() virtual public view returns (bool);

    // terminates the contract if the sender is permitted and any termination conditions are met
    function terminate() virtual public;

}


/*
 * Basic file based SDAC that allows a vault server to manage multiple files and directories within a vault.
 * Each file or directory has its own unix-like user/group/others permissions of the form rwa (read, write, append).
 *
 * Groups and files are set on construction and remain static throughout the life of the contract. File owner, group and
 * permissions are also set on constrution but can be modified later. As with unix file systems only the file's owner
 * can modify its group and permissions. Unlike unix systems there is no admin, root or sudo group.
 *
 * TODO: should the file owner be allowed to give away ownership to another user? In unix systems this is usually restricted
 * since there is no history of ownership kept. This could allow someone to store illegal or compromising data as though it
 * was stored by someone else. The contract could store a history though.  Needs thought.
 *
 * The getPermissions method is designed to be used by vault servers to obtain the rwa permissions and directory flag for
 * a file.
 *
 * The S-DAC does not support file names. Each file and directory is uniquely identified by an address. A file's address
 * is at the discretion of the user.
 *
 * The distinction between files and directories, in this context, is in how the vault server responds to an access request.
 * For files the response will contain the data within the file, if the requester is permitted to access it. For directories
 * it will contain a list of filenames, each of which inherits their permissions from the parent directory and must be accessed
 * with separate requests.
 */


struct FilePermissions {
    address user;
    address group;
    bytes2 permissions;
}

struct File {
    address file;
    FilePermissions permissions;
}

struct Group {
    address id;
    address[] users;
}


abstract contract FileBasedSdac is SDAC {

    byte public constant DIRECTORY_MASK = 0x80;
    byte public constant READ_MASK = 0x04;
    byte public constant WRITE_MASK = 0x02;
    byte public constant APPEND_MASK = 0x01;

    mapping (address => FilePermissions) internal files;
    mapping (address => mapping(address => bool)) internal groups;

    // Internal permissions bitmap
    uint8 internal constant PERMISSIONS_USER_BIT = 6;
    uint8 internal constant PERMISSIONS_GROUP_BIT = 3;
    uint8 internal constant PERMISSIONS_OTHERS_BIT = 0;
    byte internal constant PERMISSIONS_MASK = 0x07;
    bytes2 internal constant PERMISSIONS_DIRECTORY_MASK = 0x0200;
    bytes2 internal constant PERMISSIONS_USER_WRITE_MASK = 0x0080;


    constructor(Group[] memory _groups, File[] memory _files) public {
        for (uint i=0; i<_groups.length; i++) {
            address[] memory gUsers = _groups[i].users;
            for (uint j=0; j<gUsers.length; j++) {
                groups[_groups[i].id][gUsers[j]] = true;
            }
        }
        for (uint i=0; i<_files.length; i++) {
            files[_files[i].file] = _files[i].permissions;
        }
    }


    // basic vault-wide read permission.  Assumes the data vault has validated the requester's ID
    function isPermitted( address requester ) public view override returns (bool) {
        return canRead(requester, address(0));
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
        byte directoryFlag = files[file].permissions & PERMISSIONS_DIRECTORY_MASK > 0 ? DIRECTORY_MASK : byte(0);
        if (fileOwner == address(0)) {
            return 0x00;
        }
        else if (requester == fileOwner) {
            return (byte)(files[file].permissions >> PERMISSIONS_USER_BIT) & PERMISSIONS_MASK | directoryFlag;
        }
        else if (groups[fileGroup][requester]) {
            return (byte)(files[file].permissions >> PERMISSIONS_GROUP_BIT) & PERMISSIONS_MASK | directoryFlag;
        }
        else {
            return (byte)(files[file].permissions >> PERMISSIONS_OTHERS_BIT) & PERMISSIONS_MASK | directoryFlag;
        }
    }


    // Returns true if the file exists and is a directory
    function isDirectory( address file ) public view returns (bool) {
        return files[file].permissions & PERMISSIONS_DIRECTORY_MASK > 0;
    }


    // file based read permission.  Assumes the data vault has validated the requester's ID
    function canRead( address requester, address file ) public view returns (bool) {
        return (getPermissions(requester, file) & READ_MASK) > 0;
    }


    // file based write permission.  Assumes the data vault has validated the requester's ID
    function canWrite( address requester, address file ) public view returns (bool) {
        return (getPermissions(requester, file) & WRITE_MASK) > 0;
    }


    // file based append permission.  Assumes the data vault has validated the requester's ID
    function canAppend( address requester, address file ) public view returns (bool) {
        return (getPermissions(requester, file) & APPEND_MASK) > 0;
    }


    // change a file's permissions
    function chmod(address file, bytes2 permissions) public {
        require( files[file].user == msg.sender, 'Operation not permitted' );
        require( (files[file].permissions & PERMISSIONS_USER_WRITE_MASK) > 0, 'Operation not permitted' );
        files[file].permissions = permissions;
    }


    // change a file's owner
    //
    // TODO: should the file owner be allowed to give away ownership to another user? In unix systems this is usually restricted
    // since there is no history of ownership kept. This could allow someone to store illegal or compromising data as though it
    // was stored by someone else. The contract could store a history though.  Needs thought.
    //
    function chown(address file, address user) public {
        require( files[file].user == msg.sender, 'Operation not permitted' );
        require( (files[file].permissions & PERMISSIONS_USER_WRITE_MASK) > 0, 'Operation not permitted' );
        files[file].user = user;
    }


    // change a file's owner and group
    function chown(address file, address user, address group) public {
        require( files[file].user == msg.sender, 'Operation not permitted' );
        require( (files[file].permissions & PERMISSIONS_USER_WRITE_MASK) > 0, 'Operation not permitted' );
        files[file].user = user;
        files[file].group = group;
    }


    // change a file's group
    function chgrp(address file, address group) public {
        require( files[file].user == msg.sender, 'Operation not permitted' );
        require( (files[file].permissions & PERMISSIONS_USER_WRITE_MASK) > 0, 'Operation not permitted' );
        files[file].group = group;
    }

}
