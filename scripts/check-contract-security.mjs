import { readdirSync, readFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";

const root = process.cwd();
const contractsDir = resolve(root, "contracts");
const failures = [];

const allowedPatterns = new Set([
  "contracts/TokenFactory.sol:treasury.call",
  "contracts/TokenFactory.sol:payable(msg.sender).call",
]);

function walk(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory() && entry.name === "test") return [];
    if (entry.isDirectory()) return walk(path);
    return path.endsWith(".sol") ? [path] : [];
  });
}

function rel(path) {
  return relative(root, path).replace(/\\/g, "/");
}

function withoutComments(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/.*$/gm, "");
}

for (const file of walk(contractsDir)) {
  const path = rel(file);
  const source = readFileSync(file, "utf8");
  const code = withoutComments(source);

  for (const [label, pattern] of [
    ["tx.origin", /\btx\.origin\b/],
    ["selfdestruct", /\bselfdestruct\s*\(/],
    ["delegatecall", /\.delegatecall\s*\(/],
    ["inline assembly", /\bassembly\s*\{/],
    ["low-level send", /\.send\s*\(/],
    ["ETH transfer", /\.transfer\s*\(/],
  ]) {
    if (pattern.test(code)) {
      if (label === "ETH transfer" && path === "contracts/TokenFactory.sol") {
        failures.push(`${path} uses ETH transfer for refunds; prefer call with explicit success handling to avoid gas stipend fragility`);
      } else {
        failures.push(`${path} uses forbidden ${label}`);
      }
    }
  }

  const lowLevelCalls = [...code.matchAll(/([A-Za-z0-9_().]+)\.call\s*\{[^}]*value:/g)];
  for (const match of lowLevelCalls) {
    const key = `${path}:${match[1]}.call`;
    if (!allowedPatterns.has(key)) failures.push(`${path} uses unreviewed value call: ${match[0]}`);
  }

  if (/\bUUPSUpgradeable\b/.test(code)) {
    if (!code.includes("_disableInitializers();")) failures.push(`${path} UUPS contract must disable initializers in constructor`);
    if (!/function\s+_authorizeUpgrade\s*\([^)]*\)\s+internal\s+override\s+onlyOwner/.test(code)) {
      failures.push(`${path} UUPS contract must restrict _authorizeUpgrade with onlyOwner`);
    }
  }

  const externalPayableFunctions = [...code.matchAll(/function\s+([A-Za-z0-9_]+)\s*\([^)]*\)\s+external\s+payable([^{;]*)\{/g)];
  for (const match of externalPayableFunctions) {
    if (!/\bnonReentrant\b/.test(match[2])) failures.push(`${path}.${match[1]} is external payable without nonReentrant`);
  }
}

if (failures.length > 0) {
  console.error("Contract security checks failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Contract security checks passed.");
