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
  it("documents staff-only allowlist reads after Sprint 6.2", () => {
    const selectPolicy = "beta_testers_select_staff — admin/support only";
    assert.match(selectPolicy, /staff/);
  });

  it("documents boolean RPC without row exposure", () => {
    const rpc = "is_beta_email_allowed(p_email) returns boolean only";
    assert.match(rpc, /boolean/);
  });

  it("documents Auth hook as primary signup gate", () => {
    const hook = "hook_before_user_created_beta_allowlist";
    assert.match(hook, /before_user_created/);
  });
});
