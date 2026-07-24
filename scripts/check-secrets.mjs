import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { extname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));

const ignoredDirs = new Set([
  ".git",
  ".next",
  "artifacts",
  "cache",
  "coverage",
  "dist",
  "node_modules",
  "out",
  "typechain-types",
]);

const ignoredFiles = new Set([
  "build-latest.log",
  "package-lock.json",
  "pnpm-lock.yaml",
  "yarn.lock",
]);

const textExtensions = new Set([
  "",
  ".cjs",
  ".css",
  ".env",
  ".example",
  ".html",
  ".js",
  ".json",
  ".jsx",
  ".md",
  ".mjs",
  ".scss",
  ".sol",
  ".sql",
  ".ts",
  ".tsx",
  ".txt",
  ".yml",
  ".yaml",
]);

const rules = [
  {
    name: "telegram-bot-token",
    pattern: /\b\d{8,12}:AA[A-Za-z0-9_-]{30,}\b/g,
  },
  {
    name: "evm-private-key-env",
    pattern: /\b(?:PRIVATE_KEY|DEPLOYER_PRIVATE_KEY|OWNER_PRIVATE_KEY|MNEMONIC)\s*=\s*["']?(?:0x)?[a-fA-F0-9]{64}\b/g,
  },
  {
    name: "supabase-service-role-env",
    pattern: /\bSUPABASE_SERVICE_ROLE_KEY\s*=\s*["']?eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}/g,
  },
  {
    name: "jwt-secret-env",
    pattern: /\b(?:JWT_SECRET|SUPABASE_JWT_SECRET)\s*=\s*["']?[A-Za-z0-9_./+=-]{32,}/g,
  },
  {
    name: "google-api-key",
    pattern: /\bAIza[0-9A-Za-z_-]{35}\b/g,
  },
];

const findings = [];

function isIgnoredPath(path) {
  const parts = relative(root, path).split(sep);
  return parts.some((part) => ignoredDirs.has(part));
}

function shouldReadFile(path) {
  const name = path.split(/[\\/]/).pop();
  if (ignoredFiles.has(name)) return false;
  if (isIgnoredPath(path)) return false;
  return textExtensions.has(extname(name));
}

function redact(value) {
  if (value.length <= 12) return "[redacted]";
  return `${value.slice(0, 4)}...[redacted]...${value.slice(-4)}`;
}

function scanFile(path) {
  if (!shouldReadFile(path)) return;
  const content = readFileSync(path, "utf8");
  const lines = content.split(/\r?\n/);

  for (const rule of rules) {
    for (const match of content.matchAll(rule.pattern)) {
      const before = content.slice(0, match.index);
      const line = before.split(/\r?\n/).length;
      const lineText = lines[line - 1] ?? "";
      if (lineText.includes("your_") || lineText.includes("changeme") || lineText.includes("<")) continue;
      findings.push({
        file: relative(root, path).replaceAll("\\", "/"),
        line,
        rule: rule.name,
        value: redact(match[0]),
      });
    }
  }
}

function walk(dir) {
  if (!existsSync(dir) || isIgnoredPath(dir)) return;
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    const stats = statSync(path);
    if (stats.isDirectory()) {
      if (!ignoredDirs.has(entry)) walk(path);
    } else if (stats.isFile()) {
      scanFile(path);
    }
  }
}

walk(root);

if (findings.length > 0) {
  console.error("Secret scan failed:");
  for (const finding of findings) {
    console.error(`- ${finding.file}:${finding.line} ${finding.rule} ${finding.value}`);
  }
  process.exit(1);
}

console.log("Secret scan passed.");
