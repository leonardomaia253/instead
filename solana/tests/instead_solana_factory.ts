import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";

describe("instead_solana_factory configuration", () => {
  it("uses the same non-placeholder program id in Anchor.toml and declare_id", () => {
    const anchorToml = readFileSync("Anchor.toml", "utf8");
    const libRs = readFileSync("programs/instead_solana_factory/src/lib.rs", "utf8");

    const configuredIds = [...anchorToml.matchAll(/instead_solana_factory\s*=\s*"([^"]+)"/g)].map((match) => match[1]);
    const declaredId = libRs.match(/declare_id!\("([^"]+)"\)/)?.[1];

    assert.ok(declaredId, "declare_id! must be present");
    assert.equal(configuredIds.length, 3, "localnet, devnet and mainnet ids must be configured");
    assert.ok(configuredIds.every((id) => id === declaredId), "Anchor.toml ids must match declare_id!");
    assert.notEqual(declaredId, "11111111111111111111111111111111", "program id must not be the System Program placeholder");
    assert.match(declaredId, /^[1-9A-HJ-NP-Za-km-z]{32,44}$/, "program id must be a base58 public key");
  });
});
