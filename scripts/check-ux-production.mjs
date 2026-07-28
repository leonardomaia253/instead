import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
const failures = [];
const warnings = [];

function read(path) {
  return readFileSync(resolve(root, path), "utf8");
}

function requireFile(path) {
  if (!existsSync(resolve(root, path))) failures.push(`${path} is required`);
}

function requireContains(path, patterns) {
  if (!existsSync(resolve(root, path))) {
    failures.push(`${path} is required`);
    return;
  }
  const text = read(path);
  for (const pattern of patterns) {
    if (!pattern.test(text)) failures.push(`${path} must mention ${pattern}`);
  }
}

function compareMessageKeys(localeA, localeB) {
  const a = JSON.parse(read(`frontend/messages/${localeA}.json`));
  const b = JSON.parse(read(`frontend/messages/${localeB}.json`));
  const flatten = (obj, prefix = "") => Object.entries(obj).flatMap(([key, value]) => {
    const next = prefix ? `${prefix}.${key}` : key;
    return value && typeof value === "object" && !Array.isArray(value) ? flatten(value, next) : [next];
  });
  const aKeys = new Set(flatten(a));
  const bKeys = new Set(flatten(b));
  for (const key of aKeys) if (!bKeys.has(key)) failures.push(`frontend/messages/${localeB}.json missing key ${key}`);
  for (const key of bKeys) if (!aKeys.has(key)) failures.push(`frontend/messages/${localeA}.json missing key ${key}`);
}

for (const file of [
  "frontend/src/app/[locale]/page.tsx",
  "frontend/src/app/[locale]/factory/page.tsx",
  "frontend/src/app/[locale]/solutions/page.tsx",
  "frontend/src/app/[locale]/solutions/[slug]/page.tsx",
  "frontend/src/app/[locale]/lending/page.tsx",
  "frontend/src/app/[locale]/security/page.tsx",
  "frontend/src/app/[locale]/docs/page.tsx",
  "frontend/src/app/[locale]/legal/terms/page.tsx",
  "frontend/src/app/[locale]/legal/privacy/page.tsx",
  "frontend/src/app/[locale]/admin/login/page.tsx",
  "frontend/src/app/[locale]/admin/page.tsx",
  "frontend/src/app/[locale]/admin/revenue/page.tsx",
  "frontend/src/app/robots.ts",
  "frontend/src/app/sitemap.ts",
  "frontend/public/site.webmanifest",
  "frontend/public/icon.png",
  "frontend/public/og-image.png",
  "frontend/public/favicon.ico",
  "frontend/next.config.js",
  "frontend/src/lib/revenueLanding.ts",
]) {
  requireFile(file);
}

compareMessageKeys("pt", "en");

requireContains("frontend/next.config.js", [
  /X-Content-Type-Options/,
  /X-Frame-Options/,
  /Referrer-Policy/,
  /Permissions-Policy/,
  /Strict-Transport-Security/,
]);

requireContains("frontend/src/app/[locale]/factory/page.tsx", [
  /risk|risco/i,
  /liquidity|liquidez/i,
  /slippage/i,
  /Fair Launch/i,
]);

requireContains("frontend/src/app/[locale]/lending/page.tsx", [
  /health factor|fator de saúde|liquidação|liquidation/i,
  /collateral|colateral|garantia/i,
]);

requireContains("frontend/src/app/[locale]/legal/terms/page.tsx", [
  /risco|risk/i,
  /taxas|fees/i,
  /jurisdição|jurisdiction/i,
]);

requireContains("frontend/src/app/[locale]/legal/privacy/page.tsx", [
  /privacidade|privacy/i,
  /dados|data/i,
]);

requireContains("frontend/src/app/[locale]/lending/page.tsx", [
  /Lending Pro Stack|Protection Layer|Risk Shield/i,
]);

requireContains("frontend/src/app/[locale]/solutions/page.tsx", [
  /REVENUE_LANDINGS\.length/,
  /Token Factory/i,
  /Lending & Risk/i,
  /Wealth & B2B/i,
]);

requireContains("frontend/src/app/[locale]/solutions/[slug]/page.tsx", [
  /generateStaticParams/,
  /formatLandingPrice/,
  /Ver todas as verticais/i,
]);

requireContains("frontend/src/lib/revenueLanding.ts", [
  /token_deploy_basic/,
  /lending_pro_subscription/,
  /b2b_lending_widget_api/,
  /risk_shield_membership/,
]);

requireContains("frontend/src/app/[locale]/dashboard/page.tsx", [
  /Meu plano Instead/i,
  /Timeline operacional/i,
]);

requireContains("frontend/src/app/[locale]/admin/revenue/page.tsx", [
  /Provisionar Widget\/API B2B/i,
  /API key/i,
]);

const manifest = JSON.parse(read("frontend/public/site.webmanifest"));
for (const key of ["name", "short_name", "icons", "theme_color", "background_color", "display"]) {
  if (!manifest[key]) failures.push(`frontend/public/site.webmanifest missing ${key}`);
}
if (!Array.isArray(manifest.icons) || manifest.icons.length === 0) failures.push("site.webmanifest must define icons");

const factoryText = read("frontend/src/app/[locale]/factory/page.tsx");
if (/seguran[cç]a auditad[oa]|audited/i.test(factoryText)) {
  warnings.push("Factory copy mentions audited/security claims; keep aligned with external audit status before public traffic");
}

if (read("frontend/src/app/[locale]/staking/page.tsx").includes("alert(")) {
  failures.push("Staking page must use toast/inline state instead of native alert()");
}

if (/demo/i.test(read("frontend/src/app/[locale]/simulator/page.tsx"))) {
  failures.push("Simulator page must not expose demo wording in production UX");
}

if (failures.length > 0) {
  console.error("UX production check failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  if (warnings.length > 0) {
    console.error("\nWarnings:");
    for (const warning of warnings) console.error(`- ${warning}`);
  }
  process.exit(1);
}

console.log("UX production checks passed.");
if (warnings.length > 0) {
  console.log("Warnings:");
  for (const warning of warnings) console.log(`- ${warning}`);
}
