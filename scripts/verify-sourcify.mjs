import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

const SOURCIFY_API = process.env.SOURCIFY_API_URL ?? "https://sourcify.dev/server";

const CHAIN_IDS = {
  mainnet: 1,
  optimism: 10,
  bsc: 56,
  polygon: 137,
  base: 8453,
  arbitrum: 42161,
  avalanche: 43114,
  sepolia: 11155111,
  baseSepolia: 84532,
  arbitrumSepolia: 421614,
  optimismSepolia: 11155420,
};

const CONTRACT_ARTIFACTS = {
  tokenFactory: {
    path: "artifacts/contracts/TokenFactory.sol/InsteadTokenFactory.json",
    address: (manifest) => manifest.tokenFactory?.address,
  },
  lendingImplementation: {
    path: "artifacts/contracts/InsteadLendingPool.sol/InsteadLendingPool.json",
    address: (manifest) => manifest.lending?.implementation,
  },
  lendingProxy: {
    path: "artifacts/contracts/InsteadERC1967Proxy.sol/InsteadERC1967Proxy.json",
    address: (manifest) => manifest.lending?.proxy,
  },
  lendingRouterImplementation: {
    path: "artifacts/contracts/InsteadLendingRouter.sol/InsteadLendingRouter.json",
    address: (manifest) => manifest.lendingRouter?.implementation,
  },
  lendingRouterProxy: {
    path: "artifacts/contracts/InsteadERC1967Proxy.sol/InsteadERC1967Proxy.json",
    address: (manifest) => manifest.lendingRouter?.proxy,
  },
};

const network = process.env.DEPLOYMENT_NETWORK ?? process.argv[2];
if (!network) {
  console.error("DEPLOYMENT_NETWORK or network argument is required.");
  process.exit(1);
}

const chainId = Number(process.env.DEPLOYMENT_CHAIN_ID ?? CHAIN_IDS[network]);
if (!chainId) {
  console.error(`Unsupported network for Sourcify verification: ${network}`);
  process.exit(1);
}

const manifestPath = resolve(process.cwd(), "deployments", `${network}.json`);
if (!existsSync(manifestPath)) {
  console.error(`Deployment manifest not found: ${manifestPath}`);
  process.exit(1);
}

const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));

function readJson(path) {
  const fullPath = resolve(process.cwd(), path);
  if (!existsSync(fullPath)) throw new Error(`Missing artifact: ${path}`);
  return JSON.parse(readFileSync(fullPath, "utf8"));
}

function artifactFiles(artifactPath) {
  const artifact = readJson(artifactPath);
  const dbgPath = artifactPath.replace(/\.json$/, ".dbg.json");
  const debugArtifact = readJson(dbgPath);
  const buildInfoPath = resolve(process.cwd(), dirname(dbgPath), debugArtifact.buildInfo);
  const buildInfo = JSON.parse(readFileSync(buildInfoPath, "utf8"));
  return {
    stdJsonInput: buildInfo.input,
    compilerVersion: buildInfo.solcLongVersion ?? buildInfo.solcVersion,
    contractIdentifier: `${artifact.sourceName}:${artifact.contractName}`,
  };
}

async function checkAlreadyVerified(address) {
  const response = await fetch(`${SOURCIFY_API}/v2/contract/${chainId}/${address}`);
  if (!response.ok) return false;
  const body = await response.json();
  return Boolean(body?.match);
}

async function pollVerification(verificationId) {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    const response = await fetch(`${SOURCIFY_API}/v2/verify/${verificationId}`);
    const body = await response.json().catch(() => ({}));
    if (!response.ok) return { status: "poll_failed", httpStatus: response.status, body };
    const status = body?.status ?? body?.job?.status;
    if (["perfect", "partial", "match", "verified", "success", "error", "failed"].includes(status)) return body;
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 2_000));
  }
  return { status: "timeout" };
}

async function verify(label, address, artifactPath) {
  if (!/^0x[a-fA-F0-9]{40}$/.test(String(address ?? ""))) return { label, status: "skipped", reason: "missing address" };

  if (await checkAlreadyVerified(address)) {
    return { label, address, status: "already_verified" };
  }

  const payload = artifactFiles(artifactPath);
  const response = await fetch(`${SOURCIFY_API}/v2/verify/${chainId}/${address}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const text = await response.text();
  let body = null;
  try {
    body = JSON.parse(text);
  } catch {
    body = { message: text.slice(0, 500) };
  }

  if (!response.ok) {
    return { label, address, status: "failed", httpStatus: response.status, body };
  }

  const verificationId = body?.verificationId;
  if (!verificationId) return { label, address, status: "submitted", body };
  return { label, address, status: "submitted", verificationId, result: await pollVerification(verificationId) };
}

const results = [];
for (const [label, target] of Object.entries(CONTRACT_ARTIFACTS)) {
  results.push(await verify(label, target.address(manifest), target.path));
}

console.log(JSON.stringify({ network, chainId, sourcifyApi: SOURCIFY_API, results }, null, 2));

const failed = results.filter((result) => result.status === "failed" || result.result?.status === "failed" || result.result?.status === "error");
if (failed.length > 0) process.exit(1);
