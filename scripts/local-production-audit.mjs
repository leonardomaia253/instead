#!/usr/bin/env node
import { spawnSync } from "node:child_process";

const isWindows = process.platform === "win32";

function commandInvocation(command, args) {
  if (!isWindows) return { command, args };
  if (command === "pnpm") {
    return { command: "cmd", args: ["/d", "/s", "/c", "pnpm", ...args] };
  }
  return { command, args };
}

function tail(value, maxLength = 4000) {
  if (!value) return "";
  return value.length > maxLength ? value.slice(-maxLength) : value;
}

const checks = [
  { label: "address configuration", command: "pnpm", args: ["addresses:check"], timeout: 60_000, critical: true },
  { label: "workspace hygiene", command: "pnpm", args: ["workspace:hygiene"], timeout: 60_000, critical: true },
  { label: "secret scan", command: "pnpm", args: ["secrets:check"], timeout: 60_000, critical: true },
  { label: "Supabase environment diagnostics", command: "pnpm", args: ["supabase:diagnose"], timeout: 60_000, critical: true },
  { label: "API security scan", command: "pnpm", args: ["api:security"], timeout: 60_000 },
  { label: "Edge Function contract scan", command: "pnpm", args: ["edge:functions:check"], timeout: 60_000 },
  { label: "database migrations", command: "pnpm", args: ["db:migrations:check"], timeout: 60_000 },
  { label: "Supabase API contract", command: "pnpm", args: ["db:contract:check"], timeout: 60_000 },
  { label: "revenue sources", command: "pnpm", args: ["revenue:check"], timeout: 60_000 },
  { label: "operations monitoring", command: "pnpm", args: ["operations:check"], timeout: 60_000 },
  { label: "community growth layer", command: "pnpm", args: ["community:check"], timeout: 60_000 },
  { label: "responsive UX rules", command: "pnpm", args: ["ux:check"], timeout: 60_000 },
  { label: "mobile app configuration", command: "pnpm", args: ["mobile:check"], timeout: 60_000 },
  { label: "performance budget", command: "pnpm", args: ["performance:check"], timeout: 60_000 },
  { label: "contract security scan", command: "pnpm", args: ["contracts:security"], timeout: 60_000 },
  { label: "contract tests", command: "pnpm", args: ["contracts:test"], timeout: 240_000 },
  { label: "production dependency audit", command: "pnpm", args: ["audit:prod"], timeout: 120_000 },
  { label: "frontend production build", command: "pnpm", args: ["build"], timeout: 300_000 },
  { label: "frontend typecheck", command: "pnpm", args: ["typecheck"], timeout: 180_000 },
];

const failures = [];

console.log("Running local production audit...");
console.log("This excludes remote smoke tests, live fork checks and third-party external audit evidence.");

for (const { label, command, args, timeout, critical = false } of checks) {
  console.log(`\n[local-audit] ${label}`);
  const invocation = commandInvocation(command, args);
  const result = spawnSync(invocation.command, invocation.args, {
    cwd: process.cwd(),
    env: process.env,
    encoding: "utf8",
    timeout,
  });

  if (result.error || result.status !== 0) {
    failures.push({
      label,
      error: result.error,
      status: result.status,
      stdout: result.stdout,
      stderr: result.stderr,
    });
    console.error(`[local-audit] failed: ${label}`);
    if (critical) {
      console.error(`[local-audit] stopped after critical prerequisite failure: ${label}`);
      break;
    }
  } else {
    console.log(`[local-audit] passed: ${label}`);
  }
}

if (failures.length > 0) {
  console.error("\nLocal production audit failed:");
  for (const failure of failures) {
    console.error(`\n- ${failure.label}`);
    if (failure.error) console.error(`  error: ${failure.error.message}`);
    if (failure.status !== null) console.error(`  exit status: ${failure.status}`);
    const output = [tail(failure.stdout), tail(failure.stderr)].filter(Boolean).join("\n");
    if (output) console.error(output);
  }
  process.exit(1);
}

console.log("\nLocal production audit passed.");
console.log("Run pnpm production:gate before launch to include remote smoke, fork and external audit gates.");
