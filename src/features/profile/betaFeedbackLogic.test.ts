import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  isDuplicateBetaFeedbackSubmission,
} from "./betaFeedbackLogic.ts";

describe("isDuplicateBetaFeedbackSubmission", () => {
  it("returns false without a prior submission", () => {
    assert.equal(isDuplicateBetaFeedbackSubmission(null), false);
  });

  it("blocks rapid duplicate submissions within the window", () => {
    const now = Date.parse("2026-07-12T10:00:30.000Z");
    const recent = "2026-07-12T10:00:10.000Z";
    assert.equal(isDuplicateBetaFeedbackSubmission(recent, now), true);
  });

  it("allows submissions after the window", () => {
    const now = Date.parse("2026-07-12T10:01:00.000Z");
    const recent = "2026-07-12T10:00:10.000Z";
    assert.equal(isDuplicateBetaFeedbackSubmission(recent, now), false);
  });
});
