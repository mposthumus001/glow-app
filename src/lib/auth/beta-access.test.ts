import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  BETA_SIGNUP_DENIED_MESSAGE,
  isAllowlistStatusEligible,
  isBetaSignupDeniedMessage,
  normalizeBetaEmail,
} from "./beta-access.ts";

describe("normalizeBetaEmail", () => {
  it("trims and lowercases invited emails", () => {
    assert.equal(normalizeBetaEmail("  Tess.User@Example.COM "), "tess.user@example.com");
  });

  it("returns null for empty or whitespace-only input", () => {
    assert.equal(normalizeBetaEmail(""), null);
    assert.equal(normalizeBetaEmail("   "), null);
    assert.equal(normalizeBetaEmail(null), null);
  });
});

describe("isAllowlistStatusEligible", () => {
  it("accepts invited and active", () => {
    assert.equal(isAllowlistStatusEligible("invited"), true);
    assert.equal(isAllowlistStatusEligible("active"), true);
  });

  it("rejects revoked and missing", () => {
    assert.equal(isAllowlistStatusEligible("revoked"), false);
    assert.equal(isAllowlistStatusEligible(null), false);
  });
});

describe("isBetaSignupDeniedMessage", () => {
  it("detects hook rejection copy", () => {
    assert.equal(isBetaSignupDeniedMessage(BETA_SIGNUP_DENIED_MESSAGE), true);
    assert.equal(
      isBetaSignupDeniedMessage("not on the tester list"),
      true,
    );
  });

  it("ignores unrelated auth errors", () => {
    assert.equal(isBetaSignupDeniedMessage("Invalid login credentials"), false);
  });
});
