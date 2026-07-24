// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MockAToken is ERC20 {
    address public immutable underlying;

    constructor(address _underlying) ERC20("Mock AToken", "maTOKEN") {
        underlying = _underlying;
    }

    function UNDERLYING_ASSET_ADDRESS() external view returns (address) {
        return underlying;
    }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}
