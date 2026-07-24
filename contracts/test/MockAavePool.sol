// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

contract MockAavePool {
    using SafeERC20 for IERC20;

    address public lastSupplyAsset;
    uint256 public lastSupplyAmount;
    address public lastSupplyOnBehalfOf;

    address public lastBorrowAsset;
    uint256 public lastBorrowAmount;
    address public lastBorrowOnBehalfOf;

    address public lastRepayAsset;
    uint256 public lastRepayAmount;
    address public lastRepayOnBehalfOf;

    uint256 public collateralBase;
    uint256 public debtBase;
    uint256 public availableBorrowsBase;
    uint256 public liquidationThreshold;
    uint256 public ltv;
    uint256 public healthFactor;

    function supply(address asset, uint256 amount, address onBehalfOf, uint16) external {
        lastSupplyAsset = asset;
        lastSupplyAmount = amount;
        lastSupplyOnBehalfOf = onBehalfOf;
        IERC20(asset).safeTransferFrom(msg.sender, address(this), amount);
    }

    function withdraw(address asset, uint256 amount, address to) external returns (uint256) {
        IERC20(asset).safeTransfer(to, amount);
        return amount;
    }

    function borrow(address asset, uint256 amount, uint256, uint16, address onBehalfOf) external {
        lastBorrowAsset = asset;
        lastBorrowAmount = amount;
        lastBorrowOnBehalfOf = onBehalfOf;
        IERC20(asset).safeTransfer(msg.sender, amount);
    }

    function repay(address asset, uint256 amount, uint256, address onBehalfOf) external returns (uint256) {
        lastRepayAsset = asset;
        lastRepayAmount = amount;
        lastRepayOnBehalfOf = onBehalfOf;
        IERC20(asset).safeTransferFrom(msg.sender, address(this), amount);
        return amount;
    }

    function setAccountData(
        uint256 _collateralBase,
        uint256 _debtBase,
        uint256 _availableBorrowsBase,
        uint256 _liquidationThreshold,
        uint256 _ltv,
        uint256 _healthFactor
    ) external {
        collateralBase = _collateralBase;
        debtBase = _debtBase;
        availableBorrowsBase = _availableBorrowsBase;
        liquidationThreshold = _liquidationThreshold;
        ltv = _ltv;
        healthFactor = _healthFactor;
    }

    function getUserAccountData(address) external view returns (
        uint256,
        uint256,
        uint256,
        uint256,
        uint256,
        uint256
    ) {
        return (collateralBase, debtBase, availableBorrowsBase, liquidationThreshold, ltv, healthFactor);
    }
}
