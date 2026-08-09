import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const frontendEnvPath = resolve(root, "frontend/.env.local");

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

const env = { ...parseEnvFile(frontendEnvPath), ...process.env };
const failures = [];
const warnings = [];

function requireEnv(name) {
  if (!env[name]) failures.push(`${name} is required`);
  return env[name] ?? "";
}

function requireBase58(name) {
  const value = requireEnv(name);
  if (value && !/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(value)) {
    failures.push(`${name} must be a Solana base58 public key`);
  }
}

const rpcUrl = requireEnv("SOLANA_RPC_URL");
if (rpcUrl && !/^https:\/\/[^\s]+$/i.test(rpcUrl)) failures.push("SOLANA_RPC_URL must be an HTTPS URL");

if (env.NEXT_PUBLIC_SOLANA_FACTORY_PROGRAM_ID) {
  requireBase58("NEXT_PUBLIC_SOLANA_FACTORY_PROGRAM_ID");
} else {
  warnings.push("NEXT_PUBLIC_SOLANA_FACTORY_PROGRAM_ID is not set yet; deploy the Anchor program first");
}

for (const requiredFile of [
  "solana/Anchor.toml",
  "solana/programs/instead_solana_factory/Cargo.toml",
  "solana/programs/instead_solana_factory/src/lib.rs",
  "solana/README.md",
]) {
  if (!existsSync(resolve(root, requiredFile))) failures.push(`${requiredFile} is missing`);
}

const anchorToml = readFileSync(resolve(root, "solana/Anchor.toml"), "utf8");
const programSource = readFileSync(resolve(root, "solana/programs/instead_solana_factory/src/lib.rs"), "utf8");
const configuredProgramIds = [...anchorToml.matchAll(/instead_solana_factory\s*=\s*"([^"]+)"/g)].map((match) => match[1]);
const declaredProgramId = programSource.match(/declare_id!\("([^"]+)"\)/)?.[1] ?? "";
if (configuredProgramIds.length !== 3) failures.push("Anchor.toml must configure localnet, devnet and mainnet program ids");
if (!declaredProgramId) failures.push("Solana program must declare an id");
if ([declaredProgramId, ...configuredProgramIds].includes("11111111111111111111111111111111")) {
  failures.push("Solana program id must not use the System Program placeholder");
}
if (declaredProgramId && configuredProgramIds.some((id) => id !== declaredProgramId)) {
  failures.push("Anchor.toml program ids must match declare_id! in lib.rs");
}
if (declaredProgramId && !/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(declaredProgramId)) {
  failures.push("declare_id! must be a Solana base58 public key");
}

if (failures.length > 0) {
  console.error("Solana config check failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  if (warnings.length > 0) {
    console.error("\nWarnings:");
    for (const warning of warnings) console.error(`- ${warning}`);
  }
  process.exit(1);
}

console.log("Solana config checks passed.");
if (warnings.length > 0) {
  console.log("Warnings:");
  for (const warning of warnings) console.log(`- ${warning}`);
}
