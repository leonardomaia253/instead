// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./interfaces/IInsteadLendingAdapter.sol";

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

interface IAToken is IERC20 {
    function UNDERLYING_ASSET_ADDRESS() external view returns (address);
}

interface IVariableDebtToken {
    function UNDERLYING_ASSET_ADDRESS() external view returns (address);
    function borrowAllowance(address fromUser, address toUser) external view returns (uint256);
}

/**
 * @title InsteadLendingPool
 * @dev Non-custodial Aave v3 adapter.
 *
 * User risk stays isolated in Aave:
 * - supply deposits on behalf of msg.sender, so aTokens are minted to the user.
 * - withdraw requires the user to approve this adapter to transfer their aTokens first.
 * - borrow creates debt for msg.sender and requires Aave credit delegation to this adapter.
 * - repay repays debt on behalf of msg.sender.
 *
 * The adapter never borrows against a shared contract-level Aave account.
 */
contract InsteadLendingPool is
    IInsteadLendingAdapter,
    UUPSUpgradeable,
    OwnableUpgradeable,
    ReentrancyGuard,
    PausableUpgradeable
{
    using SafeERC20 for IERC20;

    uint256 public constant FEE_PRECISION = 10_000;
    uint256 public constant VARIABLE_RATE_MODE = 2;
    bytes32 public constant override ADAPTER_ID = keccak256("AAVE_V3");

    IPoolAddressesProvider public addressesProvider;
    address public treasury;
    uint256 public convenienceFee; // 50 = 0.50%

    mapping(address => bool) public supportedAssets;
    mapping(address => address) public aTokenByAsset;
    mapping(address => address) public variableDebtTokenByAsset;
    mapping(address => uint256) public totalSuppliedByAsset;
    mapping(address => uint256) public totalBorrowedByAsset;
    mapping(address => uint256) public totalRepaidByAsset;
    mapping(address => uint256) public totalFeesByAsset;

    event CollateralSupplied(address indexed user, address indexed asset, uint256 amount);
    event CollateralWithdrawn(address indexed user, address indexed asset, uint256 amount);
    event Borrowed(address indexed user, address indexed asset, uint256 amount, uint256 fee);
    event Repaid(address indexed user, address indexed asset, uint256 amount);
    event FeeCollected(address indexed asset, uint256 amount);
    event AssetConfigured(address indexed asset, address indexed aToken, address indexed variableDebtToken, bool supported);
    event TreasuryUpdated(address indexed oldTreasury, address indexed newTreasury);
    event ConvenienceFeeUpdated(uint256 oldFee, uint256 newFee);
    event AuthorizedRouterUpdated(address indexed oldRouter, address indexed newRouter);

    address public authorizedRouter;

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(address _addressesProvider, address _treasury) public initializer {
        require(_addressesProvider != address(0), "Invalid provider");
        require(_treasury != address(0), "Invalid treasury");

        __Ownable_init(msg.sender);
        __Pausable_init();

        addressesProvider = IPoolAddressesProvider(_addressesProvider);
        treasury = _treasury;
        convenienceFee = 50;
    }

    function _authorizeUpgrade(address) internal override onlyOwner {}

    function getAavePool() public view returns (IPool) {
        return IPool(addressesProvider.getPool());
    }

    function adapterVersion() external pure override returns (uint256) {
        return 1;
    }

    function supportsAsset(address asset) external view override returns (bool) {
        return supportedAssets[asset];
    }

    modifier onlyRouter() {
        require(msg.sender == authorizedRouter, "Router only");
        _;
    }

    function setAuthorizedRouter(address newRouter) external onlyOwner {
        emit AuthorizedRouterUpdated(authorizedRouter, newRouter);
        authorizedRouter = newRouter;
    }

    function configureAsset(address asset, address aToken, address variableDebtToken, bool supported) external onlyOwner {
        require(asset != address(0), "Invalid asset");
        require(!supported || aToken != address(0), "Invalid aToken");
        require(!supported || variableDebtToken != address(0), "Invalid debt token");
        if (aToken != address(0)) {
            require(IAToken(aToken).UNDERLYING_ASSET_ADDRESS() == asset, "aToken mismatch");
        }
        if (variableDebtToken != address(0)) {
            require(IVariableDebtToken(variableDebtToken).UNDERLYING_ASSET_ADDRESS() == asset, "debt token mismatch");
        }

        supportedAssets[asset] = supported;
        aTokenByAsset[asset] = aToken;
        variableDebtTokenByAsset[asset] = variableDebtToken;

        emit AssetConfigured(asset, aToken, variableDebtToken, supported);
    }

    function setConvenienceFee(uint256 newFee) external onlyOwner {
        require(newFee <= 500, "Fee too high");
        emit ConvenienceFeeUpdated(convenienceFee, newFee);
        convenienceFee = newFee;
    }

    function setTreasury(address newTreasury) external onlyOwner {
        require(newTreasury != address(0), "Invalid treasury");
        emit TreasuryUpdated(treasury, newTreasury);
        treasury = newTreasury;
    }

    function supply(address asset, uint256 amount) external nonReentrant whenNotPaused {
        _supplyFor(msg.sender, asset, amount);
    }

    function supplyFor(address user, address asset, uint256 amount) external override nonReentrant whenNotPaused onlyRouter {
        _supplyFor(user, asset, amount);
    }

    function _supplyFor(address user, address asset, uint256 amount) internal {
        require(supportedAssets[asset], "Asset not supported");
        require(amount > 0, "Amount must be > 0");

        IERC20(asset).safeTransferFrom(msg.sender, address(this), amount);
        IERC20(asset).forceApprove(address(getAavePool()), amount);
        getAavePool().supply(asset, amount, user, 0);

        totalSuppliedByAsset[asset] += amount;
        emit CollateralSupplied(user, asset, amount);
    }

    function withdraw(address asset, uint256 amount) external nonReentrant whenNotPaused returns (uint256 withdrawn) {
        return _withdrawFor(msg.sender, asset, amount);
    }

    function withdrawFor(address user, address asset, uint256 amount) external override nonReentrant whenNotPaused onlyRouter returns (uint256 withdrawn) {
        return _withdrawFor(user, asset, amount);
    }

    function _withdrawFor(address user, address asset, uint256 amount) internal returns (uint256 withdrawn) {
        require(supportedAssets[asset], "Asset not supported");
        require(amount > 0, "Amount must be > 0");

        address aToken = aTokenByAsset[asset];
        require(aToken != address(0), "aToken not configured");

        IERC20(aToken).safeTransferFrom(user, address(this), amount);
        IERC20(aToken).forceApprove(address(getAavePool()), amount);
        withdrawn = getAavePool().withdraw(asset, amount, user);

        emit CollateralWithdrawn(user, asset, withdrawn);
    }

    function borrow(address asset, uint256 amount) external nonReentrant whenNotPaused {
        _borrowFor(msg.sender, asset, amount);
    }

    function borrowFor(address user, address asset, uint256 amount) external override nonReentrant whenNotPaused onlyRouter {
        _borrowFor(user, asset, amount);
    }

    function _borrowFor(address user, address asset, uint256 amount) internal {
        require(supportedAssets[asset], "Asset not supported");
        require(amount > 0, "Amount must be > 0");
        address variableDebtToken = variableDebtTokenByAsset[asset];
        require(variableDebtToken != address(0), "Debt token not configured");
        require(
            IVariableDebtToken(variableDebtToken).borrowAllowance(user, address(this)) >= amount,
            "Insufficient credit delegation"
        );

        getAavePool().borrow(asset, amount, VARIABLE_RATE_MODE, 0, user);

        uint256 fee = (amount * convenienceFee) / FEE_PRECISION;
        uint256 amountToUser = amount - fee;
        if (fee > 0) {
            IERC20(asset).safeTransfer(treasury, fee);
            totalFeesByAsset[asset] += fee;
            emit FeeCollected(asset, fee);
        }
        IERC20(asset).safeTransfer(user, amountToUser);

        totalBorrowedByAsset[asset] += amount;
        emit Borrowed(user, asset, amount, fee);
    }

    function repay(address asset, uint256 amount) external nonReentrant whenNotPaused returns (uint256 repaid) {
        return _repayFor(msg.sender, asset, amount);
    }

    function repayFor(address user, address asset, uint256 amount) external override nonReentrant whenNotPaused onlyRouter returns (uint256 repaid) {
        return _repayFor(user, asset, amount);
    }

    function _repayFor(address user, address asset, uint256 amount) internal returns (uint256 repaid) {
        require(supportedAssets[asset], "Asset not supported");
        require(amount > 0, "Amount must be > 0");

        IERC20(asset).safeTransferFrom(msg.sender, address(this), amount);
        IERC20(asset).forceApprove(address(getAavePool()), amount);
        repaid = getAavePool().repay(asset, amount, VARIABLE_RATE_MODE, user);

        uint256 refund = amount - repaid;
        if (refund > 0) {
            IERC20(asset).safeTransfer(user, refund);
        }

        totalRepaidByAsset[asset] += repaid;
        emit Repaid(user, asset, repaid);
    }

    function getUserAccountData(address user) external view returns (
        uint256 totalCollateralBase,
        uint256 totalDebtBase,
        uint256 availableBorrowsBase,
        uint256 currentLiquidationThreshold,
        uint256 ltv,
        uint256 healthFactor
    ) {
        return getAavePool().getUserAccountData(user);
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }
}
