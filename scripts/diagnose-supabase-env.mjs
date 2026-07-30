#!/usr/bin/env node
import { resolve } from "node:path";
import { mergeEnv, parseEnvFile, supabaseEnvDiagnostics } from "./lib/supabase-env.mjs";

const fileEnv = parseEnvFile(resolve(process.cwd(), "frontend/.env.local"));
const mergedEnv = mergeEnv(process.env, fileEnv);
const diagnostics = supabaseEnvDiagnostics({ fileEnv, processEnv: process.env, mergedEnv });

function present(value) {
  return value ? "set" : "missing";
}

console.log("Supabase environment diagnostics:");
console.log(`- frontend/.env.local project ref: ${diagnostics.fileSupabaseRef || "<unset>"}`);
console.log(`- frontend/.env.local anon key ref: ${diagnostics.fileAnonKeyRef || "<unset>"}`);
console.log(`- frontend/.env.local anon key role: ${diagnostics.fileAnonKeyRole || "<unset>"}`);
console.log(`- frontend/.env.local service role ref: ${diagnostics.fileServiceRoleRef || "<unset>"}`);
console.log(`- frontend/.env.local service role: ${diagnostics.fileServiceRoleRole || "<unset>"}`);
console.log(`- process env project ref: ${diagnostics.processSupabaseRef || "<unset>"}`);
console.log(`- process env anon key ref: ${diagnostics.processAnonKeyRef || "<unset>"}`);
console.log(`- process env anon key role: ${diagnostics.processAnonKeyRole || "<unset>"}`);
console.log(`- process env service role ref: ${diagnostics.processServiceRoleRef || "<unset>"}`);
console.log(`- process env service role: ${diagnostics.processServiceRoleRole || "<unset>"}`);
console.log(`- effective URL project ref: ${diagnostics.effectiveSupabaseRef || "<unset>"}`);
console.log(`- anon key project ref: ${diagnostics.anonKeyRef || "<unset>"}`);
console.log(`- anon key role: ${diagnostics.anonKeyRole || "<unset>"}`);
console.log(`- service role project ref: ${diagnostics.serviceRoleRef || "<unset>"}`);
console.log(`- service role: ${diagnostics.serviceRoleRole || "<unset>"}`);
console.log(`- SUPABASE_PROJECT_REF: ${diagnostics.configuredProjectRef || "<unset>"}`);
console.log(`- SUPABASE_URL: ${present(mergedEnv.SUPABASE_URL)}`);
console.log(`- NEXT_PUBLIC_SUPABASE_URL: ${present(mergedEnv.NEXT_PUBLIC_SUPABASE_URL)}`);
console.log(`- SUPABASE_SERVICE_ROLE_KEY: ${present(mergedEnv.SUPABASE_SERVICE_ROLE_KEY)}`);
console.log(`- SUPABASE_JWT_SECRET: ${present(mergedEnv.SUPABASE_JWT_SECRET)}`);

if (diagnostics.failures.length > 0) {
  console.error("\nSupabase environment diagnostics failed:");
  for (const failure of diagnostics.failures) console.error(`- ${failure}`);
  console.error("\nAlign SUPABASE_URL, NEXT_PUBLIC_SUPABASE_URL and SUPABASE_PROJECT_REF to the same project before deploying Edge Functions.");
  process.exit(1);
}

console.log("\nSupabase environment diagnostics passed.");
if (diagnostics.warnings.length > 0) {
  console.log("Warnings:");
  for (const warning of diagnostics.warnings) console.log(`- ${warning}`);
}
