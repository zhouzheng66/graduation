// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;
contract Sample {
    string private hello;
    constructor(string memory str) {
        hello = str;
    }
    function sayHello() public view returns (string memory) {
        return hello;
    }
}
