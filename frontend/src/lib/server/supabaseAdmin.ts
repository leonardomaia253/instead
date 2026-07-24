import { createClient } from "@supabase/supabase-js";

function requiredServerEnv(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not configured`);
  return value;
}

export function createSupabaseAdminClient() {
  return createClient(requiredServerEnv("SUPABASE_URL"), requiredServerEnv("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
