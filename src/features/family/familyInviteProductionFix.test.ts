import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";

import { mapInviteRpcError } from "./validation.ts";

const here = dirname(fileURLToPath(import.meta.url));
const fixMigrationPath = join(
  here,
  "..",
  "..",
  "..",
  "supabase",
  "migrations",
  "0022_fix_shared_family_invite_pgcrypto.sql",
);
const fixMigrationSql = readFileSync(fixMigrationPath, "utf8");

describe("Sprint 9.4B — production invite failure fix (0022)", () => {
  it("maps transaction_failed to generic calm copy", () => {
    assert.equal(
      mapInviteRpcError("transaction_failed"),
      "Something didn't work just now. Please try again.",
    );
  });

  it("0022 adds token helper with extensions search_path", () => {
    assert.match(fixMigrationSql, /shared_family_generate_invite_token_raw/);
    assert.match(fixMigrationSql, /set search_path = public, extensions/);
    assert.match(
      fixMigrationSql,
      /encode\(gen_random_bytes\(32\), 'hex'\)/,
    );
  });

  it("0022 routes create_shared_family_invite through token helper", () => {
    assert.match(
      fixMigrationSql,
      /v_raw_token := public\.shared_family_generate_invite_token_raw\(\)/,
    );
    assert.doesNotMatch(
      fixMigrationSql,
      /v_raw_token := encode\(gen_random_bytes\(32\), 'hex'\)/,
    );
  });

  it("0022 includes extensions in create invite RPC search_path", () => {
    assert.match(
      fixMigrationSql,
      /create_shared_family_invite[\s\S]*set search_path = public, auth, extensions/,
    );
  });
});
