import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  normaliseCustomTagLabels,
  normaliseTagLabel,
  validateCreateMomentInput,
  validateUploadSlotInput,
} from "./validation.ts";

describe("validateCreateMomentInput", () => {
  it("defaults to private visibility", () => {
    const result = validateCreateMomentInput({
      occurredOn: "2026-07-01",
    });
    assert.equal(result.ok, true);
  });

  it("rejects shared visibility in Sprint 9.1", () => {
    const result = validateCreateMomentInput({
      occurredOn: "2026-07-01",
      visibility: "shared_family",
    });
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.match(result.error, /not available yet/i);
    }
  });

  it("deduplicates custom tags case-insensitively", () => {
    const result = validateCreateMomentInput({
      occurredOn: "2026-07-01",
      customTagLabels: ["Holiday", " holiday ", "HOLIDAY"],
    });
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.value.customTagLabels.length, 1);
    }
  });
});

describe("normaliseTagLabel", () => {
  it("trims and lowercases", () => {
    assert.equal(normaliseTagLabel("  First Smile  "), "first smile");
  });
});

describe("normaliseCustomTagLabels", () => {
  it("isolates duplicates per normalisation", () => {
    assert.deepEqual(
      normaliseCustomTagLabels(["Park", "park", "Beach"]),
      ["Park", "Beach"],
    );
  });
});

describe("validateUploadSlotInput", () => {
  const momentId = "22222222-2222-4222-8222-222222222222";

  it("rejects unsupported MIME types", () => {
    const result = validateUploadSlotInput({
      momentId,
      mimeType: "video/mp4",
      sizeBytes: 1000,
    });
    assert.equal(result.ok, false);
  });

  it("rejects files over 8 MB", () => {
    const result = validateUploadSlotInput({
      momentId,
      mimeType: "image/jpeg",
      sizeBytes: 9 * 1024 * 1024,
    });
    assert.equal(result.ok, false);
  });

  it("accepts valid JPEG upload", () => {
    const result = validateUploadSlotInput({
      momentId,
      mimeType: "image/jpeg",
      sizeBytes: 1024,
    });
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.value.extension, "jpg");
    }
  });
});
