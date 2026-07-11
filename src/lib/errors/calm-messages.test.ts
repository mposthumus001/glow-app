import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  calmAuthErrorMessage,
  calmUserFacingError,
} from "./calm-messages.ts";

describe("calmAuthErrorMessage", () => {
  it("maps known auth errors to calm copy", () => {
    assert.equal(
      calmAuthErrorMessage("Invalid login credentials"),
      "That email or password didn't match. Take a breath and try again.",
    );
  });

  it("hides UUID-bearing technical errors", () => {
    const raw =
      "insert failed for parent_id 550e8400-e29b-41d4-a716-446655440000";
    assert.equal(
      calmAuthErrorMessage(raw),
      "Something didn't work just now. Please try again.",
    );
  });
});

describe("calmUserFacingError", () => {
  it("returns profile-friendly fallback for RLS errors", () => {
    assert.equal(
      calmUserFacingError("new row violates row-level security policy", "profile"),
      "We couldn't save that just now. Your details are still here — try again.",
    );
  });

  it("passes through short user-safe messages", () => {
    assert.equal(
      calmUserFacingError("Passwords do not match.", "profile"),
      "Passwords do not match.",
    );
  });
});
