import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  assertRequiredPublicEnv,
  getPublicEnvChecks,
  getSoftProductionGaps,
} from "./public-env.ts";

describe("getPublicEnvChecks", () => {
  it("reports missing Supabase public vars without values", () => {
    const checks = getPublicEnvChecks({
      NODE_ENV: "development",
    } as NodeJS.ProcessEnv);

    const ids = checks.map((c) => c.id);
    assert.ok(ids.includes("NEXT_PUBLIC_SUPABASE_URL"));
    assert.ok(ids.includes("NEXT_PUBLIC_SUPABASE_ANON_KEY"));
    assert.equal(
      checks.find((c) => c.id === "NEXT_PUBLIC_SUPABASE_URL")?.present,
      false,
    );
  });

  it("hard-requires only Supabase public vars", () => {
    const result = assertRequiredPublicEnv({
      NODE_ENV: "production",
      NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon",
    } as NodeJS.ProcessEnv);

    assert.deepEqual(result, { ok: true });
  });

  it("flags SITE_URL as a soft production gap", () => {
    const gaps = getSoftProductionGaps({
      NODE_ENV: "production",
      NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon",
    } as NodeJS.ProcessEnv);

    assert.deepEqual(gaps, ["NEXT_PUBLIC_SITE_URL"]);
  });

  it("fails when Supabase vars are missing", () => {
    const result = assertRequiredPublicEnv({
      NODE_ENV: "development",
    } as NodeJS.ProcessEnv);

    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.ok(result.missing.includes("NEXT_PUBLIC_SUPABASE_URL"));
      assert.ok(result.missing.includes("NEXT_PUBLIC_SUPABASE_ANON_KEY"));
    }
  });
});
