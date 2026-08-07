#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const failures = [];

function read(path) {
  return readFileSync(resolve(root, path), "utf8");
}

function requireIncludes(path, needle, message) {
  if (!read(path).includes(needle)) failures.push(message);
}

const csrf = read("frontend/src/lib/server/csrf.ts");
if (!csrf.includes("if (!origin) return NextResponse.json")) {
  failures.push("CSRF guard must reject missing Origin headers for cookie-auth mutations");
}
if (!csrf.includes("x-forwarded-host") || !csrf.includes("x-forwarded-proto")) {
  failures.push("CSRF guard must honor forwarded host/protocol from production proxies");
}

const rateLimit = read("frontend/src/lib/server/rateLimit.ts");
if (!rateLimit.includes("readLimitedJson")) failures.push("API helpers must expose bounded JSON body parsing");
if (!rateLimit.includes("readLimitedText")) failures.push("API helpers must expose bounded raw text body parsing");
if (!rateLimit.includes("content-length")) failures.push("API body limits must reject oversized Content-Length before buffering");

const cookieSessionRoute = "frontend/src/app/api/auth/session/route.ts";
for (const expected of ['httpOnly: true', 'secure: true', 'sameSite: "lax"', "requireSameOrigin", "rateLimit", "readLimitedJson"]) {
  requireIncludes(cookieSessionRoute, expected, `Wallet session route must include ${expected}`);
}

for (const route of [
  "frontend/src/app/api/admin/prices/route.ts",
  "frontend/src/app/api/admin/b2b-clients/route.ts",
  "frontend/src/app/api/admin/assisted-deployments/route.ts",
  "frontend/src/app/api/admin/operations/route.ts",
  "frontend/src/app/api/admin/affiliates/route.ts",
  "frontend/src/app/api/admin/community/route.ts",
  "frontend/src/app/api/lending/automation-intents/route.ts",
]) {
  for (const expected of ["requireSameOrigin", "rateLimit", "readLimitedJson"]) {
    requireIncludes(route, expected, `${route} must include ${expected}`);
  }
}

for (const route of [
  "frontend/src/app/api/community/me/route.ts",
  "frontend/src/app/api/community/event/route.ts",
  "frontend/src/app/api/community/vote/route.ts",
]) {
  for (const expected of ["requireSameOrigin", "rateLimit", "readLimitedJson"]) {
    requireIncludes(route, expected, `${route} must include ${expected}`);
  }
}

for (const [route, secret, header] of [
  ["frontend/src/app/api/community/queue/route.ts", "COMMUNITY_QUEUE_SECRET", "x-instead-community-secret"],
  ["frontend/src/app/api/discord/webhook/route.ts", "DISCORD_WEBHOOK_SECRET", "x-instead-discord-secret"],
]) {
  requireIncludes(route, "rateLimit", `${route} must rate-limit external worker/webhook traffic`);
  requireIncludes(route, "readLimitedJson", `${route} must cap JSON request payload size`);
  requireIncludes(route, secret, `${route} must require ${secret}`);
  requireIncludes(route, header, `${route} must verify ${header}`);
  requireIncludes(route, "Service unavailable", `${route} must fail closed when secret is not configured`);
}

for (const [route, signatureCheck] of [
  ["frontend/src/app/api/payments/webhooks/stripe/route.ts", "constructEvent"],
  ["frontend/src/app/api/payments/webhooks/pagarme/route.ts", "verifyPagarmeWebhook"],
]) {
  requireIncludes(route, "rateLimit", `${route} must rate-limit webhook traffic`);
  requireIncludes(route, "readLimitedText", `${route} must cap raw webhook body size`);
  requireIncludes(route, signatureCheck, `${route} must verify provider webhook signatures`);
}

for (const route of [
  "frontend/src/app/api/auth/wallet-profile/route.ts",
  "frontend/src/app/api/affiliates/click/route.ts",
  "frontend/src/app/api/b2b/widget/route.ts",
  "frontend/src/app/api/telegram/webhook/route.ts",
]) {
  requireIncludes(route, "rateLimit", `${route} must rate-limit public write traffic`);
  requireIncludes(route, "readLimitedJson", `${route} must cap JSON request payload size`);
}

const checkoutRoute = "frontend/src/app/api/payments/checkout/route.ts";
for (const expected of ["requireSameOrigin", "rateLimit", "readLimitedJson", "verifyWalletSession", "hasApprovedCompliance", "kyc_required"]) {
  requireIncludes(checkoutRoute, expected, `${checkoutRoute} must include ${expected}`);
}

const paymentsLib = "frontend/src/lib/server/payments.ts";
for (const expected of [
  'billing_address_collection: "required"',
  "phone_number_collection",
  "client_reference_id",
  "payment_intent_data",
  "normalizePagarmeCustomer",
  "billingAddress",
  "document_type",
  "phones",
  "shipping",
]) {
  requireIncludes(paymentsLib, expected, `${paymentsLib} must include gateway checkout field ${expected}`);
}
for (const expected of ["assisted_token_deployments", "payment_intent_id", "factory_address", "initial_supply"]) {
  requireIncludes(paymentsLib, expected, `${paymentsLib} must enqueue assisted token deployments with ${expected}`);
}

for (const expected of ["createTokenFor", "createFairLaunchTokenETHFor", "ASSISTED_DEPLOYER_PRIVATE_KEY", "requireRelayerBalance", "InsufficientRelayerBalanceError", "assisted_token_deployments", "generated_tokens", "audits"]) {
  requireIncludes("scripts/execute-assisted-token-deployments.mjs", expected, `assisted deployment executor must include ${expected}`);
}

for (const [route, expected] of [
  ["frontend/src/app/api/compliance/verification/session/route.ts", "createDiditSession"],
  ["frontend/src/app/api/compliance/verification/session/route.ts", "requireSameOrigin"],
  ["frontend/src/app/api/compliance/verification/session/route.ts", "verifyWalletSession"],
  ["frontend/src/app/api/compliance/verification/status/route.ts", "noStoreJson"],
  ["frontend/src/app/api/compliance/verification/webhooks/didit/route.ts", "verifyDiditWebhook"],
  ["frontend/src/app/api/compliance/verification/webhooks/didit/route.ts", "readLimitedText"],
]) {
  requireIncludes(route, expected, `${route} must include ${expected}`);
}

for (const route of [
  "frontend/src/app/api/payments/webhooks/stripe/route.ts",
  "frontend/src/app/api/payments/webhooks/pagarme/route.ts",
  "frontend/src/app/api/compliance/verification/webhooks/didit/route.ts",
]) {
  requireIncludes(route, "logWebhookEvent", `${route} must write webhook event logs`);
}

const diditLib = "frontend/src/lib/server/didit.ts";
for (const expected of ["https://verification.didit.me/v3/session/", "x-api-key", "vendor_data", "callback_method", "DIDIT_WEBHOOK_SECRET", "timingSafeEqual"]) {
  requireIncludes(diditLib, expected, `${diditLib} must include ${expected}`);
}

for (const route of [
  "frontend/src/app/api/payments/status/route.ts",
  "frontend/src/app/api/revenue/me/route.ts",
  "frontend/src/app/api/admin/revenue/route.ts",
]) {
  requireIncludes(route, "noStoreJson", `${route} must disable caching of sensitive data`);
}

requireIncludes("frontend/src/app/api/payments/status/route.ts", "UUID_RE", "Payment status must validate payment intent ids before querying");

const proxy = read("frontend/src/proxy.ts");
if (!proxy.includes("header.alg !== 'HS256'") || !proxy.includes("timingSafeEqual") || !proxy.includes("payload.exp")) {
  failures.push("Proxy must validate wallet JWT structure before trusting admin routes");
}

const nextConfig = read("frontend/next.config.js");
for (const header of [
  "Content-Security-Policy",
  "Strict-Transport-Security",
  "X-Frame-Options",
  "Referrer-Policy",
  "Permissions-Policy",
]) {
  if (!nextConfig.includes(header)) failures.push(`Missing security header: ${header}`);
}

if (failures.length > 0) {
  console.error("API security checks failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("API security checks passed.");
