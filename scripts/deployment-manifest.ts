import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

type Json = Record<string, unknown>;

const deploymentsDir = resolve(process.cwd(), "deployments");

export function readDeploymentManifest(networkName: string) {
  const path = resolve(deploymentsDir, `${networkName}.json`);
  if (!existsSync(path)) return {};
  return JSON.parse(readFileSync(path, "utf8")) as Json;
}

export function writeDeploymentManifest(networkName: string, patch: Json) {
  mkdirSync(deploymentsDir, { recursive: true });
  const path = resolve(deploymentsDir, `${networkName}.json`);
  const current = readDeploymentManifest(networkName);
  const next = {
    ...current,
    ...patch,
    network: networkName,
    updatedAt: new Date().toISOString(),
  };
  writeFileSync(path, `${JSON.stringify(next, null, 2)}\n`);
  return next;
}
