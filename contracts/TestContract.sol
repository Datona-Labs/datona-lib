pragma solidity ^0.5.1;

/*
 * Example of a basic Smart Information Contract
 */

contract SDAC {

    string public constant version = "0.1";

    // basic permission.  Assumes the data vault has validated the requester's ID'
    function isPermitted( address requester ) public view returns (bool);

    // returns true if the contract has expired either automatically or manually
    function hasExpired() public view returns (bool);

    // terminates the contract if the sender is permitted and any termination conditions are met
    function terminate() public;

}


contract TestContract is SDAC {

    string public constant apiVersion = "0.1";
    string public constant version = "0.1";

    address public owner = msg.sender;
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


    // basic permission.  Assumes the data vault has validated the requester's ID'
    function isPermitted( address requester ) public view returns (bool) {
        return ( requester == permittedRequester ) &&
               ( ! hasExpired() );
    }


     // returns true if the contract has expired either automatically or manually
    function hasExpired() public view returns (bool) {
        return terminated ||
               block.timestamp - contractStart >= contractDuration * 1 days;
    }


    // terminates the contract if the sender is permitted and any termination conditions are met
    function terminate() public onlyOwnerOrRequester {
        terminated = true;
    }


}
