import { existsSync, readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { mergeEnv, parseEnvFile as parseSharedEnvFile } from "./lib/supabase-env.mjs";

function parseEnvFile(path) {
  return parseSharedEnvFile(path);
}

const fileEnv = parseEnvFile(resolve(process.cwd(), "frontend/.env.local"));
const env = mergeEnv(process.env, fileEnv);
const target = env.PRODUCTION_TARGET ?? "all";
const evmNetwork = env.DEPLOYMENT_NETWORK;
const requireSolanaProduction = env.REQUIRE_SOLANA_PRODUCTION === "true" || target === "solana";
const failures = [];
const warnings = [];

function commandInvocation(command, args) {
  if (command === "pnpm" && process.env.npm_execpath) {
    return { command: process.execPath, args: [process.env.npm_execpath, ...args] };
  }
  if (command === "pnpm" && process.platform === "win32") {
    return { command: "pnpm.cmd", args };
  }
  return { command, args };
}

function run(label, command, args, options = {}) {
  const invocation = commandInvocation(command, args);
  const result = spawnSync(invocation.command, invocation.args, {
    cwd: process.cwd(),
    env: { ...env, ...(options.env ?? {}) },
    encoding: "utf8",
    timeout: options.timeout ?? 180_000,
  });
  if (result.status !== 0) {
    failures.push(`${label} failed:\n${(result.stdout ?? "").slice(-1500)}${(result.stderr ?? "").slice(-2500)}`);
  }
}

function failNow() {
  if (failures.length === 0) return;
  console.error("Production gate failed:");
  for (const failure of failures) console.error(`\n- ${failure}`);
  if (warnings.length > 0) {
    console.error("\nWarnings:");
    for (const warning of warnings) console.error(`- ${warning}`);
  }
  process.exit(1);
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
  const invocation = commandInvocation(command, args);
  return spawnSync(invocation.command, invocation.args, { encoding: "utf8" }).status === 0;
}

function wslSolanaToolchainInstalled() {
  if (process.platform !== "win32") return false;
  const invocation = commandInvocation("pnpm", ["solana:wsl:versions"]);
  const result = spawnSync(invocation.command, invocation.args, { encoding: "utf8", timeout: 120_000 });
  return result.status === 0;
}

function hasRealExternalAudit() {
  const auditPath = resolve(process.cwd(), "SMART_CONTRACT_SECURITY_AUDIT.md");
  if (!existsSync(auditPath)) return false;
  const audit = readFileSync(auditPath, "utf8");
  const statusLine = audit
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find((line) => /^External Audit:/i.test(line));
  if (!statusLine) return false;
  const status = statusLine.replace(/^External Audit:\s*/i, "").trim().toLowerCase();
  return ["complete", "completed", "passed"].includes(status);
}

run("address config", "pnpm", ["addresses:check"], { timeout: 60_000 });
run("workspace hygiene", "pnpm", ["workspace:hygiene"], { timeout: 60_000 });
run("performance budget check", "pnpm", ["performance:check"], { timeout: 60_000 });
run("UX production check", "pnpm", ["ux:check"], { timeout: 60_000 });
run("mobile config check", "pnpm", ["mobile:check"], { timeout: 60_000 });
run("secret scan", "pnpm", ["secrets:check"], { timeout: 60_000 });
run("API security check", "pnpm", ["api:security"], { timeout: 60_000 });
run("Edge Function contract check", "pnpm", ["edge:functions:check"], { timeout: 60_000 });
run("revenue source check", "pnpm", ["revenue:check"], { timeout: 60_000 });
run("operations monitoring check", "pnpm", ["operations:check"], { timeout: 60_000 });
run("community growth check", "pnpm", ["community:check"], { timeout: 60_000 });
run("live platform price verification", "pnpm", ["prices:verify"], { timeout: 60_000 });
run("production readiness", "pnpm", ["readiness"], { timeout: 120_000 });
failNow();

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
  run("contract security check", "pnpm", ["contracts:security"], { timeout: 60_000 });
  run("contracts test suite", "pnpm", ["contracts:test"], { timeout: 180_000 });
  if (env.REQUIRE_LENDING_FORK_TEST === "true" || env.NEXT_PUBLIC_ENABLE_PRODUCTION_LENDING === "true") {
    requireEnv("HARDHAT_FORK_RPC_URL", { https: true });
    run("lending fee verification", "pnpm", ["lending:fees:check"], { timeout: 120_000 });
    run("lending fork test", "pnpm", ["contracts:test:fork"], { timeout: 240_000 });
  } else {
    warnings.push("Lending fork test is not enforced because lending production flags are disabled");
  }
}

if (requireSolanaProduction) {
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
} else if (target === "all") {
  warnings.push("Solana production gate is disabled because REQUIRE_SOLANA_PRODUCTION is not true");
}

if (env.REQUIRE_EXTERNAL_AUDIT === "true" && !hasRealExternalAudit()) {
  failures.push("External audit is required but SMART_CONTRACT_SECURITY_AUDIT.md does not declare `External Audit: Complete`");
}

run("production smoke", "pnpm", ["smoke:test"], { timeout: 120_000 });

if (env.REQUIRE_STRICT_PRODUCTION_GATE === "true" && warnings.length > 0) {
  failures.push(`Strict production gate does not allow warnings:\n${warnings.map((warning) => `- ${warning}`).join("\n")}`);
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
