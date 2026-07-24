// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "../interfaces/IInsteadLendingAdapter.sol";

interface IComet {
    function baseToken() external view returns (address);
    function supplyTo(address dst, address asset, uint256 amount) external;
    function withdrawFrom(address src, address to, address asset, uint256 amount) external;
    function allow(address manager, bool isAllowed) external;
}

contract CompoundV3Adapter is IInsteadLendingAdapter, Ownable {
    using SafeERC20 for IERC20;

    bytes32 public constant override ADAPTER_ID = keccak256("PROTOCOL_COMPOUND_V3");
    uint256 public constant override adapterVersion = 1;

    mapping(address => address) public assetToComet; // asset => comet market
    mapping(address => bool) public supportedAssets;

    event CometMapped(address indexed asset, address indexed comet);

    constructor(address _owner) Ownable(_owner) {}

    function setCometMarket(address asset, address comet) external onlyOwner {
        require(asset != address(0) && comet != address(0), "Invalid parameters");
        assetToComet[asset] = comet;
        supportedAssets[asset] = true;
        emit CometMapped(asset, comet);
    }

    function supportsAsset(address asset) external view override returns (bool) {
        return supportedAssets[asset];
    }

    function supplyFor(address user, address asset, uint256 amount) external override {
        address comet = assetToComet[asset];
        require(comet != address(0), "Asset unsupported");
        IERC20(asset).safeTransferFrom(msg.sender, address(this), amount);
        IERC20(asset).forceApprove(comet, amount);
        IComet(comet).supplyTo(user, asset, amount);
    }

    function withdrawFor(address user, address asset, uint256 amount) external override returns (uint256 withdrawn) {
        address comet = assetToComet[asset];
        require(comet != address(0), "Asset unsupported");
        IComet(comet).withdrawFrom(msg.sender, user, asset, amount);
        return amount;
    }

    function borrowFor(address user, address asset, uint256 amount) external override {
        address comet = assetToComet[asset];
        require(comet != address(0), "Asset unsupported");
        // Compound V3 borrows baseToken via withdrawFrom against collateral
        IComet(comet).withdrawFrom(user, user, asset, amount);
    }

    function repayFor(address user, address asset, uint256 amount) external override returns (uint256 repaid) {
        address comet = assetToComet[asset];
        require(comet != address(0), "Asset unsupported");
        IERC20(asset).safeTransferFrom(msg.sender, address(this), amount);
        IERC20(asset).forceApprove(comet, amount);
        IComet(comet).supplyTo(user, asset, amount);
        return amount;
    }
}
