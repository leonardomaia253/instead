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
  /Content-Security-Policy/,
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
  /Escolha como quer usar a Instead/i,
  /Criar e lançar tokens/i,
  /Operar crédito com controle/i,
  /Acompanhar patrimônio e integrar parceiros/i,
]);

requireContains("frontend/src/app/[locale]/solutions/[slug]/page.tsx", [
  /generateStaticParams/,
  /formatLandingPrice/,
  /Ver outras opções/i,
  /COMO FUNCIONA/i,
]);

requireContains("frontend/src/lib/revenueLanding.ts", [
  /token_deploy_basic/,
  /lending_pro_subscription/,
  /b2b_lending_widget_api/,
  /risk_shield_membership/,
  /PUBLIC_OFFER_LANDINGS/,
]);

requireContains("frontend/src/app/[locale]/dashboard/page.tsx", [
  /Meu plano Instead/i,
  /Timeline operacional/i,
  /revenueAuthRequired/,
  /res\.status === 401/,
]);

requireContains("frontend/src/app/[locale]/factory/page.tsx", [
  /response\.status === 401/,
  /auth_required/,
]);

requireContains("frontend/src/app/[locale]/lending/page.tsx", [
  /response\.status === 401/,
  /assinar a sess/i,
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

const homeText = read("frontend/src/app/[locale]/page.tsx");
if (/fallbackStats|4\.2M|1,240|850K/.test(homeText)) {
  failures.push("Home page must not publish invented fallback traction metrics");
}
if (!homeText.includes("Aguardando dados")) {
  failures.push("Home page must show an explicit empty state when live platform stats are unavailable");
}

const footerText = read("frontend/src/components/Footer.tsx");
if (/https:\/\/twitter\.com["']|https:\/\/github\.com["']/.test(footerText)) {
  failures.push("Footer must not link to generic social homepages");
}
if (/Protocolo Auditado|audited protocol/i.test(footerText)) {
  failures.push("Footer must not claim audited protocol status without external audit evidence");
}
if (!footerText.includes("NEXT_PUBLIC_COMMUNITY_X_URL") || !footerText.includes("NEXT_PUBLIC_GITHUB_URL")) {
  failures.push("Footer social links must be configurable with public production URLs");
}

const runtimeUrlFiles = [
  "frontend/src/app/[locale]/layout.tsx",
  "frontend/src/app/[locale]/factory/layout.tsx",
  "frontend/src/app/[locale]/lending/layout.tsx",
  "frontend/src/app/[locale]/staking/layout.tsx",
  "frontend/src/app/sitemap.ts",
  "frontend/src/app/robots.ts",
  "frontend/src/lib/wagmi.ts",
  "frontend/src/app/api/b2b/widget/route.ts",
];
for (const file of runtimeUrlFiles) {
  if (read(file).includes("https://instead.volupai.com")) {
    failures.push(`${file} must use configured app origin instead of hardcoded production URL`);
  }
}
if (!read("frontend/src/lib/site.ts").includes("NEXT_PUBLIC_APP_ORIGIN")) {
  failures.push("Frontend runtime URLs must be centralized in frontend/src/lib/site.ts");
}
const readinessText = read("scripts/production-readiness.mjs");
if (!readinessText.includes('requireHttpsUrl("APP_ORIGIN")') || !readinessText.includes("APP_ORIGIN must match NEXT_PUBLIC_APP_ORIGIN")) {
  failures.push("Production readiness must require APP_ORIGIN and match it to NEXT_PUBLIC_APP_ORIGIN");
}
if (read("scripts/production-gate.mjs").includes("skipped production smoke")) {
  failures.push("Production gate must not skip smoke tests because APP_ORIGIN is missing");
}
if (!read("scripts/smoke-test.mjs").includes("NEXT_PUBLIC_APP_ORIGIN")) {
  failures.push("Smoke tests must use NEXT_PUBLIC_APP_ORIGIN as the public origin fallback");
}
const certifyText = read("scripts/production-certify.mjs");
if (!certifyText.includes("...mergeEnv(process.env, fileEnv)") || !certifyText.includes('REQUIRE_STRICT_PRODUCTION_GATE: "true"')) {
  failures.push("Production certification must force strict gate after merging local/process env");
}

const adminHomeText = read("frontend/src/app/[locale]/admin/page.tsx");
if (/simulado/i.test(adminHomeText)) {
  failures.push("Admin revenue dashboard must label projections as planning, not simulated production metrics");
}

const lendingHookText = read("frontend/src/hooks/useInsteadLending.ts");
if (/em breve|coming soon/i.test(lendingHookText)) {
  failures.push("Lending disabled state must explain operational configuration instead of coming-soon product copy");
}
if (!lendingHookText.includes("NEXT_PUBLIC_ENABLE_PRODUCTION_LENDING")) {
  failures.push("Lending hook must keep production lending explicitly gated by NEXT_PUBLIC_ENABLE_PRODUCTION_LENDING");
}
const lendingPageText = read("frontend/src/app/[locale]/lending/page.tsx");
if (/em breve|coming soon|acesso antecipado/i.test(lendingPageText)) {
  failures.push("Lending page disabled state must not expose coming-soon or early-access production copy");
}
if (lendingPageText.includes("contato@instead.volupai.com")) {
  failures.push("Lending page must use NEXT_PUBLIC_SUPPORT_EMAIL instead of hardcoded contact email");
}
if (!lendingPageText.includes("NEXT_PUBLIC_SUPPORT_EMAIL")) {
  failures.push("Lending page must expose specialist contact through NEXT_PUBLIC_SUPPORT_EMAIL");
}

const publicSolutionsCopy = [
  read("frontend/src/app/[locale]/solutions/page.tsx"),
  read("frontend/src/app/[locale]/solutions/[slug]/page.tsx"),
].join("\n");
for (const forbidden of [/REVENUE MAP/i, /VERTICAIS/i, /COMO VENDE/i, /PROD READY/i, /PLANNED/i, /landings conectadas/i, /fontes de receita/i]) {
  if (forbidden.test(publicSolutionsCopy)) failures.push(`Public solutions pages must not expose internal strategy wording: ${forbidden}`);
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
