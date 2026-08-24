"use client";
import { useChainId, usePublicClient, useWriteContract, useReadContract } from "wagmi";
import { CONTRACTS, TOKEN_FACTORY_ABI } from "@/lib/wagmi";
import { enqueueReconciliation, insertAudit, insertGeneratedToken } from "@/lib/supabase";

/**
 * Hook da Token Factory.
 * Orquestra a criação do token on-chain e a persistência dos metadados no Supabase.
 */
export function useTokenFactory() {
  const { writeContractAsync, isPending, error } = useWriteContract();
  const publicClient = usePublicClient();
  const chainId = useChainId();

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
    isTaxable?: boolean;
    taxBPS?: bigint;
    hasBlacklist?: boolean;
    creatorWallet: string;
  }) {
    if (!feeInEth) throw new Error("Não foi possível consultar a taxa de publicação. Tente novamente em instantes.");
    if (!chainId) throw new Error("Escolha uma rede na carteira antes de publicar o ativo.");

    // Adiciona 5% de slippage ao fee para tolerar movimentos de preço do ETH
    const feeWithSlippage = (feeInEth * 105n) / 100n;

    const txHash = await writeContractAsync({
      address: CONTRACTS.TOKEN_FACTORY,
      abi: TOKEN_FACTORY_ABI,
      functionName: "createToken",
      args: [
        params.name,
        params.symbol,
        params.initialSupply,
        params.maxSupply,
        params.isMintable,
        params.isTaxable ?? false,
        params.taxBPS ?? 0n,
        params.hasBlacklist ?? false,
      ],
      value: feeWithSlippage,
    });

    // Aguarda o recibo para extrair o endereço real do token
    let tokenAddress: string | null = null;
    try {
      const { Interface } = await import("ethers");
      const iface = new Interface(TOKEN_FACTORY_ABI as any);
      const receipt = await publicClient!.waitForTransactionReceipt({ hash: txHash });
      
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
    if (!tokenAddress) throw new Error("TokenCreated event not found; token address was not persisted");

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
      chain_id: chainId,
    });

    const operationId = `${params.creatorWallet.toLowerCase()}:CREATE_TOKEN:${txHash.toLowerCase()}`;
    await insertAudit({
      user_wallet: params.creatorWallet,
      action: "CREATE_TOKEN",
      operation_id: operationId,
      tx_hash: txHash,
      chain_id: chainId,
      status: "confirmed",
      metadata: {
        token_address: tokenAddress,
        name: params.name,
        symbol: params.symbol,
        tx_hash: txHash,
        chain_id: chainId,
        mintable: params.isMintable,
        taxable: params.isTaxable ?? false,
        tax_bps: Number(params.taxBPS ?? 0n),
      },
    });

    await enqueueReconciliation({
      operation_id: operationId,
      user_wallet: params.creatorWallet,
      vertical: "token_factory",
      action: "CREATE_TOKEN",
      tx_hash: txHash,
      chain_id: chainId,
      expected_state: {
        token_address: tokenAddress,
        name: params.name,
        symbol: params.symbol,
        initial_supply: params.initialSupply.toString(),
        max_supply: params.maxSupply.toString(),
        mintable: params.isMintable,
        taxable: params.isTaxable ?? false,
        tax_bps: (params.taxBPS ?? 0n).toString(),
      },
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
