import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { diagnosticFromValidation } from "./momentProcessingDiagnostics.ts";

describe("momentProcessingDiagnostics", () => {
  it("builds privacy-safe structured stage diagnostics", () => {
    const diagnostic = diagnosticFromValidation({
      mediaId: "media-123",
      stage: "post_upload_webp_validation_display",
      success: false,
      byteLength: 327512,
      isBuffer: true,
      format: "webp",
      width: 1706,
      height: 2048,
      processingErrorCategory: "webp_metadata_failed",
      storageDataType: "blob",
    });

    assert.equal(diagnostic.feature, "moments");
    assert.equal(diagnostic.stage, "post_upload_webp_validation_display");
    assert.equal(diagnostic.processingErrorCategory, "webp_metadata_failed");
    assert.equal(diagnostic.byteLength, 327512);
    assert.equal(JSON.stringify(diagnostic).includes("storage_path"), false);
  });
});
