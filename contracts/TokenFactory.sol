// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@chainlink/contracts/src/v0.8/shared/interfaces/AggregatorV3Interface.sol";
import "./GenericToken.sol";

interface IUniswapV2RouterLike {
    function addLiquidityETH(
        address token,
        uint256 amountTokenDesired,
        uint256 amountTokenMin,
        uint256 amountETHMin,
        address to,
        uint256 deadline
    ) external payable returns (uint256 amountToken, uint256 amountETH, uint256 liquidity);
}

/**
 * @title InsteadTokenFactory v2
 * @dev Factory com:
 *  - Validação on-chain de nome e símbolo (comprimento, chars)
 *  - Treasury Multi-sig imutável (não pode ser mudado para EOA)
 *  - Suporte a todos os parâmetros do GenericToken v2 (tax, blacklist, votes)
 *  - Chainlink staleness check
 *  - Refund de excedente de taxa
 */
contract InsteadTokenFactory is Ownable, ReentrancyGuard, Pausable {
    uint256 public constant FACTORY_VERSION = 3;
    uint256 public feeUSD = 500_000_000; // $5.00 em 8 decimais
    AggregatorV3Interface public immutable ethUsdFeed;
    address public immutable treasury; // Gnosis Safe — IMUTÁVEL
    IUniswapV2RouterLike public immutable dexRouter;
    uint256 public constant MAX_PRICE_DELAY = 1 hours;

    struct TokenMeta {
        address tokenAddress;
        string  name;
        string  symbol;
        uint256 initialSupply;
        uint256 maxSupply;
        bool    mintable;
        bool    taxable;
        uint256 taxBPS;
        bool    hasBlacklist;
        bool    burnTax;
        uint256 maxWalletBPS;
        address creator;
        uint256 chainId;
        uint256 createdAt;
    }

    TokenMeta[] public createdTokens;
    mapping(address => address[]) public tokensByCreator;
    // Impede registro de tokens falsos com mesmo endereço
    mapping(address => bool) public tokenRegistered;

    event TokenCreated(
        address indexed tokenAddress,
        address indexed creator,
        string name,
        string symbol,
        uint256 initialSupply,
        uint256 maxSupply,
        bool mintable,
        bool taxable,
        uint256 taxBPS,
        bool burnTax,
        uint256 maxWalletBPS,
        uint256 feePaid
    );
    event FeeUpdated(uint256 oldFeeUSD, uint256 newFeeUSD);
    event FeesWithdrawn(address indexed to, uint256 amount);
    event FairLaunchCreated(address indexed tokenAddress, address indexed creator, uint256 tokenAmount, uint256 ethAmount, uint256 liquidity, address indexed lpRecipient);

    constructor(address _ethUsdFeed, address _treasury, address _dexRouter) Ownable(msg.sender) {
        require(_ethUsdFeed != address(0), "Invalid feed");
        require(_treasury != address(0), "Invalid treasury");
        require(_dexRouter != address(0), "Invalid router");
        ethUsdFeed = AggregatorV3Interface(_ethUsdFeed);
        treasury   = _treasury;
        dexRouter  = IUniswapV2RouterLike(_dexRouter);
    }

    // ─── Validações de Nome/Símbolo on-chain ──────────────────────────────────
    function _validateSymbol(string memory sym) internal pure {
        bytes memory b = bytes(sym);
        require(b.length >= 2 && b.length <= 8, "Symbol: 2-8 chars");
        for (uint i = 0; i < b.length; i++) {
            require(
                (b[i] >= 0x41 && b[i] <= 0x5A) || // A-Z
                (b[i] >= 0x30 && b[i] <= 0x39),    // 0-9
                "Symbol: only A-Z 0-9"
            );
        }
    }

    function _validateName(string memory name) internal pure {
        bytes memory b = bytes(name);
        require(b.length >= 2 && b.length <= 50, "Name: 2-50 chars");
    }

    // ─── Fee ─────────────────────────────────────────────────────────────────
    function getCreationFeeInEth() public view returns (uint256) {
        (uint80 roundId, int256 ethPrice, , uint256 updatedAt, uint80 answeredInRound) = ethUsdFeed.latestRoundData();
        require(ethPrice > 0, "Invalid ETH price");
        require(answeredInRound >= roundId, "Stale round");
        require(block.timestamp - updatedAt <= MAX_PRICE_DELAY, "Price stale");
        return (feeUSD * 1e18) / uint256(ethPrice);
    }

    // ─── Create Token ─────────────────────────────────────────────────────────
    function createToken(
        string memory name,
        string memory symbol,
        uint256 initialSupply,
        uint256 maxSupply,
        bool isMintable,
        bool isTaxable,
        uint256 taxBPS_,
        bool hasBlacklist_
    ) external payable nonReentrant whenNotPaused returns (address) {
        return _createToken(
            name,
            symbol,
            initialSupply,
            maxSupply,
            isMintable,
            isTaxable,
            taxBPS_,
            hasBlacklist_,
            false,
            0
        );
    }

    function createTokenAdvanced(
        string memory name,
        string memory symbol,
        uint256 initialSupply,
        uint256 maxSupply,
        bool isMintable,
        bool isTaxable,
        uint256 taxBPS_,
        bool hasBlacklist_,
        bool burnTax_,
        uint256 maxWalletBPS_
    ) external payable nonReentrant whenNotPaused returns (address) {
        return _createToken(
            name,
            symbol,
            initialSupply,
            maxSupply,
            isMintable,
            isTaxable,
            taxBPS_,
            hasBlacklist_,
            burnTax_,
            maxWalletBPS_
        );
    }

    function createFairLaunchTokenETH(
        string memory name,
        string memory symbol,
        uint256 supply,
        uint256 minTokenAmount,
        uint256 minEthAmount,
        address lpRecipient,
        uint256 deadline
    ) external payable nonReentrant whenNotPaused returns (address tokenAddr, uint256 liquidity) {
        _validateName(name);
        _validateSymbol(symbol);
        require(supply > 0, "Supply must be > 0");
        require(lpRecipient != address(0), "Invalid LP recipient");
        require(deadline >= block.timestamp, "Deadline expired");

        uint256 feeInEth = getCreationFeeInEth();
        require(msg.value > feeInEth, "Liquidity ETH required");
        uint256 liquidityEth = msg.value - feeInEth;

        GenericToken token = new GenericToken(
            name,
            symbol,
            supply,
            supply,
            address(this),
            false,
            false,
            0,
            false,
            false,
            0
        );

        tokenAddr = address(token);
        require(!tokenRegistered[tokenAddr], "Already registered");
        tokenRegistered[tokenAddr] = true;

        uint256 tokenAmount = token.balanceOf(address(this));
        token.approve(address(dexRouter), tokenAmount);
        (uint256 amountToken, uint256 amountETH, uint256 lpLiquidity) = dexRouter.addLiquidityETH{ value: liquidityEth }(
            tokenAddr,
            tokenAmount,
            minTokenAmount,
            minEthAmount,
            lpRecipient,
            deadline
        );
        require(amountToken == tokenAmount, "Not all tokens pooled");
        require(token.balanceOf(address(this)) == 0, "Token residue");

        token.transferOwnership(msg.sender);
        liquidity = lpLiquidity;

        createdTokens.push(TokenMeta({
            tokenAddress: tokenAddr,
            name:         name,
            symbol:       symbol,
            initialSupply: supply,
            maxSupply:    supply,
            mintable:     false,
            taxable:      false,
            taxBPS:       0,
            hasBlacklist: false,
            burnTax:      false,
            maxWalletBPS: 0,
            creator:      msg.sender,
            chainId:      block.chainid,
            createdAt:    block.timestamp
        }));

        tokensByCreator[msg.sender].push(tokenAddr);

        (bool sent,) = treasury.call{ value: feeInEth }("");
        require(sent, "Fee transfer failed");

        if (liquidityEth > amountETH) {
            payable(msg.sender).transfer(liquidityEth - amountETH);
        }

        emit TokenCreated(tokenAddr, msg.sender, name, symbol, supply, supply, false, false, 0, false, 0, feeInEth);
        emit FairLaunchCreated(tokenAddr, msg.sender, amountToken, amountETH, lpLiquidity, lpRecipient);
    }

    function _createToken(
        string memory name,
        string memory symbol,
        uint256 initialSupply,
        uint256 maxSupply,
        bool isMintable,
        bool isTaxable,
        uint256 taxBPS_,
        bool hasBlacklist_,
        bool burnTax_,
        uint256 maxWalletBPS_
    ) internal returns (address) {
        _validateName(name);
        _validateSymbol(symbol);
        require(initialSupply > 0, "Supply must be > 0");
        require(maxSupply >= initialSupply, "Max < initial");
        require(taxBPS_ <= 2500, "Tax max 25%");
        require(maxWalletBPS_ <= 10000, "Max wallet max 100%");
        require(!burnTax_ || isTaxable, "Burn tax requires tax");

        uint256 feeInEth = getCreationFeeInEth();
        require(msg.value >= feeInEth, "Insufficient fee");

        GenericToken token = new GenericToken(
            name, symbol, initialSupply, maxSupply,
            msg.sender, isMintable, isTaxable, taxBPS_, hasBlacklist_, burnTax_, maxWalletBPS_
        );
        address tokenAddr = address(token);
        require(!tokenRegistered[tokenAddr], "Already registered");
        tokenRegistered[tokenAddr] = true;

        createdTokens.push(TokenMeta({
            tokenAddress: tokenAddr,
            name:         name,
            symbol:       symbol,
            initialSupply: initialSupply,
            maxSupply:    maxSupply,
            mintable:     isMintable,
            taxable:      isTaxable,
            taxBPS:       taxBPS_,
            hasBlacklist: hasBlacklist_,
            burnTax:      burnTax_,
            maxWalletBPS: maxWalletBPS_,
            creator:      msg.sender,
            chainId:      block.chainid,
            createdAt:    block.timestamp
        }));

        tokensByCreator[msg.sender].push(tokenAddr);

        // Fees sempre para treasury multi-sig (imutável)
        (bool sent,) = treasury.call{ value: feeInEth }("");
        require(sent, "Fee transfer failed");

        // Refund de excedente
        if (msg.value > feeInEth) {
            payable(msg.sender).transfer(msg.value - feeInEth);
        }

        emit TokenCreated(tokenAddr, msg.sender, name, symbol, initialSupply, maxSupply, isMintable, isTaxable, taxBPS_, burnTax_, maxWalletBPS_, feeInEth);
        return tokenAddr;
    }

    function setFeeUSD(uint256 newFeeUSD) external onlyOwner {
        emit FeeUpdated(feeUSD, newFeeUSD);
        feeUSD = newFeeUSD;
    }

    function totalTokensCreated() external view returns (uint256) { return createdTokens.length; }
    function pause()   external onlyOwner { _pause(); }
    function unpause() external onlyOwner { _unpause(); }
}
