// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./interfaces/IInsteadLendingAdapter.sol";

contract InsteadLendingRouter is UUPSUpgradeable, OwnableUpgradeable, PausableUpgradeable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    struct AdapterConfig {
        bool enabled;
        bytes32 protocolId;
        uint256 riskTier;
    }

    mapping(address => AdapterConfig) public adapters;

    event AdapterConfigured(address indexed adapter, bytes32 indexed protocolId, bool enabled, uint256 riskTier);
    event RoutedSupply(address indexed user, address indexed adapter, address indexed asset, uint256 amount);
    event RoutedWithdraw(address indexed user, address indexed adapter, address indexed asset, uint256 amount);
    event RoutedBorrow(address indexed user, address indexed adapter, address indexed asset, uint256 amount);
    event RoutedRepay(address indexed user, address indexed adapter, address indexed asset, uint256 amount);

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(address owner_) public initializer {
        require(owner_ != address(0), "Invalid owner");
        __Ownable_init(owner_);
        __Pausable_init();
    }

    function _authorizeUpgrade(address) internal override onlyOwner {}

    function configureAdapter(address adapter, bytes32 protocolId, bool enabled, uint256 riskTier) external onlyOwner {
        require(adapter != address(0), "Invalid adapter");
        require(protocolId != bytes32(0), "Invalid protocol");
        require(riskTier > 0 && riskTier <= 4, "Invalid risk tier");
        require(IInsteadLendingAdapter(adapter).ADAPTER_ID() == protocolId, "Adapter id mismatch");
        require(IInsteadLendingAdapter(adapter).adapterVersion() > 0, "Invalid adapter version");

        adapters[adapter] = AdapterConfig({
            enabled: enabled,
            protocolId: protocolId,
            riskTier: riskTier
        });

        emit AdapterConfigured(adapter, protocolId, enabled, riskTier);
    }

    function _requireAdapter(address adapter, address asset) internal view {
        require(adapters[adapter].enabled, "Adapter disabled");
        require(IInsteadLendingAdapter(adapter).supportsAsset(asset), "Asset unsupported");
    }

    function supply(address adapter, address asset, uint256 amount) external nonReentrant whenNotPaused {
        require(amount > 0, "Amount must be > 0");
        _requireAdapter(adapter, asset);
        IERC20(asset).safeTransferFrom(msg.sender, address(this), amount);
        IERC20(asset).forceApprove(adapter, amount);
        IInsteadLendingAdapter(adapter).supplyFor(msg.sender, asset, amount);
        emit RoutedSupply(msg.sender, adapter, asset, amount);
    }

    function withdraw(address adapter, address asset, uint256 amount) external nonReentrant whenNotPaused returns (uint256 withdrawn) {
        require(amount > 0, "Amount must be > 0");
        _requireAdapter(adapter, asset);
        withdrawn = IInsteadLendingAdapter(adapter).withdrawFor(msg.sender, asset, amount);
        emit RoutedWithdraw(msg.sender, adapter, asset, withdrawn);
    }

    function borrow(address adapter, address asset, uint256 amount) external nonReentrant whenNotPaused {
        require(amount > 0, "Amount must be > 0");
        _requireAdapter(adapter, asset);
        IInsteadLendingAdapter(adapter).borrowFor(msg.sender, asset, amount);
        emit RoutedBorrow(msg.sender, adapter, asset, amount);
    }

    function repay(address adapter, address asset, uint256 amount) external nonReentrant whenNotPaused returns (uint256 repaid) {
        require(amount > 0, "Amount must be > 0");
        _requireAdapter(adapter, asset);
        IERC20(asset).safeTransferFrom(msg.sender, address(this), amount);
        IERC20(asset).forceApprove(adapter, amount);
        repaid = IInsteadLendingAdapter(adapter).repayFor(msg.sender, asset, amount);
        emit RoutedRepay(msg.sender, adapter, asset, repaid);
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }
}
