"use client";
import { useWriteContract, useReadContract, useWaitForTransactionReceipt } from "wagmi";
import { parseEther } from "ethers";
import { CONTRACTS, TOKEN_FACTORY_ABI } from "@/lib/wagmi";
import { insertGeneratedToken } from "@/lib/supabase";

const CHAIN_ID = parseInt(process.env.NEXT_PUBLIC_CHAIN_ID || "42161");

/**
 * Hook da Token Factory.
 * Orquestra a criação do token on-chain e a persistência dos metadados no Supabase.
 */
export function useTokenFactory() {
  const { writeContractAsync, isPending, error } = useWriteContract();
  const publicClient = (require("wagmi")).usePublicClient(); // Dynamic import or just add at top

  // Leitura ao vivo da taxa de criação em ETH (baseada no preço Chainlink do ETH/USD)
  const { data: feeInEth, refetch: refetchFee } = useReadContract({
    address: CONTRACTS.TOKEN_FACTORY,
    abi: TOKEN_FACTORY_ABI,
    functionName: "getCreationFeeInEth",
  });

  async function createToken(params: {
    name: string;
    symbol: string;
    initialSupply: bigint;
    maxSupply: bigint;
    isMintable: boolean;
    creatorWallet: string;
  }) {
    if (!feeInEth) throw new Error("Could not fetch creation fee");

    // Adiciona 5% de slippage ao fee para tolerar movimentos de preço do ETH
    const feeWithSlippage = (feeInEth * 105n) / 100n;

    const txHash = await writeContractAsync({
      address: CONTRACTS.TOKEN_FACTORY,
      abi: TOKEN_FACTORY_ABI,
      functionName: "createToken",
      args: [params.name, params.symbol, params.initialSupply, params.maxSupply, params.isMintable],
      value: feeWithSlippage,
    });

    // Aguarda o recibo para extrair o endereço real do token
    let tokenAddress = "pending";
    try {
      const { Interface } = await import("ethers");
      const iface = new Interface(TOKEN_FACTORY_ABI as any);
      const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
      
      for (const log of receipt.logs) {
        try {
          const parsed = iface.parseLog(log as any);
          if (parsed && parsed.name === "TokenCreated") {
            tokenAddress = parsed.args.tokenAddress;
            break;
          }
        } catch (e) { /* continue */ }
      }
    } catch (err) {
      console.error("Error parsing token address:", err);
    }

    // Persiste no Supabase com o endereço real (se encontrado)
    await insertGeneratedToken({
      token_address: tokenAddress,
      creator_wallet: params.creatorWallet,
      name: params.name,
      symbol: params.symbol,
      initial_supply: Number(params.initialSupply),
      max_supply: Number(params.maxSupply),
      mintable: params.isMintable,
      tx_hash: txHash,
      chain_id: CHAIN_ID,
    });

    return txHash;
  }

  return {
    createToken,
    feeInEth,
    refetchFee,
    isPending,
    error,
  };
}
