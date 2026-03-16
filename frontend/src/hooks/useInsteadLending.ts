"use client";
import { useWriteContract, useReadContract, useWaitForTransactionReceipt, useAccount } from "wagmi";
import { parseEther, parseUnits } from "viem";
import { CONTRACTS, LENDING_POOL_ABI } from "@/lib/wagmi";
import { erc20Abi } from "viem";

/**
 * Hook principal do Lending Pool.
 * Encapsula aprovação de token e operações de depósito, colateral e borrow.
 */
export function useInsteadLending(assetAddress?: `0x${string}`) {
  const { address } = useAccount();
  const { writeContract, data: txHash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash: txHash });

  // Leitura de saldo de colateral do user
  const { data: userPosition } = useReadContract({
    address: CONTRACTS.LENDING_POOL,
    abi: LENDING_POOL_ABI,
    functionName: "userPositions",
    args: assetAddress && address ? [address, assetAddress] : undefined,
    query: { enabled: !!assetAddress && !!address },
  });

  const collateralBalance = userPosition ? (userPosition as any)[0] : 0n;
  const borrowBalance = userPosition ? (userPosition as any)[1] : 0n;

  async function approveAndDeposit(asset: `0x${string}`, amount: string, decimals = 18) {
    const amountBN = parseUnits(amount, decimals);
    // 1. Aprovar o LendingPool
    writeContract({
      address: asset,
      abi: erc20Abi,
      functionName: "approve",
      args: [CONTRACTS.LENDING_POOL, amountBN],
    });
    // Nota: Em uma implementação completa, aguardaria a aprovação concluir antes de depositar.
    // Use um useEffect monitorando isConfirmed para encadear as transações.
  }


  function depositCollateral(asset: `0x${string}`, amount: string, decimals = 18) {
    writeContract({
      address: CONTRACTS.LENDING_POOL,
      abi: LENDING_POOL_ABI,
      functionName: "depositCollateral",
      args: [asset, parseUnits(amount, decimals)],
    });
  }

  function borrow(asset: `0x${string}`, amount: string, decimals = 18) {
    writeContract({
      address: CONTRACTS.LENDING_POOL,
      abi: LENDING_POOL_ABI,
      functionName: "borrow",
      args: [asset, parseUnits(amount, decimals)],
    });
  }

  function withdrawCollateral(asset: `0x${string}`, amount: string, decimals = 18) {
    writeContract({
      address: CONTRACTS.LENDING_POOL,
      abi: LENDING_POOL_ABI,
      functionName: "withdrawCollateral",
      args: [asset, parseUnits(amount, decimals)],
    });
  }

  function repay(asset: `0x${string}`, amount: string, decimals = 18) {
    writeContract({
      address: CONTRACTS.LENDING_POOL,
      abi: LENDING_POOL_ABI,
      functionName: "repay",
      args: [asset, parseUnits(amount, decimals)],
    });
  }

  return {
    deposit: depositCollateral,
    depositCollateral,
    withdrawCollateral,
    borrow,
    repay,
    collateralBalance,
    borrowBalance,
    txHash,
    isPending,
    isConfirming,
    isConfirmed,
    error,
  };
}
