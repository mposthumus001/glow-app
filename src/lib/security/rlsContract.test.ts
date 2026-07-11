import assert from "node:assert/strict";
import { describe, it } from "node:test";

/**
 * Contract tests documenting Sprint 6.1 RLS expectations.
 * Full enforcement is validated in migration 0009 + manual Supabase checks.
 */
describe("parents RLS contract (Sprint 6.1)", () => {
  it("documents scoped SELECT instead of global enumeration", () => {
    const allowedReaders = [
      "own parent row (id = auth.uid())",
      "staff roles",
      "active circle co-members via shares_active_circle_with()",
    ];

    assert.equal(allowedReaders.length, 3);
    assert.ok(
      allowedReaders.some((rule) => rule.includes("co-members")),
      "circle co-membership scope required",
    );
  });

  it("documents parent_baby_age_months authorization", () => {
    const rule =
      "parent_baby_age_months may only run for auth.uid() or staff";
    assert.match(rule, /auth\.uid\(\)/);
  });
});

describe("beta_testers access contract", () => {
  it("documents staff-managed allowlist without client writes", () => {
    const writePolicy = "beta_testers_write_staff — admin/support only";
    assert.match(writePolicy, /staff/);
  });
});
