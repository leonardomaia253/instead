import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { mergeEnv, parseEnvFile, projectRefFromSupabaseUrl, supabaseEnvDiagnostics } from "./lib/supabase-env.mjs";

const requiredFunctions = ["siwe-auth", "token-ai", "lending-ai", "telegram-bot", "balance-monitor", "lending-automation"];
const frontendEnv = parseEnvFile(resolve(process.cwd(), "frontend/.env.local"));
const env = mergeEnv(process.env, frontendEnv);
const projectRef = env.SUPABASE_PROJECT_REF;
const syncSecrets = process.env.SYNC_SUPABASE_SECRETS === "true";
const strict = env.REQUIRE_STRICT_PRODUCTION_GATE === "true";
const requiredSecrets = [
  "APP_ORIGIN",
  "SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "SUPABASE_JWT_SECRET",
  "SIWE_DOMAIN",
  "GEMINI_API_KEY",
  "TELEGRAM_BOT_TOKEN",
  "TELEGRAM_WEBHOOK_SECRET",
  "BALANCE_MONITOR_SECRET",
  "LENDING_AUTOMATION_SECRET",
];
const failures = [];
const warnings = [];

function commandInvocation(command, args) {
  if (command === "pnpm" && process.env.npm_execpath) {
    return { command: process.execPath, args: [process.env.npm_execpath, ...args] };
  }
  if (command === "pnpm" && process.platform === "win32") {
    return { command: "pnpm.cmd", args };
  }
  if (command === "supabase" && process.platform === "win32") {
    return { command: process.env.ComSpec ?? "cmd.exe", args: ["/d", "/s", "/c", "supabase", ...args] };
  }
  return { command, args };
}

function run(label, command, args, options = {}) {
  const invocation = commandInvocation(command, args);
  const result = spawnSync(invocation.command, invocation.args, {
    cwd: process.cwd(),
    env,
    encoding: "utf8",
    timeout: options.timeout ?? 180_000,
  });
  if (result.status !== 0) {
    failures.push(`${label} failed:\n${(result.stdout ?? "").slice(-1500)}${(result.stderr ?? "").slice(-2500)}`);
  }
  return result;
}

const urlProjectRef = env.SUPABASE_URL ? projectRefFromSupabaseUrl(env.SUPABASE_URL) : null;
const diagnostics = supabaseEnvDiagnostics({ fileEnv: frontendEnv, processEnv: process.env, mergedEnv: env });
failures.push(...diagnostics.failures);
warnings.push(...diagnostics.warnings);
run("Supabase CLI version", "supabase", ["--version"], { timeout: 30_000 });

if (!projectRef || !/^[a-z0-9]{20}$/.test(projectRef)) {
  if (projectRef) failures.push("SUPABASE_PROJECT_REF must be a 20-character Supabase project ref");
}

if (projectRef && urlProjectRef && projectRef !== urlProjectRef) {
  failures.push(`SUPABASE_PROJECT_REF (${projectRef}) does not match SUPABASE_URL project ref (${urlProjectRef})`);
}
if (env.SUPABASE_URL && !urlProjectRef) {
  warnings.push("SUPABASE_URL is not a standard https://<project-ref>.supabase.co URL; could not compare project refs");
}

for (const functionName of requiredFunctions) {
  const indexPath = resolve(process.cwd(), "supabase", "functions", functionName, "index.ts");
  if (!existsSync(indexPath)) failures.push(`supabase/functions/${functionName}/index.ts is missing`);
}

run("Edge Function contract check", "pnpm", ["edge:functions:check"], { timeout: 60_000 });

const configuredSecrets = requiredSecrets.filter((name) => Boolean(env[name]));
const missingSecrets = requiredSecrets.filter((name) => !env[name]);
if (missingSecrets.length > 0) {
  warnings.push(`Missing Edge Function secrets in local environment: ${missingSecrets.join(", ")}`);
}

if (failures.length === 0) {
  if (syncSecrets) {
    const args = ["secrets", "set", "--project-ref", projectRef, ...configuredSecrets.map((name) => `${name}=${env[name]}`)];
    if (configuredSecrets.length === 0) {
      failures.push("SYNC_SUPABASE_SECRETS=true but no supported Supabase Edge Function secrets are configured");
    } else {
      run("sync Edge Function secrets", "supabase", args, { timeout: 180_000 });
    }
  } else {
    warnings.push("SYNC_SUPABASE_SECRETS is not true; deploy will not update Supabase Edge Function secrets");
  }

  for (const functionName of requiredFunctions) {
    run(`deploy ${functionName}`, "supabase", ["functions", "deploy", functionName, "--project-ref", projectRef], {
      timeout: 180_000,
    });
  }
}

if (failures.length > 0) {
  console.error("Edge Function deploy failed:");
  for (const failure of failures) console.error(`\n- ${failure}`);
  if (warnings.length > 0) {
    console.error("\nWarnings:");
    for (const warning of warnings) console.error(`- ${warning}`);
  }
  process.exit(1);
}

if (strict && warnings.length > 0) {
  console.error("Edge Function deploy failed in strict mode:");
  for (const warning of warnings) console.error(`- ${warning}`);
  process.exit(1);
}

console.log(`Deployed ${requiredFunctions.length} Supabase Edge Functions to ${projectRef}.`);
if (warnings.length > 0) {
  console.log("Warnings:");
  for (const warning of warnings) console.log(`- ${warning}`);
}
