"use client";

import { useAccount, usePublicClient, useReadContract, useWaitForTransactionReceipt, useWriteContract } from "wagmi";
import { parseUnits } from "ethers";
import { AAVE_VARIABLE_DEBT_TOKEN_ABI, CONTRACTS, ERC20_ABI, LENDING_POOL_ABI, LENDING_ROUTER_ABI } from "@/lib/wagmi";

const ENABLE_PRODUCTION_LENDING = process.env.NEXT_PUBLIC_ENABLE_PRODUCTION_LENDING === "true";
const LENDING_DISABLED_MESSAGE =
  "Novas operações de crédito estão temporariamente indisponíveis. Tente novamente mais tarde ou fale com nosso atendimento.";

export function useInsteadLending(assetAddress?: `0x${string}`) {
  const { address } = useAccount();
  const { writeContract, writeContractAsync, data: txHash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash: txHash });
  const publicClient = usePublicClient();

  const { data: accountData } = useReadContract({
    address: CONTRACTS.LENDING_POOL,
    abi: LENDING_POOL_ABI,
    functionName: "getUserAccountData",
    args: address ? [address] : undefined,
    query: { enabled: !!address && !!CONTRACTS.LENDING_POOL },
  });

  const { data: aTokenAddress } = useReadContract({
    address: CONTRACTS.LENDING_POOL,
    abi: LENDING_POOL_ABI,
    functionName: "aTokenByAsset",
    args: assetAddress ? [assetAddress] : undefined,
    query: { enabled: !!assetAddress && !!CONTRACTS.LENDING_POOL },
  });

  const { data: variableDebtTokenAddress } = useReadContract({
    address: CONTRACTS.LENDING_POOL,
    abi: LENDING_POOL_ABI,
    functionName: "variableDebtTokenByAsset",
    args: assetAddress ? [assetAddress] : undefined,
    query: { enabled: !!assetAddress && !!CONTRACTS.LENDING_POOL },
  });

  const { data: borrowAllowance } = useReadContract({
    address: variableDebtTokenAddress as `0x${string}` | undefined,
    abi: AAVE_VARIABLE_DEBT_TOKEN_ABI,
    functionName: "borrowAllowance",
    args: address ? [address, CONTRACTS.LENDING_POOL] : undefined,
    query: { enabled: !!address && !!variableDebtTokenAddress && !!CONTRACTS.LENDING_POOL },
  });

  const collateralBalance = accountData ? (accountData as readonly bigint[])[0] : 0n;
  const borrowBalance = accountData ? (accountData as readonly bigint[])[1] : 0n;
  const availableBorrows = accountData ? (accountData as readonly bigint[])[2] : 0n;
  const healthFactor = accountData ? (accountData as readonly bigint[])[5] : 0n;

  function assertLendingEnabled() {
    if (!ENABLE_PRODUCTION_LENDING) {
      throw new Error(LENDING_DISABLED_MESSAGE);
    }
  }

  async function approveAndSupply(asset: `0x${string}`, amount: string, decimals = 18) {
    assertLendingEnabled();
    const amountBN = parseUnits(amount, decimals);
    const spender = CONTRACTS.LENDING_ROUTER || CONTRACTS.LENDING_POOL;

    const approveHash = await writeContractAsync({
      address: asset,
      abi: ERC20_ABI,
      functionName: "approve",
      args: [spender, amountBN],
    });
    await publicClient!.waitForTransactionReceipt({ hash: approveHash });

    if (CONTRACTS.LENDING_ROUTER) {
      return writeContractAsync({
        address: CONTRACTS.LENDING_ROUTER,
        abi: LENDING_ROUTER_ABI,
        functionName: "supply",
        args: [CONTRACTS.LENDING_POOL, asset, amountBN],
      });
    }

    return writeContractAsync({
      address: CONTRACTS.LENDING_POOL,
      abi: LENDING_POOL_ABI,
      functionName: "supply",
      args: [asset, amountBN],
    });
  }

  function supply(asset: `0x${string}`, amount: string, decimals = 18) {
    assertLendingEnabled();
    if (CONTRACTS.LENDING_ROUTER) {
      writeContract({
        address: CONTRACTS.LENDING_ROUTER,
        abi: LENDING_ROUTER_ABI,
        functionName: "supply",
        args: [CONTRACTS.LENDING_POOL, asset, parseUnits(amount, decimals)],
      });
      return;
    }
    writeContract({
      address: CONTRACTS.LENDING_POOL,
      abi: LENDING_POOL_ABI,
      functionName: "supply",
      args: [asset, parseUnits(amount, decimals)],
    });
  }

  function withdraw(asset: `0x${string}`, amount: string, decimals = 18) {
    assertLendingEnabled();
    if (CONTRACTS.LENDING_ROUTER) {
      writeContract({
        address: CONTRACTS.LENDING_ROUTER,
        abi: LENDING_ROUTER_ABI,
        functionName: "withdraw",
        args: [CONTRACTS.LENDING_POOL, asset, parseUnits(amount, decimals)],
      });
      return;
    }
    writeContract({
      address: CONTRACTS.LENDING_POOL,
      abi: LENDING_POOL_ABI,
      functionName: "withdraw",
      args: [asset, parseUnits(amount, decimals)],
    });
  }

  function borrow(asset: `0x${string}`, amount: string, decimals = 18) {
    assertLendingEnabled();
    if (CONTRACTS.LENDING_ROUTER) {
      writeContract({
        address: CONTRACTS.LENDING_ROUTER,
        abi: LENDING_ROUTER_ABI,
        functionName: "borrow",
        args: [CONTRACTS.LENDING_POOL, asset, parseUnits(amount, decimals)],
      });
      return;
    }
    writeContract({
      address: CONTRACTS.LENDING_POOL,
      abi: LENDING_POOL_ABI,
      functionName: "borrow",
      args: [asset, parseUnits(amount, decimals)],
    });
  }

  async function approveDelegationAndBorrow(asset: `0x${string}`, amount: string, decimals = 18) {
    assertLendingEnabled();
    const debtToken = variableDebtTokenAddress as `0x${string}` | undefined;
    if (!debtToken) throw new Error("Variable debt token is not configured for this asset.");
    const amountBN = parseUnits(amount, decimals);

    // Credit delegation must target the contract that will call Aave.borrow():
    // when the router is configured, borrow is routed through it, so delegate to the router.
    const borrowDelegatee = CONTRACTS.LENDING_ROUTER || CONTRACTS.LENDING_POOL;

    const delegationHash = await writeContractAsync({
      address: debtToken,
      abi: AAVE_VARIABLE_DEBT_TOKEN_ABI,
      functionName: "approveDelegation",
      args: [borrowDelegatee, amountBN],
    });
    await publicClient!.waitForTransactionReceipt({ hash: delegationHash });

    if (CONTRACTS.LENDING_ROUTER) {
      return writeContractAsync({
        address: CONTRACTS.LENDING_ROUTER,
        abi: LENDING_ROUTER_ABI,
        functionName: "borrow",
        args: [CONTRACTS.LENDING_POOL, asset, amountBN],
      });
    }

    return writeContractAsync({
      address: CONTRACTS.LENDING_POOL,
      abi: LENDING_POOL_ABI,
      functionName: "borrow",
      args: [asset, amountBN],
    });
  }

  async function approveAndRepay(asset: `0x${string}`, amount: string, decimals = 18) {
    assertLendingEnabled();
    const amountBN = parseUnits(amount, decimals);
    const spender = CONTRACTS.LENDING_ROUTER || CONTRACTS.LENDING_POOL;

    const approveHash = await writeContractAsync({
      address: asset,
      abi: ERC20_ABI,
      functionName: "approve",
      args: [spender, amountBN],
    });
    await publicClient!.waitForTransactionReceipt({ hash: approveHash });

    if (CONTRACTS.LENDING_ROUTER) {
      return writeContractAsync({
        address: CONTRACTS.LENDING_ROUTER,
        abi: LENDING_ROUTER_ABI,
        functionName: "repay",
        args: [CONTRACTS.LENDING_POOL, asset, amountBN],
      });
    }

    return writeContractAsync({
      address: CONTRACTS.LENDING_POOL,
      abi: LENDING_POOL_ABI,
      functionName: "repay",
      args: [asset, amountBN],
    });
  }

  function repay(asset: `0x${string}`, amount: string, decimals = 18) {
    assertLendingEnabled();
    if (CONTRACTS.LENDING_ROUTER) {
      writeContract({
        address: CONTRACTS.LENDING_ROUTER,
        abi: LENDING_ROUTER_ABI,
        functionName: "repay",
        args: [CONTRACTS.LENDING_POOL, asset, parseUnits(amount, decimals)],
      });
      return;
    }
    writeContract({
      address: CONTRACTS.LENDING_POOL,
      abi: LENDING_POOL_ABI,
      functionName: "repay",
      args: [asset, parseUnits(amount, decimals)],
    });
  }

  return {
    deposit: approveAndSupply,
    depositCollateral: approveAndSupply,
    supply,
    approveAndSupply,
    withdrawCollateral: withdraw,
    withdraw,
    borrow,
    approveDelegationAndBorrow,
    repay,
    approveAndRepay,
    collateralBalance,
    borrowBalance,
    availableBorrows,
    healthFactor,
    borrowAllowance: (borrowAllowance ?? 0n) as bigint,
    aTokenAddress: (aTokenAddress ?? null) as `0x${string}` | null,
    variableDebtTokenAddress: (variableDebtTokenAddress ?? null) as `0x${string}` | null,
    isLendingEnabled: ENABLE_PRODUCTION_LENDING,
    disabledReason: ENABLE_PRODUCTION_LENDING ? null : LENDING_DISABLED_MESSAGE,
    txHash,
    isPending,
    isConfirming,
    isConfirmed,
    error,
  };
}
