//SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract LToken is ERC20 {
	constructor(string memory name, string memory symbol) ERC20(name, symbol) {
		_mint(msg.sender, 1000000000000000000000000); // Mint 1,000,000 TokenA tokens to the deployer
	}
}