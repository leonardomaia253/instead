// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title InsteadStaking
 * @dev Contrato de Staking Simples com recompensas por bloco para o token nativo $INSTEAD.
 * Os usuários fazem stake do token $INSTEAD, acumulando recompensas em $INSTEAD por bloco.
 */
contract InsteadStaking is ReentrancyGuard, Pausable, Ownable {
    using SafeERC20 for IERC20;

    IERC20 public immutable stakeToken;      // Token que o usuário deposita (ex: $INSTEAD)
    IERC20 public immutable rewardToken;     // Token de recompensa (pode ser o mesmo)

    uint256 public rewardPerBlock;           // Recompensas emitidas por bloco (em wei)
    uint256 public lastRewardBlock;          // Último bloco onde o cálculo foi realizado
    uint256 public accRewardPerShare;        // Recompensa acumulada por token com 18 casas decimais

    uint256 public totalStaked;

    struct UserInfo {
        uint256 amount;       // Quantidade total de tokens em stake
        uint256 rewardDebt;   // "Dívida" de recompensa calculada para evitar contagem dupla
    }

    mapping(address => UserInfo) public userInfo;

    event Staked(address indexed user, uint256 amount);
    event Unstaked(address indexed user, uint256 amount);
    event RewardClaimed(address indexed user, uint256 amount);
    event RewardRateUpdated(uint256 newRewardPerBlock);

    constructor(
        address _stakeToken,
        address _rewardToken,
        uint256 _rewardPerBlock
    ) Ownable(msg.sender) {
        require(_stakeToken != address(0) && _rewardToken != address(0), "Invalid tokens");
        stakeToken = IERC20(_stakeToken);
        rewardToken = IERC20(_rewardToken);
        rewardPerBlock = _rewardPerBlock;
        lastRewardBlock = block.number;
    }

    // Atualiza o acumulador de recompensas com base em quantos blocos se passaram
    function _updatePool() internal {
        if (block.number <= lastRewardBlock || totalStaked == 0) {
            lastRewardBlock = block.number;
            return;
        }
        uint256 blocks = block.number - lastRewardBlock;
        uint256 reward = blocks * rewardPerBlock;
        accRewardPerShare += (reward * 1e18) / totalStaked;
        lastRewardBlock = block.number;
    }

    function pendingReward(address _user) public view returns (uint256) {
        UserInfo storage user = userInfo[_user];
        uint256 acc = accRewardPerShare;
        if (block.number > lastRewardBlock && totalStaked != 0) {
            uint256 blocks = block.number - lastRewardBlock;
            acc += (blocks * rewardPerBlock * 1e18) / totalStaked;
        }
        return (user.amount * acc / 1e18) - user.rewardDebt;
    }

    function stake(uint256 amount) external nonReentrant whenNotPaused {
        require(amount > 0, "Amount must be > 0");
        _updatePool();

        UserInfo storage user = userInfo[msg.sender];

        // Coleta recompensas pendentes antes de alterar o saldo
        if (user.amount > 0) {
            uint256 pending = (user.amount * accRewardPerShare / 1e18) - user.rewardDebt;
            if (pending > 0) {
                rewardToken.safeTransfer(msg.sender, pending);
                emit RewardClaimed(msg.sender, pending);
            }
        }

        stakeToken.safeTransferFrom(msg.sender, address(this), amount);
        user.amount += amount;
        totalStaked += amount;
        user.rewardDebt = user.amount * accRewardPerShare / 1e18;

        emit Staked(msg.sender, amount);
    }

    function unstake(uint256 amount) external nonReentrant {
        UserInfo storage user = userInfo[msg.sender];
        require(user.amount >= amount, "Insufficient staked balance");
        
        _updatePool();

        uint256 pending = (user.amount * accRewardPerShare / 1e18) - user.rewardDebt;
        if (pending > 0) {
            rewardToken.safeTransfer(msg.sender, pending);
            emit RewardClaimed(msg.sender, pending);
        }

        user.amount -= amount;
        totalStaked -= amount;
        user.rewardDebt = user.amount * accRewardPerShare / 1e18;

        stakeToken.safeTransfer(msg.sender, amount);
        emit Unstaked(msg.sender, amount);
    }

    function claimReward() external nonReentrant {
        _updatePool();
        UserInfo storage user = userInfo[msg.sender];
        uint256 pending = (user.amount * accRewardPerShare / 1e18) - user.rewardDebt;
        require(pending > 0, "No reward to claim");
        user.rewardDebt = user.amount * accRewardPerShare / 1e18;
        rewardToken.safeTransfer(msg.sender, pending);
        emit RewardClaimed(msg.sender, pending);
    }

    function setRewardPerBlock(uint256 newRate) external onlyOwner {
        _updatePool();
        rewardPerBlock = newRate;
        emit RewardRateUpdated(newRate);
    }

    function fundRewards(uint256 amount) external onlyOwner {
        rewardToken.safeTransferFrom(msg.sender, address(this), amount);
    }

    function pause() external onlyOwner { _pause(); }
    function unpause() external onlyOwner { _unpause(); }
}
