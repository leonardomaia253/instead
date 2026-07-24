import { readFileSync } from "node:fs";

const token = process.env.SUPABASE_ACCESS_TOKEN;
if (!token) {
  console.error("SUPABASE_ACCESS_TOKEN is required in env");
  process.exit(1);
}

const sql = readFileSync(
  "C:/Users/Administrator/instead/supabase/migrations/015_platform_prices.sql",
  "utf-8"
);

const res = await fetch(
  "https://api.supabase.com/v1/projects/wjvrcwvnznkisoerngal/database/query",
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
