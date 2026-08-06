// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract MockComet {
    address public baseToken;
    address public lastSupplyDst;
    address public lastSupplyAsset;
    address public lastWithdrawSrc;
    address public lastWithdrawTo;
    address public lastWithdrawAsset;
    uint256 public lastSupplyAmount;
    uint256 public lastWithdrawAmount;

    constructor(address _baseToken) {
        baseToken = _baseToken;
    }

    function supplyTo(address dst, address asset, uint256 amount) external {
        lastSupplyDst = dst;
        lastSupplyAsset = asset;
        lastSupplyAmount = amount;
    }

    function withdrawFrom(address src, address to, address asset, uint256 amount) external {
        lastWithdrawSrc = src;
        lastWithdrawTo = to;
        lastWithdrawAsset = asset;
        lastWithdrawAmount = amount;
    }

    function allow(address, bool) external {}
}
