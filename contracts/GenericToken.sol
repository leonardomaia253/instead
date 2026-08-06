// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Votes.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Capped.sol";
import "@openzeppelin/contracts/access/Ownable2Step.sol";
import "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import "@openzeppelin/contracts/utils/Nonces.sol";

/**
 * @title GenericToken v2
 * @dev Token ERC20 criado pela InsteadTokenFactory.
 *  - ERC20Capped: supply máximo imutável
 *  - ERC20Burnable: qualquer holder pode queimar
 *  - ERC20Votes (opcional): suporte a governance on-chain (snapshot por bloco)
 *  - Taxas de transferência (opcional): X% para treasury a cada tx
 *  - Blacklist (opcional): compliance/RWA
 *  - Ownable2Step: 2-step transfer of ownership
 */
contract GenericToken is ERC20Capped, ERC20Burnable, ERC20Votes, Ownable2Step {
    bool    public immutable mintable;
    bool    public immutable taxable;
    bool    public immutable hasBlacklist;
    bool    public immutable burnTax;
    uint256 public immutable taxBPS;        // Basis points (200 = 2%)
    address public taxRecipient;
    uint256 public immutable maxWalletBPS;  // 0 disabled, 100 = 1% of cap
    uint256 public immutable createdAt;

    mapping(address => bool) public blacklisted;

    event TokenMinted(address indexed to, uint256 amount);
    event Blacklisted(address indexed account, bool status);
    event TaxRecipientUpdated(address indexed oldRecipient, address indexed newRecipient);

    constructor(
        string memory name_,
        string memory symbol_,
        uint256 initialSupply_,
        uint256 maxSupply_,
        address owner_,
        bool mintable_,
        bool taxable_,
        uint256 taxBPS_,        // e.g. 200 = 2%
        bool hasBlacklist_,
        bool burnTax_,
        uint256 maxWalletBPS_
    )
        ERC20(name_, symbol_)
        ERC20Capped(maxSupply_ * 10 ** 18)
        EIP712(name_, "1")
        Ownable(owner_)
    {
        require(initialSupply_ <= maxSupply_, "Initial > max supply");
        require(taxBPS_ <= 2500, "Tax too high (max 25%)");
        require(maxWalletBPS_ <= 10000, "Max wallet too high");
        require(owner_ != address(0), "Invalid owner");

        mintable      = mintable_;
        taxable       = taxable_;
        taxBPS        = taxBPS_;
        taxRecipient  = owner_;   // Inicialmente o criador; pode ser atualizado via governance
        hasBlacklist  = hasBlacklist_;
        burnTax       = burnTax_;
        maxWalletBPS  = maxWalletBPS_;
        createdAt     = block.timestamp;

        _mint(owner_, initialSupply_ * 10 ** 18);
    }

    function mint(address to, uint256 amount) external onlyOwner {
        require(mintable, "Not mintable");
        _mint(to, amount);
        emit TokenMinted(to, amount);
    }

    function setBlacklist(address account, bool status) external onlyOwner {
        require(hasBlacklist, "No blacklist");
        blacklisted[account] = status;
        emit Blacklisted(account, status);
    }

    function setTaxRecipient(address newRecipient) external onlyOwner {
        require(taxable && !burnTax, "No tax recipient");
        require(newRecipient != address(0), "Invalid recipient");
        emit TaxRecipientUpdated(taxRecipient, newRecipient);
        taxRecipient = newRecipient;
    }

    // ─── Overrides ────────────────────────────────────────────────────────────
    function _update(address from, address to, uint256 value)
        internal
        override(ERC20, ERC20Capped, ERC20Votes)
    {
        if (hasBlacklist) {
            require(!blacklisted[from] && !blacklisted[to], "Blacklisted");
        }

        if (taxable && taxBPS > 0 && from != address(0) && to != address(0)) {
            uint256 taxAmount = (value * taxBPS) / 10000;
            uint256 sendAmount = value - taxAmount;
            super._update(from, burnTax ? address(0) : taxRecipient, taxAmount);
            super._update(from, to, sendAmount);
        } else {
            super._update(from, to, value);
        }

        if (maxWalletBPS > 0 && to != address(0) && to != owner()) {
            require(balanceOf(to) <= (cap() * maxWalletBPS) / 10000, "Max wallet exceeded");
        }
    }

    function nonces(address owner_) public view override(Nonces) returns (uint256) {
        return super.nonces(owner_);
    }
}
