// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract MockVariableDebtToken {
    address public immutable underlying;
    mapping(address => mapping(address => uint256)) public allowance;

    constructor(address _underlying) {
        underlying = _underlying;
    }

    function UNDERLYING_ASSET_ADDRESS() external view returns (address) {
        return underlying;
    }

    function approveDelegation(address delegatee, uint256 amount) external {
        allowance[msg.sender][delegatee] = amount;
    }

    function borrowAllowance(address fromUser, address toUser) external view returns (uint256) {
        return allowance[fromUser][toUser];
    }
}
