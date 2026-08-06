// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "../interfaces/IInsteadLendingAdapter.sol";

interface ISparkPool {
    function supply(address asset, uint256 amount, address onBehalfOf, uint16 referralCode) external;
    function withdraw(address asset, uint256 amount, address to) external returns (uint256);
    function borrow(address asset, uint256 amount, uint256 interestRateMode, uint16 referralCode, address onBehalfOf) external;
    function repay(address asset, uint256 amount, uint256 interestRateMode, address onBehalfOf) external returns (uint256);
}

interface ISparkAToken is IERC20 {
    function UNDERLYING_ASSET_ADDRESS() external view returns (address);
}

interface ISparkVariableDebtToken {
    function UNDERLYING_ASSET_ADDRESS() external view returns (address);
    function borrowAllowance(address fromUser, address toUser) external view returns (uint256);
}

contract SparkAdapter is IInsteadLendingAdapter, Ownable {
    using SafeERC20 for IERC20;

    bytes32 public constant override ADAPTER_ID = keccak256("PROTOCOL_SPARK_V1");
    uint256 public constant override adapterVersion = 1;

    address public immutable sparkPool;
    mapping(address => bool) public supportedAssets;
    mapping(address => address) public aTokenByAsset;
    mapping(address => address) public variableDebtTokenByAsset;

    event AssetConfigured(address indexed asset, address indexed aToken, address indexed variableDebtToken, bool supported);

    constructor(address _sparkPool, address _owner) Ownable(_owner) {
        require(_sparkPool != address(0), "Invalid Spark pool");
        sparkPool = _sparkPool;
    }

    function setAssetSupport(address asset, bool supported) external onlyOwner {
        require(asset != address(0), "Invalid asset");
        supportedAssets[asset] = supported;
        emit AssetConfigured(asset, aTokenByAsset[asset], variableDebtTokenByAsset[asset], supported);
    }

    function configureAsset(address asset, address aToken, address variableDebtToken, bool supported) external onlyOwner {
        require(asset != address(0), "Invalid asset");
        require(!supported || aToken != address(0), "Invalid aToken");
        require(!supported || variableDebtToken != address(0), "Invalid debt token");
        if (aToken != address(0)) {
            require(ISparkAToken(aToken).UNDERLYING_ASSET_ADDRESS() == asset, "aToken mismatch");
        }
        if (variableDebtToken != address(0)) {
            require(ISparkVariableDebtToken(variableDebtToken).UNDERLYING_ASSET_ADDRESS() == asset, "debt token mismatch");
        }

        supportedAssets[asset] = supported;
        aTokenByAsset[asset] = aToken;
        variableDebtTokenByAsset[asset] = variableDebtToken;
        emit AssetConfigured(asset, aToken, variableDebtToken, supported);
    }

    function supportsAsset(address asset) external view override returns (bool) {
        return supportedAssets[asset];
    }

    function supplyFor(address user, address asset, uint256 amount) external override {
        require(supportedAssets[asset], "Asset unsupported");
        IERC20(asset).safeTransferFrom(msg.sender, address(this), amount);
        IERC20(asset).forceApprove(sparkPool, amount);
        ISparkPool(sparkPool).supply(asset, amount, user, 0);
    }

    function withdrawFor(address user, address asset, uint256 amount) external override returns (uint256 withdrawn) {
        require(supportedAssets[asset], "Asset unsupported");
        address aToken = aTokenByAsset[asset];
        require(aToken != address(0), "aToken not configured");
        IERC20(aToken).safeTransferFrom(user, address(this), amount);
        IERC20(aToken).forceApprove(sparkPool, amount);
        withdrawn = ISparkPool(sparkPool).withdraw(asset, amount, user);
    }

    function borrowFor(address user, address asset, uint256 amount) external override {
        require(supportedAssets[asset], "Asset unsupported");
        address variableDebtToken = variableDebtTokenByAsset[asset];
        require(variableDebtToken != address(0), "Debt token not configured");
        require(
            ISparkVariableDebtToken(variableDebtToken).borrowAllowance(user, address(this)) >= amount,
            "Insufficient credit delegation"
        );
        ISparkPool(sparkPool).borrow(asset, amount, 2, 0, user); // Variable rate (mode 2)
    }

    function repayFor(address user, address asset, uint256 amount) external override returns (uint256 repaid) {
        require(supportedAssets[asset], "Asset unsupported");
        IERC20(asset).safeTransferFrom(msg.sender, address(this), amount);
        IERC20(asset).forceApprove(sparkPool, amount);
        repaid = ISparkPool(sparkPool).repay(asset, amount, 2, user); // Variable rate (mode 2)
    }
}
