import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { mergeEnv, parseEnvFile } from "./lib/supabase-env.mjs";

const fileEnv = parseEnvFile(resolve(process.cwd(), "frontend/.env.local"));
const env = {
  ...mergeEnv(process.env, fileEnv),
  REQUIRE_STRICT_PRODUCTION_GATE: "true",
  SYNC_SUPABASE_SECRETS: "true",
};

const steps = [
  { label: "Supabase environment diagnostics", args: ["supabase:diagnose"], timeout: 60_000, allowWarnings: false },
  { label: "Supabase Edge Function deploy and secret sync", args: ["edge:functions:deploy"], timeout: 600_000, allowWarnings: false },
  { label: "Strict production gate", args: ["production:gate"], timeout: 600_000, allowWarnings: false },
];

function commandInvocation(command, args) {
  if (command === "pnpm" && process.env.npm_execpath) {
    return { command: process.execPath, args: [process.env.npm_execpath, ...args] };
  }
  if (command === "pnpm" && process.platform === "win32") {
    return { command: "pnpm.cmd", args };
  }
  return { command, args };
}

for (const step of steps) {
  console.log(`[production-certify] ${step.label}`);
  const invocation = commandInvocation("pnpm", step.args);
  const result = spawnSync(invocation.command, invocation.args, {
    cwd: process.cwd(),
    env,
    encoding: "utf8",
    stdio: "pipe",
    timeout: step.timeout,
  });
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);

  if (result.status !== 0) {
    console.error(`[production-certify] failed: ${step.label}`);
    process.exit(result.status ?? 1);
  }
  const output = `${result.stdout ?? ""}\n${result.stderr ?? ""}`;
  if (!step.allowWarnings && /^Warnings:/m.test(output)) {
    console.error(`[production-certify] failed: ${step.label} emitted warnings`);
    process.exit(1);
  }
}

console.log("[production-certify] production certification passed with strict gate and synced Edge Function secrets.");
