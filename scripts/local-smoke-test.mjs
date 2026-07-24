import { spawn } from "node:child_process";

const port = Number(process.env.LOCAL_SMOKE_PORT ?? 4317);
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

const startCommand = ["pnpm", "--filter", "instead-frontend", "exec", "next", "start", "-p", String(port), "-H", "127.0.0.1"];
const server = process.platform === "win32"
  ? spawn("cmd.exe", ["/d", "/s", "/c", startCommand.join(" ")], {
      cwd: process.cwd(),
      env: { ...process.env, NODE_ENV: "production", PORT: String(port) },
      stdio: ["ignore", "pipe", "pipe"],
    })
  : spawn(startCommand[0], startCommand.slice(1), {
      cwd: process.cwd(),
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
    "/pt/admin/lending",
    "/pt/admin/settings",
  ]) {
    const response = await expectStatus(adminRoute, [307, 308], { redirect: "manual" });
    const location = response.headers.get("location") ?? "";
    if (!location.includes("/pt/admin/login")) {
      failures.push(`${adminRoute} did not redirect unauthenticated users to admin login`);
    }
  }
} catch (error) {
  failures.push(error instanceof Error ? error.message : "Unexpected local smoke failure");
} finally {
  server.kill();
}

if (failures.length > 0) {
  console.error("Local smoke tests failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  console.error("\nServer output:");
  console.error(output.slice(-4_000));
  process.exit(1);
}

console.log("Local smoke tests passed.");
