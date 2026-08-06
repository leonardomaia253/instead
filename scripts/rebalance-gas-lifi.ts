import { ethers, network } from "hardhat";

const NATIVE = "0x0000000000000000000000000000000000000000";
const LIFI_QUOTE_URL = "https://li.quest/v1/quote";
const ALLOWED_TO = new Set([
  "0x1231deb6f5749ef6ce6943a275a1d3e7486f4eae", // LI.FI diamond / GasZip route target
]);

const CHAIN_IDS: Record<string, number> = {
  mainnet: 1,
  optimism: 10,
  bsc: 56,
  polygon: 137,
  base: 8453,
  arbitrum: 42161,
  avalanche: 43114,
};

function requireEnv(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required`);
  return value;
}

function optionalEnv(name: string, fallback: string) {
  return process.env[name] || fallback;
}

async function getQuote(params: Record<string, string>) {
  const url = new URL(LIFI_QUOTE_URL);
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);

  const response = await fetch(url, { headers: { Accept: "application/json" } });
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(`LI.FI quote failed: ${JSON.stringify(payload)}`);
  }
  return payload;
}

async function main() {
  const fromChain = CHAIN_IDS[network.name];
  if (!fromChain) throw new Error(`Unsupported source network: ${network.name}`);

  const [signer] = await ethers.getSigners();
  const toChain = Number(requireEnv("REBALANCE_TO_CHAIN"));
  const fromAmount = requireEnv("REBALANCE_FROM_AMOUNT_WEI");
  const toAddress = optionalEnv("REBALANCE_TO_ADDRESS", signer.address);
  const dryRun = process.env.REBALANCE_DRY_RUN !== "false";

  const quote = await getQuote({
    fromChain: String(fromChain),
    toChain: String(toChain),
    fromToken: NATIVE,
    toToken: NATIVE,
    fromAmount,
    fromAddress: signer.address,
    toAddress,
  });

  const txRequest = quote.transactionRequest;
  if (!txRequest) throw new Error("LI.FI quote did not include transactionRequest");
  if (String(quote.action?.fromToken?.address).toLowerCase() !== NATIVE) throw new Error("Only native source token is allowed");
  if (String(quote.action?.toToken?.address).toLowerCase() !== NATIVE) throw new Error("Only native destination token is allowed");
  if (Number(quote.action?.fromChainId) !== fromChain) throw new Error("Quote source chain mismatch");
  if (Number(quote.action?.toChainId) !== toChain) throw new Error("Quote destination chain mismatch");
  if (String(quote.action?.fromAddress).toLowerCase() !== signer.address.toLowerCase()) throw new Error("Quote fromAddress mismatch");
  if (String(quote.action?.toAddress).toLowerCase() !== toAddress.toLowerCase()) throw new Error("Quote toAddress mismatch");
  if (String(txRequest.from).toLowerCase() !== signer.address.toLowerCase()) throw new Error("Transaction from mismatch");
  if (Number(txRequest.chainId) !== fromChain) throw new Error("Transaction chainId mismatch");
  if (!ALLOWED_TO.has(String(txRequest.to).toLowerCase())) throw new Error(`Transaction target is not allowlisted: ${txRequest.to}`);

  const balance = await ethers.provider.getBalance(signer.address);
  const value = BigInt(txRequest.value || "0");
  const gasLimit = BigInt(txRequest.gasLimit || "0");
  const gasPrice = BigInt(txRequest.gasPrice || "0");
  const required = value + gasLimit * gasPrice;
  if (balance < required) {
    throw new Error(`Insufficient source balance: have ${ethers.formatEther(balance)}, need ${ethers.formatEther(required)}`);
  }

  const summary = {
    dryRun,
    network: network.name,
    from: signer.address,
    toAddress,
    tool: quote.tool,
    fromChain,
    toChain,
    fromAmount,
    toAmount: quote.estimate?.toAmount,
    toAmountMin: quote.estimate?.toAmountMin,
    toSymbol: quote.action?.toToken?.symbol,
    fromAmountUSD: quote.estimate?.fromAmountUSD,
    toAmountUSD: quote.estimate?.toAmountUSD,
    txTo: txRequest.to,
    txValue: txRequest.value,
    gasLimit: txRequest.gasLimit,
    gasPrice: txRequest.gasPrice,
  };
  console.log(JSON.stringify(summary, null, 2));

  if (dryRun) return;

  const tx = await signer.sendTransaction({
    to: txRequest.to,
    data: txRequest.data,
    value,
    gasLimit,
    gasPrice,
  });
  console.log(`rebalance_tx=${tx.hash}`);
  const receipt = await tx.wait();
  console.log(`rebalance_status=${receipt?.status}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
