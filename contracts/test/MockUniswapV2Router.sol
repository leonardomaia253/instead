// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract MockUniswapV2Router {
    address public lastToken;
    address public lastTo;
    uint256 public lastTokenAmount;
    uint256 public lastEthAmount;
    uint256 public lastLiquidity;

    function addLiquidityETH(
        address token,
        uint256 amountTokenDesired,
        uint256 amountTokenMin,
        uint256 amountETHMin,
        address to,
        uint256
    ) external payable returns (uint256 amountToken, uint256 amountETH, uint256 liquidity) {
        require(amountTokenDesired >= amountTokenMin, "token slippage");
        require(msg.value >= amountETHMin, "eth slippage");
        IERC20(token).transferFrom(msg.sender, address(this), amountTokenDesired);

        lastToken = token;
        lastTo = to;
        lastTokenAmount = amountTokenDesired;
        lastEthAmount = msg.value;
        lastLiquidity = amountTokenDesired + msg.value;

        return (amountTokenDesired, msg.value, lastLiquidity);
    }
}
