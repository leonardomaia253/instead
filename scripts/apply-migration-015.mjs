import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const token = process.env.SUPABASE_ACCESS_TOKEN;
if (!token) {
  console.error("SUPABASE_ACCESS_TOKEN is required in env");
  process.exit(1);
}

const projectRef = process.env.SUPABASE_PROJECT_REF;
if (!projectRef || !/^[a-z0-9]{20}$/.test(projectRef)) {
  console.error("SUPABASE_PROJECT_REF is required and must be a 20-character Supabase project ref");
  process.exit(1);
}

const sql = readFileSync(resolve("supabase/migrations/015_platform_prices.sql"), "utf-8");

const res = await fetch(
  `https://api.supabase.com/v1/projects/${projectRef}/database/query`,
  {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query: sql }),
  }
);

const text = await res.text();
console.log("Status:", res.status);
console.log("Body:", text);
