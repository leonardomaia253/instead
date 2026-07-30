#!/usr/bin/env node
import { existsSync, readdirSync, statSync } from "node:fs";
import { basename, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const failures = [];

const ignoredDirs = new Set([
  ".git",
  ".next",
  "artifacts",
  "cache",
  "coverage",
  "node_modules",
  "out",
  "target",
  "typechain-types",
]);

const suspiciousNames = new Set([
  "trace_resolution.txt",
  "build-latest.log",
]);

const suspiciousExtensions = [
  ".har",
  ".pem",
  ".p12",
  ".key",
  ".sqlite",
  ".db",
  ".tsbuildinfo",
];

function isIgnoredPath(path) {
  return relative(root, path).split(sep).some((part) => ignoredDirs.has(part));
}

function isSuspiciousFile(path) {
  const name = basename(path);
  if (suspiciousNames.has(name)) return true;
  if (/\.err\.log$/i.test(name) || /\.log$/i.test(name)) return true;
  return suspiciousExtensions.some((extension) => name.toLowerCase().endsWith(extension));
}

function walk(dir) {
  if (!existsSync(dir) || isIgnoredPath(dir)) return;
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    const stats = statSync(path);
    if (stats.isDirectory()) {
      if (!ignoredDirs.has(entry)) walk(path);
    } else if (stats.isFile() && isSuspiciousFile(path)) {
      failures.push(relative(root, path).replaceAll("\\", "/"));
    }
  }
}

walk(root);

if (failures.length > 0) {
  console.error("Workspace hygiene check failed; remove local debug/secrets-bearing artifacts:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Workspace hygiene checks passed.");
