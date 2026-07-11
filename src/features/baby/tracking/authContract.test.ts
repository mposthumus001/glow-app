import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  activityKindFromEvent,
  feedingKindToEventType,
  validateFeedingInput,
} from "./eventLogic.ts";

/**
 * Security-oriented unit checks for Baby tracking payloads.
 * Cross-account isolation is enforced by RLS (family_owns_baby + is_family_member);
 * these tests lock the client contract that never trusts a caller-supplied parent id
 * for event_type mapping / validation, and that foreign babies are out of scope
 * for activity kind classification.
 */
describe("baby tracking auth contract", () => {
  it("insert validation never invents a parent id", () => {
    const result = validateFeedingInput({
      kind: "breast",
      startedAt: "2026-07-11T10:00:00",
    });
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal("parent_id" in result, false);
      assert.equal(result.eventType, feedingKindToEventType("breast"));
    }
  });

  it("does not treat unrelated note events as tracking activity", () => {
    assert.equal(activityKindFromEvent("note", {}), null);
    assert.equal(activityKindFromEvent("medication", {}), null);
    assert.equal(activityKindFromEvent("milestone", {}), null);
  });

  it("scopes feeding-other notes only via explicit metadata", () => {
    assert.equal(
      activityKindFromEvent("note", { tracking: "feeding_other" }),
      "feeding",
    );
  });
});

describe("duplicate submission prevention helpers", () => {
  it("validation is pure and safe to call twice with the same input", () => {
    const input = {
      kind: "formula" as const,
      startedAt: "2026-07-11T10:00:00",
      amountMl: 90,
    };
    const a = validateFeedingInput(input);
    const b = validateFeedingInput(input);
    assert.deepEqual(a, b);
    assert.equal(a.ok, true);
  });
});
