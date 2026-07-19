import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  calmMessageForOutcome,
  mapProcessingErrorToOutcome,
  outcomeAllowsRetry,
} from "./outcomes.ts";

describe("moment media outcomes (Sprint 9.2B contract)", () => {
  it("maps safe error codes to UI outcomes", () => {
    assert.equal(mapProcessingErrorToOutcome("unsupported_mime"), "unsupported_image");
    assert.equal(mapProcessingErrorToOutcome("image_too_large"), "image_too_large");
    assert.equal(mapProcessingErrorToOutcome("quota_exceeded"), "quota_exceeded");
    assert.equal(mapProcessingErrorToOutcome("decode_failed"), "processing_failed");
    assert.equal(mapProcessingErrorToOutcome("reupload_required"), "retry_available");
    assert.equal(mapProcessingErrorToOutcome("stored_display_invalid"), "processing_failed");
  });

  it("returns calm parent-facing messages", () => {
    assert.match(calmMessageForOutcome("ready"), /ready/i);
    assert.match(calmMessageForOutcome("processing_failed"), /try again/i);
  });

  it("flags retry for failed outcomes", () => {
    assert.equal(outcomeAllowsRetry("retry_available"), true);
    assert.equal(outcomeAllowsRetry("ready"), false);
  });
});
