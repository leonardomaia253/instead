import { spawn, spawnSync } from "node:child_process";
import net from "node:net";
import { fileURLToPath } from "node:url";

async function getFreePort() {
  if (process.env.LOCAL_SMOKE_PORT) return Number(process.env.LOCAL_SMOKE_PORT);
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.unref();
    server.on("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      const selectedPort = typeof address === "object" && address ? address.port : 4317;
      server.close(() => resolve(selectedPort));
    });
  });
}

const port = await getFreePort();
const origin = `http://127.0.0.1:${port}`;
const timeoutMs = Number(process.env.LOCAL_SMOKE_TIMEOUT_MS ?? 120_000);
const failures = [];

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
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

async function waitForServer() {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetchWithTimeout(`${origin}/api/health`);
      if (response.ok) return;
    } catch {
    }
    await wait(1_000);
  }
  throw new Error(`Next server did not become healthy on ${origin}`);
}

async function expectStatus(path, expected = [200], options = {}) {
  const response = await fetchWithTimeout(`${origin}${path}`, options);
  if (!expected.includes(response.status)) {
    failures.push(`${path} returned ${response.status}; expected ${expected.join("/")}`);
  }
  return response;
}

function assertHeader(response, name, expected) {
  const actual = response.headers.get(name);
  if (actual !== expected) failures.push(`${name} is ${actual ?? "missing"}; expected ${expected}`);
}

const frontendDir = fileURLToPath(new URL("../frontend/", import.meta.url));
const startCommand = ["pnpm", "exec", "next", "start", "-p", String(port), "-H", "127.0.0.1"];
const server = process.platform === "win32"
  ? spawn("cmd.exe", ["/d", "/s", "/c", startCommand.join(" ")], {
      cwd: frontendDir,
      env: { ...process.env, NODE_ENV: "production", PORT: String(port) },
      stdio: ["ignore", "pipe", "pipe"],
    })
  : spawn(startCommand[0], startCommand.slice(1), {
      cwd: frontendDir,
      env: { ...process.env, NODE_ENV: "production", PORT: String(port) },
      stdio: ["ignore", "pipe", "pipe"],
    });

let output = "";
server.stdout.on("data", (chunk) => {
  output += chunk.toString();
});
server.stderr.on("data", (chunk) => {
  output += chunk.toString();
});

try {
  await waitForServer();

  const health = await expectStatus("/api/health");
  const healthBody = await health.json();
  if (healthBody.status !== "ok") failures.push("/api/health did not return status ok");
  if (healthBody.service !== "instead-frontend") failures.push("/api/health returned unexpected service");
  if (health.headers.get("cache-control")?.includes("no-store") !== true) {
    failures.push("/api/health must be uncached");
  }

  const home = await expectStatus("/pt");
  assertHeader(home, "x-content-type-options", "nosniff");
  assertHeader(home, "x-frame-options", "DENY");
  assertHeader(home, "referrer-policy", "strict-origin-when-cross-origin");
  assertHeader(home, "permissions-policy", "camera=(), microphone=(), geolocation=()");

  for (const route of [
    "/pt/factory",
    "/pt/lending",
    "/pt/security",
    "/pt/admin/login",
    "/robots.txt",
    "/sitemap.xml",
  ]) {
    await expectStatus(route);
  }

  for (const adminRoute of [
    "/pt/admin",
    "/pt/admin/users",
    "/pt/admin/tokens",
    "/pt/admin/payments",
    "/pt/admin/lending",
    "/pt/admin/settings",
  ]) {
    const response = await expectStatus(adminRoute, [307, 308], { redirect: "manual" });
    const location = response.headers.get("location") ?? "";
    if (!location.includes("/pt/admin/login")) {
      failures.push(`${adminRoute} did not redirect unauthenticated users to admin login`);
    }
  }

  await expectStatus("/api/payments/checkout", [400, 500], {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ provider: "stripe", vertical: "token_factory" }),
  });
  await expectStatus("/api/payments/status", [400]);
  await expectStatus("/api/payments/webhooks/stripe", [400], { method: "POST", body: "{}" });
  await expectStatus("/api/payments/webhooks/pagarme", [400], { method: "POST", body: "{}" });
} catch (error) {
  failures.push(error instanceof Error ? error.message : "Unexpected local smoke failure");
} finally {
  if (process.platform === "win32") {
    spawnSync("taskkill", ["/pid", String(server.pid), "/T", "/F"], { stdio: "ignore" });
  } else {
    server.kill();
  }
}

if (failures.length > 0) {
  console.error("Local smoke tests failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  console.error("\nServer output:");
  console.error(output.slice(-4_000));
  process.exit(1);
}

console.log("Local smoke tests passed.");
