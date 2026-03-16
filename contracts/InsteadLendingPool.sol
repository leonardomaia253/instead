// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";

// ─── Aave v3 Interfaces ──────────────────────────────────────────────────
interface IPool {
    function supply(address asset, uint256 amount, address onBehalfOf, uint16 referralCode) external;
    function withdraw(address asset, uint256 amount, address to) external returns (uint256);
    function borrow(address asset, uint256 amount, uint256 interestRateMode, uint16 referralCode, address onBehalfOf) external;
    function repay(address asset, uint256 amount, uint256 interestRateMode, address onBehalfOf) external returns (uint256);
    function getUserAccountData(address user) external view returns (
        uint256 totalCollateralBase,
        uint256 totalDebtBase,
        uint256 availableBorrowsBase,
        uint256 currentLiquidationThreshold,
        uint256 ltv,
        uint256 healthFactor
    );
}

interface IPoolAddressesProvider {
    function getPool() external view returns (address);
}

/**
 * @title InsteadLendingPool Aggregator v1
 * @dev Lending Aggregator that routes liquidity through Aave v3.
 *  - Zero Liquidity: Instead doesn't hold its own pools.
 *  - Intermediary: Users interact with Instead, which interacts with Aave.
 *  - Fee Model: Charges a convenience fee on borrow/interest.
 */
contract InsteadLendingPool is
    UUPSUpgradeable,
    OwnableUpgradeable,
    ReentrancyGuardUpgradeable,
    PausableUpgradeable
{
    using SafeERC20 for IERC20;

    // ─── Structs ──────────────────────────────────────────────────────────────
    struct UserPosition {
        uint256 collateralBalance;
        uint256 borrowBalance;
    }

    // ─── Constants ────────────────────────────────────────────────────────────
    uint256 public constant RAY = 1e27;
    uint256 public constant FEE_PRECISION = 10000; // 100.00%

    // ─── Storage ──────────────────────────────────────────────────────────────
    IPoolAddressesProvider public addressesProvider;
    address public treasury;
    uint256 public convenienceFee; // e.g., 50 = 0.5%
    
    // mapping to track user positions locally (mirrored from Aave for UI/fee calculation)
    mapping(address => mapping(address => UserPosition)) public userPositions;
    mapping(address => bool) public supportedAssets;

    // ─── Events ───────────────────────────────────────────────────────────────
    event CollateralDeposited(address indexed user, address indexed asset, uint256 amount);
    event CollateralWithdrawn(address indexed user, address indexed asset, uint256 amount);
    event Borrowed(address indexed user, address indexed asset, uint256 amount, uint256 fee);
    event Repaid(address indexed user, address indexed asset, uint256 amount);
    event FeeCollected(address indexed asset, uint256 amount);

    // ─── Initializer (UUPS) ───────────────────────────────────────────────────
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() { _disableInitializers(); }

    function initialize(address _addressesProvider, address _treasury) public initializer {
        __UUPSUpgradeable_init();
        __Ownable_init(msg.sender);
        __ReentrancyGuard_init();
        __Pausable_init();
        
        require(_addressesProvider != address(0), "Invalid provider");
        require(_treasury != address(0), "Invalid treasury");
        
        addressesProvider = IPoolAddressesProvider(_addressesProvider);
        treasury = _treasury;
        convenienceFee = 50; // default 0.5%
    }

    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}

    // ─── Admin ────────────────────────────────────────────────────────────────
    function setConvenienceFee(uint256 _fee) external onlyOwner {
        require(_fee <= 500, "Fee too high"); // Max 5%
        convenienceFee = _fee;
    }

    function setSupportedAsset(address asset, bool supported) external onlyOwner {
        supportedAssets[asset] = supported;
    }

    // ─── Core Operations ──────────────────────────────────────────────────────

    function getAavePool() public view returns (IPool) {
        return IPool(addressesProvider.getPool());
    }

    function depositCollateral(address asset, uint256 amount) external nonReentrant whenNotPaused {
        require(supportedAssets[asset], "Asset not supported");
        require(amount > 0, "Amount must be > 0");

        IERC20(asset).safeTransferFrom(msg.sender, address(this), amount);
        
        IPool pool = getAavePool();
        IERC20(asset).approve(address(pool), amount);
        pool.supply(asset, amount, address(this), 0);

        userPositions[msg.sender][asset].collateralBalance += amount;
        
        emit CollateralDeposited(msg.sender, asset, amount);
    }

    function withdrawCollateral(address asset, uint256 amount) external nonReentrant whenNotPaused {
        require(userPositions[msg.sender][asset].collateralBalance >= amount, "Insufficient balance");
        
        IPool pool = getAavePool();
        uint256 withdrawn = pool.withdraw(asset, amount, msg.sender);
        
        userPositions[msg.sender][asset].collateralBalance -= withdrawn;
        
        emit CollateralWithdrawn(msg.sender, asset, withdrawn);
    }

    function borrow(address asset, uint256 amount) external nonReentrant whenNotPaused {
        require(supportedAssets[asset], "Asset not supported");
        require(amount > 0, "Amount must be > 0");

        IPool pool = getAavePool();
        
        // Borrow from Aave on behalf of this contract
        // interestRateMode: 2 for Variable
        pool.borrow(asset, amount, 2, 0, address(this));

        // Deduct convenience fee
        uint256 fee = (amount * convenienceFee) / FEE_PRECISION;
        uint256 amountToUser = amount - fee;

        if (fee > 0) {
            IERC20(asset).safeTransfer(treasury, fee);
            emit FeeCollected(asset, fee);
        }

        IERC20(asset).safeTransfer(msg.sender, amountToUser);
        
        userPositions[msg.sender][asset].borrowBalance += amount;
        
        emit Borrowed(msg.sender, asset, amount, fee);
    }

    function repay(address asset, uint256 amount) external nonReentrant whenNotPaused {
        require(amount > 0, "Amount must be > 0");
        
        IERC20(asset).safeTransferFrom(msg.sender, address(this), amount);
        
        IPool pool = getAavePool();
        IERC20(asset).approve(address(pool), amount);
        
        // Repay to Aave
        uint256 repaid = pool.repay(asset, amount, 2, address(this));
        
        // Update local tracking (simplified)
        if (userPositions[msg.sender][asset].borrowBalance > repaid) {
            userPositions[msg.sender][asset].borrowBalance -= repaid;
        } else {
            userPositions[msg.sender][asset].borrowBalance = 0;
        }

        emit Repaid(msg.sender, asset, repaid);
    }

    // ─── View Functions ───────────────────────────────────────────────────────

    function getUserAccountData(address user) external view returns (
        uint256 totalCollateralBase,
        uint256 totalDebtBase,
        uint256 availableBorrowsBase,
        uint256 currentLiquidationThreshold,
        uint256 ltv,
        uint256 healthFactor
    ) {
        // This returns data from Aave for this contract's position
        // In a real multi-user scenario, this needs to be mapped per user
        return getAavePool().getUserAccountData(address(this));
    }

    function pause()   external onlyOwner { _pause(); }
    function unpause() external onlyOwner { _unpause(); }
}
