import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import { Interface, JsonRpcProvider, Wallet, formatEther, parseEther } from "ethers";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
dotenv.config({ path: resolve(root, "frontend/.env.local") });
dotenv.config({ path: resolve(root, ".env") });

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !supabaseServiceKey) throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required");

const supabase = createClient(supabaseUrl, supabaseServiceKey, { auth: { persistSession: false } });

const FACTORY_ABI = [
  "function getCreationFeeInEth() view returns (uint256)",
  "function createTokenFor(string name,string symbol,uint256 initialSupply,uint256 maxSupply,bool isMintable,bool isTaxable,uint256 taxBPS,bool hasBlacklist,bool burnTax,uint256 maxWalletBPS,address owner) payable returns (address)",
  "function createFairLaunchTokenETHFor(string name,string symbol,uint256 supply,uint256 minTokenAmount,uint256 minEthAmount,address owner,address lpRecipient,uint256 deadline) payable returns (address,uint256)",
  "event TokenCreated(address indexed tokenAddress,address indexed creator,string name,string symbol,uint256 initialSupply,uint256 maxSupply,bool mintable,bool taxable,uint256 taxBPS,bool burnTax,uint256 maxWalletBPS,uint256 feePaid)",
];
const factoryInterface = new Interface(FACTORY_ABI);
const GAS_BUFFER_BPS = BigInt(process.env.ASSISTED_DEPLOY_GAS_BUFFER_BPS ?? 2500);

class InsufficientRelayerBalanceError extends Error {
  constructor(message) {
    super(message);
    this.name = "InsufficientRelayerBalanceError";
    this.retryable = true;
  }
}

function rpcUrlFor(chainId) {
  const map = {
    1: process.env.MAINNET_RPC_URL,
    56: process.env.BSC_RPC_URL,
    137: process.env.POLYGON_RPC_URL,
    42161: process.env.ARBITRUM_RPC_URL,
    43114: process.env.AVALANCHE_RPC_URL,
    8453: process.env.BASE_RPC_URL,
    10: process.env.OPTIMISM_RPC_URL,
  };
  return map[chainId] || process.env.DEPLOYMENT_RPC_URL;
}

async function mark(id, patch) {
  const { error } = await supabase
    .from("assisted_token_deployments")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

async function requireRelayerBalance({ provider, relayer, txRequest, requiredValue }) {
  const [balance, feeData] = await Promise.all([
    provider.getBalance(relayer.address),
    provider.getFeeData(),
  ]);
  const gasLimit = await relayer.estimateGas(txRequest);
  const gasPrice = feeData.maxFeePerGas ?? feeData.gasPrice;
  if (!gasPrice) throw new Error("Unable to estimate gas price for assisted deploy");
  const gasBudget = (gasLimit * gasPrice * (10_000n + GAS_BUFFER_BPS)) / 10_000n;
  const required = requiredValue + gasBudget;
  if (balance < required) {
    throw new InsufficientRelayerBalanceError(
      `Insufficient relayer balance on chain: ${formatEther(balance)} native available, ${formatEther(required)} native required`,
    );
  }
}

async function executeJobWithEthers(job) {
  const rpcUrl = rpcUrlFor(job.chain_id);
  if (!rpcUrl) throw new Error(`No RPC URL configured for chain ${job.chain_id}`);
  const privateKey = process.env.ASSISTED_DEPLOYER_PRIVATE_KEY || process.env.DEPLOYER_PRIVATE_KEY;
  if (!privateKey) throw new Error("ASSISTED_DEPLOYER_PRIVATE_KEY or DEPLOYER_PRIVATE_KEY is required");

  const provider = new JsonRpcProvider(rpcUrl);
  const relayer = new Wallet(privateKey, provider);
  const { Contract } = await import("ethers");
  const factory = new Contract(job.factory_address, FACTORY_ABI, relayer);

  await mark(job.id, {
    status: "executing",
    attempts: Number(job.attempts ?? 0) + 1,
    relayer_wallet: relayer.address.toLowerCase(),
    error_message: null,
  });

  const fee = await factory.getCreationFeeInEth();
  const feeWithBuffer = (fee * 110n) / 100n;
  const isFairLaunch = job.metadata?.token_template === "fair_launch";
  const liquidityEth = isFairLaunch ? parseEther(String(job.metadata?.liquidity_eth || "0")) : 0n;
  if (isFairLaunch && liquidityEth <= 0n) throw new Error("Fair launch assisted deploy requires liquidity_eth");
  const deadline = BigInt(Math.floor(Date.now() / 1000) + 1800);
  const txRequest = isFairLaunch
    ? await factory.createFairLaunchTokenETHFor.populateTransaction(
        job.token_name,
        job.token_symbol,
        BigInt(job.initial_supply),
        BigInt(job.initial_supply) * 10n ** 18n,
        liquidityEth,
        job.wallet_address,
        job.wallet_address,
        deadline,
        { value: feeWithBuffer + liquidityEth },
      )
    : await factory.createTokenFor.populateTransaction(
        job.token_name,
        job.token_symbol,
        BigInt(job.initial_supply),
        BigInt(job.max_supply),
        Boolean(job.mintable),
        Boolean(job.taxable),
        BigInt(job.tax_bps),
        Boolean(job.has_blacklist),
        Boolean(job.burn_tax),
        BigInt(job.max_wallet_bps),
        job.wallet_address,
        { value: feeWithBuffer },
      );
  await requireRelayerBalance({
    provider,
    relayer,
    txRequest,
    requiredValue: isFairLaunch ? feeWithBuffer + liquidityEth : feeWithBuffer,
  });

  const tx = isFairLaunch
    ? await factory.createFairLaunchTokenETHFor(
        job.token_name,
        job.token_symbol,
        BigInt(job.initial_supply),
        BigInt(job.initial_supply) * 10n ** 18n,
        liquidityEth,
        job.wallet_address,
        job.wallet_address,
        deadline,
        { value: feeWithBuffer + liquidityEth },
      )
    : await factory.createTokenFor(
        job.token_name,
        job.token_symbol,
        BigInt(job.initial_supply),
        BigInt(job.max_supply),
        Boolean(job.mintable),
        Boolean(job.taxable),
        BigInt(job.tax_bps),
        Boolean(job.has_blacklist),
        Boolean(job.burn_tax),
        BigInt(job.max_wallet_bps),
        job.wallet_address,
        { value: feeWithBuffer },
      );

  await mark(job.id, { tx_hash: tx.hash, status: "executing" });
  const receipt = await tx.wait();
  let tokenAddress = null;
  for (const log of receipt.logs ?? []) {
    try {
      const parsed = factoryInterface.parseLog(log);
      if (parsed?.name === "TokenCreated") {
        tokenAddress = String(parsed.args.tokenAddress);
        break;
      }
    } catch {
      // Ignore unrelated logs.
    }
  }
  if (!tokenAddress) throw new Error("TokenCreated event not found");

  await supabase.from("generated_tokens").upsert({
    token_address: tokenAddress.toLowerCase(),
    creator_wallet: job.wallet_address.toLowerCase(),
    name: job.token_name,
    symbol: job.token_symbol,
    initial_supply: Number(job.initial_supply),
    max_supply: Number(job.max_supply),
    mintable: Boolean(job.mintable),
    token_template: job.metadata?.token_template ?? "standard",
    launch_mode: isFairLaunch ? "fair_launch" : "assisted",
    taxable: Boolean(job.taxable),
    tax_bps: Number(job.tax_bps),
    burn_tax: Boolean(job.burn_tax),
    max_wallet_bps: Number(job.max_wallet_bps),
    liquidity_eth: isFairLaunch ? String(job.metadata?.liquidity_eth || "0") : null,
    lp_recipient: isFairLaunch ? job.wallet_address.toLowerCase() : null,
    tx_hash: tx.hash,
    chain_id: Number(job.chain_id),
    payment_intent_id: job.payment_intent_id,
  }, { onConflict: "tx_hash,chain_id" });

  await supabase.from("audits").upsert({
    user_wallet: job.wallet_address.toLowerCase(),
    action: "CREATE_TOKEN",
    operation_id: `${job.wallet_address.toLowerCase()}:ASSISTED_CREATE_TOKEN:${tx.hash.toLowerCase()}`,
    tx_hash: tx.hash,
    chain_id: Number(job.chain_id),
    status: "confirmed",
    metadata: {
      name: job.token_name,
      symbol: job.token_symbol,
      token_address: tokenAddress.toLowerCase(),
      payment_intent_id: job.payment_intent_id,
      relayer_wallet: relayer.address.toLowerCase(),
      assisted: true,
    },
  }, { onConflict: "operation_id" });

  await mark(job.id, {
    status: "confirmed",
    token_address: tokenAddress.toLowerCase(),
    tx_hash: tx.hash,
  });
}

async function main() {
  const limit = Number(process.env.ASSISTED_DEPLOY_BATCH_SIZE ?? 3);
  const { data, error } = await supabase
    .from("assisted_token_deployments")
    .select("*")
    .eq("status", "queued")
    .lte("next_attempt_at", new Date().toISOString())
    .order("created_at", { ascending: true })
    .limit(limit);
  if (error) throw error;

  console.log(`Found ${data?.length ?? 0} assisted token deployment(s).`);
  for (const job of data ?? []) {
    try {
      await executeJobWithEthers(job);
      console.log(`Confirmed assisted deploy ${job.id}`);
    } catch (error) {
      const attempts = Number(job.attempts ?? 0) + 1;
      const isBalanceRetry = error instanceof InsufficientRelayerBalanceError;
      const retryMinutes = isBalanceRetry ? 15 : Math.min(60, attempts * 10);
      const retryAt = new Date(Date.now() + retryMinutes * 60_000).toISOString();
      await mark(job.id, {
        status: isBalanceRetry || attempts < 3 ? "queued" : "failed",
        attempts,
        error_message: error instanceof Error ? error.message : String(error),
        next_attempt_at: retryAt,
      });
      console.error(`Failed assisted deploy ${job.id}:`, error);
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
