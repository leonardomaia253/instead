import { ethers, network } from "hardhat";
import { readDeploymentManifest, writeDeploymentManifest } from "./deployment-manifest";

const NETWORK_TO_BOOK: Record<string, string> = {
  base: "Base",
  arbitrum: "Arbitrum",
  avalanche: "Avalanche",
  polygon: "Polygon",
  optimism: "Optimism",
  bsc: "BNB",
  mainnet: "Ethereum",
};

function requireEnv(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required`);
  return value;
}

function parseConstants(source: string, suffix: string) {
  const pattern = new RegExp(`address internal constant ([A-Z0-9_]+)_${suffix}\\s*=\\s*(0x[a-fA-F0-9]{40})`, "g");
  return Object.fromEntries([...source.matchAll(pattern)].map((match) => [match[1], match[2]]));
}

async function main() {
  const book = NETWORK_TO_BOOK[network.name];
  if (!book) throw new Error(`No Aave address book mapping for ${network.name}`);

  const adapterAddress = requireEnv("NEXT_PUBLIC_LENDING_POOL_ADDRESS");
  const url = `https://raw.githubusercontent.com/bgd-labs/aave-address-book/main/src/AaveV3${book}.sol`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Could not fetch ${url}: HTTP ${response.status}`);
  const source = await response.text();

  const underlying = parseConstants(source, "UNDERLYING");
  const aTokens = parseConstants(source, "A_TOKEN");
  const vTokens = parseConstants(source, "V_TOKEN");
  const symbols = Object.keys(underlying).filter((symbol) => aTokens[symbol] && vTokens[symbol]);

  if (symbols.length === 0) throw new Error(`No complete assets found for ${network.name}`);

  const adapter = await ethers.getContractAt("InsteadLendingPool", adapterAddress);
  const manifest = readDeploymentManifest(network.name) as { lendingAssets?: Array<{ symbol: string }> };
  const results = [...(manifest.lendingAssets ?? [])];
  const configured = new Set(results.map((item) => item.symbol));

  for (const symbol of symbols) {
    if (configured.has(symbol)) {
      console.log(`${network.name}: skipped ${symbol} already in manifest`);
      continue;
    }
    const tx = await adapter.configureAsset(underlying[symbol], aTokens[symbol], vTokens[symbol], true);
    const receipt = await tx.wait();
    results.push({
      symbol,
      asset: underlying[symbol],
      aToken: aTokens[symbol],
      variableDebtToken: vTokens[symbol],
      txHash: receipt?.hash ?? tx.hash,
    });
    writeDeploymentManifest(network.name, {
      lendingAssets: results,
    });
    console.log(`${network.name}: configured ${symbol} ${receipt?.hash ?? tx.hash}`);
  }

  const nextManifest = writeDeploymentManifest(network.name, {
    lendingAssets: results,
  });

  console.log(JSON.stringify({
    network: network.name,
    adapter: adapterAddress,
    count: results.length,
    configured: results,
    manifest: nextManifest,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
