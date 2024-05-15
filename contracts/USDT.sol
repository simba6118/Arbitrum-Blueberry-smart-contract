// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract USDT is ERC20 {    
    uint constant _initial_supply = 1000000000 * (10**18);
    constructor() ERC20("Tether USD", "USDT") {
        _mint(msg.sender, _initial_supply);//100000000000000000000
    }
}