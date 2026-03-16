// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";
import "./GenericToken.sol";

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
    uint256 public feeUSD = 500_000_000; // $5.00 em 8 decimais
    AggregatorV3Interface public immutable ethUsdFeed;
    address public immutable treasury; // Gnosis Safe — IMUTÁVEL
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
        uint256 feePaid
    );
    event FeeUpdated(uint256 oldFeeUSD, uint256 newFeeUSD);
    event FeesWithdrawn(address indexed to, uint256 amount);

    constructor(address _ethUsdFeed, address _treasury) Ownable(msg.sender) {
        require(_ethUsdFeed != address(0), "Invalid feed");
        require(_treasury != address(0), "Invalid treasury");
        ethUsdFeed = AggregatorV3Interface(_ethUsdFeed);
        treasury   = _treasury;
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
        _validateName(name);
        _validateSymbol(symbol);
        require(initialSupply > 0, "Supply must be > 0");
        require(maxSupply >= initialSupply, "Max < initial");
        require(taxBPS_ <= 2500, "Tax max 25%");

        uint256 feeInEth = getCreationFeeInEth();
        require(msg.value >= feeInEth, "Insufficient fee");

        GenericToken token = new GenericToken(
            name, symbol, initialSupply, maxSupply,
            msg.sender, isMintable, isTaxable, taxBPS_, hasBlacklist_
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

        emit TokenCreated(tokenAddr, msg.sender, name, symbol, initialSupply, maxSupply, isMintable, isTaxable, taxBPS_, feeInEth);
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
