"use client";
import { useWriteContract, useReadContract, useWaitForTransactionReceipt, useAccount } from "wagmi";
import { parseEther, parseUnits } from "viem";
import { CONTRACTS, STAKING_ABI } from "@/lib/wagmi";
import { erc20Abi } from "viem";

/**
 * Hook para interagir com o InsteadStaking.
 */
export function useInsteadStaking() {
  const { address } = useAccount();
  const { writeContractAsync, data: txHash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash: txHash });

  // Leitura de informações do usuário (quantidade em stake)
  const { data: userInfo, refetch: refetchUserInfo } = useReadContract({
    address: CONTRACTS.STAKING,
    abi: STAKING_ABI,
    functionName: "userInfo",
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  // Leitura de recompensas pendentes
  const { data: pendingReward, refetch: refetchRewards } = useReadContract({
    address: CONTRACTS.STAKING,
    abi: STAKING_ABI,
    functionName: "pendingReward",
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  const stakedBalance = userInfo ? (userInfo as any)[0] : 0n;

  async function stake(amount: string, decimals = 18) {
    const amountBN = parseUnits(amount, decimals);
    return await writeContractAsync({
      address: CONTRACTS.STAKING,
      abi: STAKING_ABI,
      functionName: "stake",
      args: [amountBN],
    });
  }

  async function unstake(amount: string, decimals = 18) {
    const amountBN = parseUnits(amount, decimals);
    return await writeContractAsync({
      address: CONTRACTS.STAKING,
      abi: STAKING_ABI,
      functionName: "unstake",
      args: [amountBN],
    });
  }

  async function claimReward() {
    return await writeContractAsync({
      address: CONTRACTS.STAKING,
      abi: STAKING_ABI,
      functionName: "claimReward",
    });
  }

  return {
    stake,
    unstake,
    claimReward,
    stakedBalance,
    pendingReward: pendingReward as bigint | undefined,
    refetch: () => {
      refetchUserInfo();
      refetchRewards();
    },
    txHash,
    isPending,
    isConfirming,
    isConfirmed,
    error,
  };
}
