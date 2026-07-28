import { existsSync, readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

function parseEnvFile(path) {
  if (!existsSync(path)) return {};
  return Object.fromEntries(
    readFileSync(path, "utf8")
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#") && line.includes("="))
      .map((line) => {
        const index = line.indexOf("=");
        return [line.slice(0, index), line.slice(index + 1).replace(/^["']|["']$/g, "")];
      }),
  );
}

const fileEnv = parseEnvFile(resolve(process.cwd(), "frontend/.env.local"));
const env = { ...process.env, ...fileEnv };
const target = env.PRODUCTION_TARGET ?? "all";
const evmNetwork = env.DEPLOYMENT_NETWORK;
const failures = [];
const warnings = [];

function run(label, command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: process.cwd(),
    env: { ...env, ...(options.env ?? {}) },
    shell: process.platform === "win32",
    encoding: "utf8",
    timeout: options.timeout ?? 180_000,
  });
  if (result.status !== 0) {
    failures.push(`${label} failed:\n${(result.stdout ?? "").slice(-1500)}${(result.stderr ?? "").slice(-2500)}`);
  }
}

function requireEnv(name, options = {}) {
  const value = env[name];
  if (!value) {
    failures.push(`${name} is required`);
    return "";
  }
  if (options.evmAddress && !/^0x[a-fA-F0-9]{40}$/.test(value)) failures.push(`${name} must be an EVM address`);
  if (options.solanaPublicKey && !/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(value)) {
    failures.push(`${name} must be a Solana base58 public key`);
  }
  if (options.https && !/^https:\/\/[^\s]+$/i.test(value)) failures.push(`${name} must be an HTTPS URL`);
  return value;
}

function requireFile(path) {
  if (!existsSync(resolve(process.cwd(), path))) failures.push(`${path} is required`);
}

function commandInstalled(command, args = ["--version"]) {
  return spawnSync(command, args, { shell: process.platform === "win32", encoding: "utf8" }).status === 0;
}

function wslSolanaToolchainInstalled() {
  if (process.platform !== "win32") return false;
  const result = spawnSync(
    "pnpm",
    ["solana:wsl:versions"],
    { shell: true, encoding: "utf8", timeout: 120_000 },
  );
  return result.status === 0;
}

function hasRealExternalAudit() {
  const auditPath = resolve(process.cwd(), "SMART_CONTRACT_SECURITY_AUDIT.md");
  if (!existsSync(auditPath)) return false;
  const audit = readFileSync(auditPath, "utf8");
  return /External Audit:\s*(Complete|Completed|Passed)/i.test(audit);
}

run("address config", "pnpm", ["addresses:check"], { timeout: 60_000 });
run("UX production check", "pnpm", ["ux:check"], { timeout: 60_000 });
run("secret scan", "pnpm", ["secrets:check"], { timeout: 60_000 });
run("production readiness", "pnpm", ["readiness"], { timeout: 120_000 });

if (target === "all" || target === "evm") {
  if (!evmNetwork) {
    failures.push("DEPLOYMENT_NETWORK is required for EVM production gate");
  } else {
    requireEnv("DEPLOYMENT_RPC_URL", { https: true });
    requireEnv("PRODUCTION_MULTISIG_ADDRESS", { evmAddress: true });
    requireFile(`deployments/${evmNetwork}.json`);
    run("deployment manifest verification", "pnpm", ["deployments:verify"], { timeout: 120_000 });
    run("ownership verification", "pnpm", ["ownership:verify"], { timeout: 120_000 });
  }
  run("contracts test suite", "pnpm", ["contracts:test"], { timeout: 180_000 });
  if (env.REQUIRE_LENDING_FORK_TEST === "true" || env.NEXT_PUBLIC_ENABLE_PRODUCTION_LENDING === "true") {
    requireEnv("HARDHAT_FORK_RPC_URL", { https: true });
    run("lending fork test", "pnpm", ["contracts:test:fork"], { timeout: 240_000 });
  } else {
    warnings.push("Lending fork test is not enforced because lending production flags are disabled");
  }
}

if (target === "all" || target === "solana") {
  requireEnv("SOLANA_RPC_URL", { https: true });
  requireEnv("NEXT_PUBLIC_SOLANA_FACTORY_PROGRAM_ID", { solanaPublicKey: true });
  run("Solana config", "pnpm", ["solana:check"], { timeout: 60_000 });

  const nativeToolchainInstalled = commandInstalled("anchor") && commandInstalled("solana") && commandInstalled("cargo");
  const wslToolchainInstalled = wslSolanaToolchainInstalled();
  if (!nativeToolchainInstalled && !wslToolchainInstalled) {
    failures.push("Solana toolchain is required: install Anchor CLI, Solana CLI and Rust/Cargo natively or in WSL Ubuntu-22.04");
  }
  if (nativeToolchainInstalled) {
    run("Solana Anchor build", "pnpm", ["solana:build"], { timeout: 240_000 });
    run("Solana Anchor tests", "pnpm", ["solana:test"], { timeout: 300_000 });
  } else if (wslToolchainInstalled) {
    run("Solana Anchor build", "pnpm", ["solana:wsl:build"], { timeout: 600_000 });
    warnings.push("Solana Anchor tests require a local validator flow; WSL build was enforced");
  }
}

if (env.REQUIRE_EXTERNAL_AUDIT === "true" && !hasRealExternalAudit()) {
  failures.push("External audit is required but SMART_CONTRACT_SECURITY_AUDIT.md does not declare `External Audit: Complete`");
}

if (env.APP_ORIGIN) {
  run("production smoke", "pnpm", ["smoke:test"], { timeout: 120_000 });
} else {
  warnings.push("APP_ORIGIN not set; skipped production smoke");
}

if (failures.length > 0) {
  console.error("Production gate failed:");
  for (const failure of failures) console.error(`\n- ${failure}`);
  if (warnings.length > 0) {
    console.error("\nWarnings:");
    for (const warning of warnings) console.error(`- ${warning}`);
  }
  process.exit(1);
}

console.log("Production gate passed.");
if (warnings.length > 0) {
  console.log("Warnings:");
  for (const warning of warnings) console.log(`- ${warning}`);
}
