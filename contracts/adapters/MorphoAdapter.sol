// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "../interfaces/IInsteadLendingAdapter.sol";

struct MarketParams {
    address loanToken;
    address collateralToken;
    address oracle;
    address irm;
    uint256 lltv;
}

interface IMorpho {
    function supply(MarketParams memory marketParams, uint256 assets, uint256 shares, address onBehalf, bytes calldata data) external returns (uint256, uint256);
    function withdraw(MarketParams memory marketParams, uint256 assets, uint256 shares, address onBehalf, address receiver) external returns (uint256, uint256);
    function borrow(MarketParams memory marketParams, uint256 assets, uint256 shares, address onBehalf, address receiver) external returns (uint256, uint256);
    function repay(MarketParams memory marketParams, uint256 assets, uint256 shares, address onBehalf, bytes calldata data) external returns (uint256, uint256);
}

contract MorphoAdapter is IInsteadLendingAdapter, Ownable {
    using SafeERC20 for IERC20;

    bytes32 public constant override ADAPTER_ID = keccak256("PROTOCOL_MORPHO_BLUE");
    uint256 public constant override adapterVersion = 1;

    address public immutable morpho;
    mapping(address => MarketParams) public assetMarketParams;
    mapping(address => bool) public supportedAssets;

    event MarketParamsConfigured(address indexed asset, address indexed loanToken, address indexed collateralToken);

    constructor(address _morpho, address _owner) Ownable(_owner) {
        require(_morpho != address(0), "Invalid Morpho contract");
        morpho = _morpho;
    }

    function setMarketParams(address asset, MarketParams calldata params) external onlyOwner {
        require(asset != address(0), "Invalid asset");
        require(params.loanToken != address(0), "Invalid loanToken");
        assetMarketParams[asset] = params;
        supportedAssets[asset] = true;
        emit MarketParamsConfigured(asset, params.loanToken, params.collateralToken);
    }

    function supportsAsset(address asset) external view override returns (bool) {
        return supportedAssets[asset];
    }

    function supplyFor(address user, address asset, uint256 amount) external override {
        require(supportedAssets[asset], "Asset unsupported");
        MarketParams memory params = assetMarketParams[asset];
        IERC20(asset).safeTransferFrom(msg.sender, address(this), amount);
        IERC20(asset).forceApprove(morpho, amount);
        IMorpho(morpho).supply(params, amount, 0, user, "");
    }

    function withdrawFor(address user, address asset, uint256 amount) external override returns (uint256 withdrawn) {
        require(supportedAssets[asset], "Asset unsupported");
        MarketParams memory params = assetMarketParams[asset];
        (withdrawn, ) = IMorpho(morpho).withdraw(params, amount, 0, msg.sender, user);
    }

    function borrowFor(address user, address asset, uint256 amount) external override {
        require(supportedAssets[asset], "Asset unsupported");
        MarketParams memory params = assetMarketParams[asset];
        IMorpho(morpho).borrow(params, amount, 0, msg.sender, user);
    }

    function repayFor(address user, address asset, uint256 amount) external override returns (uint256 repaid) {
        require(supportedAssets[asset], "Asset unsupported");
        MarketParams memory params = assetMarketParams[asset];
        IERC20(asset).safeTransferFrom(msg.sender, address(this), amount);
        IERC20(asset).forceApprove(morpho, amount);
        (repaid, ) = IMorpho(morpho).repay(params, amount, 0, user, "");
    }
}
