import { existsSync, readdirSync, statSync } from "node:fs";
import { extname, join, resolve } from "node:path";

const root = process.cwd();
const failures = [];
const warnings = [];

const limits = {
  publicAssetBytes: Number(process.env.PERF_PUBLIC_ASSET_MAX_BYTES ?? 600_000),
  iconBytes: Number(process.env.PERF_ICON_MAX_BYTES ?? 180_000),
  faviconBytes: Number(process.env.PERF_FAVICON_MAX_BYTES ?? 20_000),
  nextStaticChunkBytes: Number(process.env.PERF_NEXT_CHUNK_MAX_BYTES ?? 700_000),
};

function walk(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return walk(path);
    return [path];
  });
}

function checkFile(path, maxBytes, label) {
  if (!existsSync(path)) {
    failures.push(`${label} is missing`);
    return;
  }
  const size = statSync(path).size;
  if (size > maxBytes) failures.push(`${label} is ${size} bytes; budget is ${maxBytes}`);
}

checkFile(resolve(root, "frontend/public/favicon.ico"), limits.faviconBytes, "favicon.ico");
checkFile(resolve(root, "frontend/public/icon.png"), limits.iconBytes, "icon.png");
checkFile(resolve(root, "frontend/public/apple-touch-icon.png"), limits.iconBytes, "apple-touch-icon.png");

for (const file of walk(resolve(root, "frontend/public"))) {
  const extension = extname(file).toLowerCase();
  if (![".png", ".jpg", ".jpeg", ".webp", ".gif", ".ico", ".svg"].includes(extension)) continue;
  const size = statSync(file).size;
  if (size > limits.publicAssetBytes) failures.push(`${file} is ${size} bytes; public asset budget is ${limits.publicAssetBytes}`);
}

const nextStaticDir = resolve(root, "frontend/.next/static");
if (existsSync(nextStaticDir)) {
  for (const file of walk(nextStaticDir)) {
    if (!/\.(js|css)$/i.test(file)) continue;
    const size = statSync(file).size;
    if (size > limits.nextStaticChunkBytes) {
      failures.push(`${file} is ${size} bytes; static chunk budget is ${limits.nextStaticChunkBytes}`);
    }
  }
} else {
  warnings.push("frontend/.next/static is missing; run pnpm build before enforcing built chunk budgets");
}

if (failures.length > 0) {
  console.error("Performance budget checks failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  if (warnings.length > 0) {
    console.error("\nWarnings:");
    for (const warning of warnings) console.error(`- ${warning}`);
  }
  process.exit(1);
}

console.log("Performance budget checks passed.");
if (warnings.length > 0) {
  console.log("Warnings:");
  for (const warning of warnings) console.log(`- ${warning}`);
}
