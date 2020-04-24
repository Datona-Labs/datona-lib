pragma solidity ^0.6.3;

import "SDAC.sol";

contract TestContract is SDAC {

    string public constant version = "0.1.1";

    address public permittedRequester;
    uint public contractDuration;
    uint public contractStart;
    bool terminated = false;


    modifier onlyOwnerOrRequester {
        require( msg.sender == owner || msg.sender == permittedRequester );
        _;
    }


    constructor( address _permittedRequester, uint _contractDuration ) public {
        require(_permittedRequester != address(0), "_permittedRequester cannot be zero");
        permittedRequester = _permittedRequester;
        contractDuration = _contractDuration;
        contractStart = block.timestamp;
    }


    // change ownership to the given address
    function changeOwnership( address to ) public {
        require(msg.sender == owner, "you are not the current owner");
        require(to != address(0), "to cannot be zero");
        owner = to;
    }


    // Permissions are set to support a variety of tests:
    //   - Vault Root: owner:rwa, requester:r
    //   - File 1: owner:wa, requester:r
    //   - File 2: owner:r, requester:w
    //   - File 3: owner:r, requester:a
    //   - File 4: owner:da, requester:dr
    //   - File 5: owner:dr, requester:dwa
    //   - File 6: owner:rwa, requester:-
    function getPermissions( address requester, address file ) public view override returns (byte) {
        if ( file == address(0) && !hasExpired() ) {
            if (requester == owner) return ALL_PERMISSIONS;
            if (requester == permittedRequester) return NO_PERMISSIONS | READ_BIT;
        }
        else if ( file == address(1) && !hasExpired() ) {
            if (requester == owner) return NO_PERMISSIONS | WRITE_BIT | APPEND_BIT;
            if (requester == permittedRequester) return NO_PERMISSIONS | READ_BIT;
        }
        else if ( file == address(2) && !hasExpired() ) {
            if (requester == owner) return NO_PERMISSIONS | READ_BIT;
            if (requester == permittedRequester) return NO_PERMISSIONS | WRITE_BIT;
        }
        else if ( file == address(3) && !hasExpired() ) {
            if (requester == owner) return NO_PERMISSIONS | READ_BIT;
            if (requester == permittedRequester) return NO_PERMISSIONS | APPEND_BIT;
        }
        else if ( file == address(4) && !hasExpired() ) {
            if (requester == owner) return NO_PERMISSIONS | DIRECTORY_BIT | APPEND_BIT;
            if (requester == permittedRequester) return NO_PERMISSIONS | DIRECTORY_BIT | READ_BIT;
        }
        else if ( file == address(5) && !hasExpired() ) {
            if (requester == owner) return NO_PERMISSIONS | DIRECTORY_BIT | READ_BIT;
            if (requester == permittedRequester) return NO_PERMISSIONS | DIRECTORY_BIT | WRITE_BIT | APPEND_BIT;
        }
        else if ( file == address(6) && !hasExpired() ) {
            if (requester == owner) return ALL_PERMISSIONS;
        }
        return NO_PERMISSIONS;
    }


    function isPermitted( address requester ) public view returns (bool) {
        return ( getPermissions(requester, address(0)) & READ_BIT ) > 0;
    }


    // returns true if the contract has expired either automatically or manually
    function hasExpired() public view override returns (bool) {
        return terminated ||
        block.timestamp - contractStart >= contractDuration * 1 days;
    }


    // terminates the contract if the sender is permitted and any termination conditions are met
    function terminate() public override onlyOwnerOrRequester {
        terminated = true;
    }


}

