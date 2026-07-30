import { existsSync, readFileSync } from "node:fs";

export function parseEnvFile(path) {
  if (!existsSync(path)) return {};
  return Object.fromEntries(
    readFileSync(path, "utf8")
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#") && line.includes("="))
      .map((line) => {
        const index = line.indexOf("=");
        return [line.slice(0, index), line.slice(index + 1).replace(/^["']|["']$/g, "")];
      }),
  );
}

export function mergeEnv(processEnv = process.env, fileEnv = {}) {
  return Object.fromEntries(
    Object.entries({ ...processEnv, ...fileEnv }).map(([key, value]) => [
      key,
      fileEnv[key] === "" && processEnv[key] ? processEnv[key] : value,
    ]),
  );
}

export function projectRefFromSupabaseUrl(value) {
  try {
    const host = new URL(value || "").hostname;
    const [ref, supabase, co] = host.split(".");
    return supabase === "supabase" && co === "co" && /^[a-z0-9]{20}$/.test(ref) ? ref : "";
  } catch {
    return "";
  }
}

export function supabaseJwtInfo(value) {
  try {
    const [, encodedPayload] = String(value || "").split(".");
    if (!encodedPayload) return { ref: "", role: "" };
    const base64 = encodedPayload.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(encodedPayload.length / 4) * 4, "=");
    const payload = JSON.parse(Buffer.from(base64, "base64").toString("utf8"));
    return {
      ref: typeof payload.ref === "string" && /^[a-z0-9]{20}$/.test(payload.ref) ? payload.ref : "",
      role: typeof payload.role === "string" ? payload.role : "",
    };
  } catch {
    return { ref: "", role: "" };
  }
}

export function supabaseEnvDiagnostics({ fileEnv = {}, processEnv = process.env, mergedEnv = {} } = {}) {
  const fileSupabaseRef = projectRefFromSupabaseUrl(fileEnv.SUPABASE_URL || fileEnv.NEXT_PUBLIC_SUPABASE_URL);
  const fileAnonInfo = supabaseJwtInfo(fileEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY || fileEnv.SUPABASE_ANON_KEY);
  const fileServiceRoleInfo = supabaseJwtInfo(fileEnv.SUPABASE_SERVICE_ROLE_KEY);
  const fileAnonKeyRef = fileAnonInfo.ref;
  const fileServiceRoleRef = fileServiceRoleInfo.ref;
  const processSupabaseRef = projectRefFromSupabaseUrl(processEnv.SUPABASE_URL || processEnv.NEXT_PUBLIC_SUPABASE_URL);
  const processAnonInfo = supabaseJwtInfo(processEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY || processEnv.SUPABASE_ANON_KEY);
  const processServiceRoleInfo = supabaseJwtInfo(processEnv.SUPABASE_SERVICE_ROLE_KEY);
  const processAnonKeyRef = processAnonInfo.ref;
  const processServiceRoleRef = processServiceRoleInfo.ref;
  const effectiveSupabaseRef = projectRefFromSupabaseUrl(mergedEnv.SUPABASE_URL || mergedEnv.NEXT_PUBLIC_SUPABASE_URL);
  const anonInfo = supabaseJwtInfo(mergedEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY || mergedEnv.SUPABASE_ANON_KEY);
  const serviceRoleInfo = supabaseJwtInfo(mergedEnv.SUPABASE_SERVICE_ROLE_KEY);
  const anonKeyRef = anonInfo.ref;
  const serviceRoleRef = serviceRoleInfo.ref;
  const configuredProjectRef = mergedEnv.SUPABASE_PROJECT_REF || "";
  const failures = [];
  const warnings = [];

  if (fileSupabaseRef && processSupabaseRef && fileSupabaseRef !== processSupabaseRef) {
    warnings.push(`Conflicting Supabase project refs: frontend/.env.local uses ${fileSupabaseRef}, process env uses ${processSupabaseRef}`);
  }
  if (fileSupabaseRef && fileAnonKeyRef && fileSupabaseRef !== fileAnonKeyRef) {
    failures.push(`frontend/.env.local Supabase URL ref (${fileSupabaseRef}) must match its anon key ref (${fileAnonKeyRef})`);
  }
  if (fileAnonKeyRef && fileAnonInfo.role !== "anon") {
    failures.push(`frontend/.env.local anon key role must be anon, found ${fileAnonInfo.role || "<unset>"}`);
  }
  if (fileSupabaseRef && fileServiceRoleRef && fileSupabaseRef !== fileServiceRoleRef) {
    failures.push(`frontend/.env.local Supabase URL ref (${fileSupabaseRef}) must match its service role key ref (${fileServiceRoleRef})`);
  }
  if (fileServiceRoleRef && fileServiceRoleInfo.role !== "service_role") {
    failures.push(`frontend/.env.local service role key role must be service_role, found ${fileServiceRoleInfo.role || "<unset>"}`);
  }
  if (processSupabaseRef && processAnonKeyRef && processSupabaseRef !== processAnonKeyRef) {
    failures.push(`process env Supabase URL ref (${processSupabaseRef}) must match its anon key ref (${processAnonKeyRef})`);
  }
  if (processAnonKeyRef && processAnonInfo.role !== "anon") {
    failures.push(`process env anon key role must be anon, found ${processAnonInfo.role || "<unset>"}`);
  }
  if (processSupabaseRef && processServiceRoleRef && processSupabaseRef !== processServiceRoleRef) {
    failures.push(`process env Supabase URL ref (${processSupabaseRef}) must match its service role key ref (${processServiceRoleRef})`);
  }
  if (processServiceRoleRef && processServiceRoleInfo.role !== "service_role") {
    failures.push(`process env service role key role must be service_role, found ${processServiceRoleInfo.role || "<unset>"}`);
  }
  if (effectiveSupabaseRef && !configuredProjectRef) {
    failures.push(`SUPABASE_PROJECT_REF is required. Set SUPABASE_PROJECT_REF=${effectiveSupabaseRef}`);
  }
  if (configuredProjectRef && effectiveSupabaseRef && configuredProjectRef !== effectiveSupabaseRef) {
    failures.push(`SUPABASE_PROJECT_REF (${configuredProjectRef}) must match Supabase URL project ref ${effectiveSupabaseRef}`);
  }
  if (anonKeyRef && effectiveSupabaseRef && anonKeyRef !== effectiveSupabaseRef) {
    failures.push(`NEXT_PUBLIC_SUPABASE_ANON_KEY project ref (${anonKeyRef}) must match Supabase URL project ref ${effectiveSupabaseRef}`);
  }
  if (anonKeyRef && anonInfo.role !== "anon") {
    failures.push(`NEXT_PUBLIC_SUPABASE_ANON_KEY role must be anon, found ${anonInfo.role || "<unset>"}`);
  }
  if (serviceRoleRef && effectiveSupabaseRef && serviceRoleRef !== effectiveSupabaseRef) {
    failures.push(`SUPABASE_SERVICE_ROLE_KEY project ref (${serviceRoleRef}) must match Supabase URL project ref ${effectiveSupabaseRef}`);
  }
  if (serviceRoleRef && serviceRoleInfo.role !== "service_role") {
    failures.push(`SUPABASE_SERVICE_ROLE_KEY role must be service_role, found ${serviceRoleInfo.role || "<unset>"}`);
  }

  return {
    anonKeyRef,
    anonKeyRole: anonInfo.role,
    configuredProjectRef,
    effectiveSupabaseRef,
    fileAnonKeyRef,
    fileAnonKeyRole: fileAnonInfo.role,
    fileServiceRoleRef,
    fileServiceRoleRole: fileServiceRoleInfo.role,
    fileSupabaseRef,
    processAnonKeyRef,
    processAnonKeyRole: processAnonInfo.role,
    processServiceRoleRef,
    processServiceRoleRole: processServiceRoleInfo.role,
    processSupabaseRef,
    serviceRoleRef,
    serviceRoleRole: serviceRoleInfo.role,
    failures,
    warnings,
  };
}
