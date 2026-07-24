const appOrigin = process.env.APP_ORIGIN || process.env.NEXT_PUBLIC_APP_URL;
const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const telegramSecret = process.env.TELEGRAM_WEBHOOK_SECRET;

const failures = [];
const warnings = [];

function requireUrl(name, value) {
  if (!value || !/^https?:\/\//.test(value)) {
    failures.push(`${name} must be an http(s) URL`);
    return null;
  }
  return value.replace(/\/$/, "");
}

async function fetchWithTimeout(url, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), Number(process.env.SMOKE_TIMEOUT_MS ?? 10_000));
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

async function expectStatus(url, expected = [200]) {
  const response = await fetchWithTimeout(url);
  if (!expected.includes(response.status)) {
    failures.push(`${url} returned ${response.status}; expected ${expected.join("/")}`);
  }
  return response;
}

const origin = requireUrl("APP_ORIGIN", appOrigin);
if (origin) {
  const health = await expectStatus(`${origin}/api/health`, [200]);
  try {
    const healthBody = await health.json();
    if (healthBody.status !== "ok") failures.push("/api/health did not return status ok");
  } catch {
    failures.push("/api/health did not return JSON");
  }

  const home = await expectStatus(`${origin}/pt`, [200]);
  const requiredHeaders = {
    "x-content-type-options": "nosniff",
    "x-frame-options": "DENY",
    "referrer-policy": "strict-origin-when-cross-origin",
  };
  for (const [header, expected] of Object.entries(requiredHeaders)) {
    const actual = home.headers.get(header);
    if (actual !== expected) failures.push(`${header} is ${actual ?? "missing"}; expected ${expected}`);
  }

  for (const route of ["/pt/factory", "/pt/lending", "/pt/security", "/robots.txt", "/sitemap.xml"]) {
    await expectStatus(`${origin}${route}`, [200]);
  }
}

if (supabaseUrl) {
  const functionsBase = `${supabaseUrl.replace(/\/$/, "")}/functions/v1`;
  for (const functionName of ["token-ai", "lending-ai"]) {
    const response = await fetchWithTimeout(`${functionsBase}/${functionName}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{}",
    });
    if (response.status !== 401) {
      failures.push(`${functionName} unauthenticated smoke returned ${response.status}; expected 401`);
    }
  }

  if (telegramSecret) {
    const response = await fetchWithTimeout(`${functionsBase}/telegram-bot`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-telegram-bot-api-secret-token": telegramSecret,
      },
      body: JSON.stringify({ update_id: 1 }),
    });
    if (![200, 503].includes(response.status)) {
      failures.push(`telegram-bot smoke returned ${response.status}; expected 200 or configuration 503`);
    }
  } else {
    warnings.push("TELEGRAM_WEBHOOK_SECRET missing; skipped telegram webhook smoke");
  }
} else {
  warnings.push("SUPABASE_URL/NEXT_PUBLIC_SUPABASE_URL missing; skipped Edge Function smoke");
}

if (failures.length > 0) {
  console.error("Smoke tests failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  if (warnings.length > 0) {
    console.error("\nWarnings:");
    for (const warning of warnings) console.error(`- ${warning}`);
  }
  process.exit(1);
}

console.log("Smoke tests passed.");
if (warnings.length > 0) {
  console.log("Warnings:");
  for (const warning of warnings) console.log(`- ${warning}`);
}
