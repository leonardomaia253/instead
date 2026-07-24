// Verifica tabela platform_prices via service_role
const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://wjvrcwvnznkisoerngal.supabase.co";
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!serviceKey) {
  console.error("SUPABASE_SERVICE_ROLE_KEY is required in env");
  process.exit(1);
}

const res = await fetch(
  `${url}/rest/v1/platform_prices?select=*`,
  {
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
    },
  }
);
const data = await res.json();
console.log("Status:", res.status);
console.log("Rows:", JSON.stringify(data, null, 2));
