import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";

const here = dirname(fileURLToPath(import.meta.url));

describe("processMomentMedia pipeline contract", () => {
  const src = readFileSync(join(here, "processMomentMedia.ts"), "utf8");
  const reprocessSrc = readFileSync(join(here, "reprocessMomentMedia.ts"), "utf8");

  it("uploads raw Buffers with image/webp content type", () => {
    assert.match(src, /\.upload\(displayPath, displayUploadBody/);
    assert.match(src, /\.upload\(thumbPath, thumbnailUploadBody/);
    assert.match(src, /contentType: "image\/webp"/);
    assert.doesNotMatch(src, /\.toString\(\)/);
    assert.doesNotMatch(src, /JSON\.stringify\(.*display/);
  });

  it("validates stored objects before marking ready", () => {
    assert.match(src, /downloadAndValidateStoredWebp/);
    const completeIndex = src.indexOf("complete_moment_media_processing");
    const displayVerifyIndex = src.indexOf("storedDisplay = await downloadAndValidateStoredWebp");
    const thumbVerifyIndex = src.indexOf("storedThumb = await downloadAndValidateStoredWebp");
    assert.ok(displayVerifyIndex > -1);
    assert.ok(thumbVerifyIndex > displayVerifyIndex);
    assert.ok(completeIndex > thumbVerifyIndex);
  });

  it("deletes the original only after stored outputs validate", () => {
    const deleteIndex = src.indexOf(".remove([originalPath])");
    const thumbVerifyIndex = src.indexOf("storedThumb = await downloadAndValidateStoredWebp");
    const completeIndex = src.indexOf("complete_moment_media_processing");
    assert.ok(deleteIndex > thumbVerifyIndex);
    assert.ok(deleteIndex > completeIndex);
  });

  it("cleans up partial uploads and marks processing failed on stored validation errors", () => {
    assert.match(src, /failProcessing\(admin, mediaId, "stored_display_invalid"/);
    assert.match(src, /failProcessing\(admin, mediaId, "stored_thumb_invalid"/);
    assert.match(src, /failProcessing\(admin, mediaId, "upload_thumb_failed", \[displayPath\]\)/);
  });

  it("exposes an idempotent reprocess path when originals still exist", () => {
    assert.match(reprocessSrc, /reprocessMomentMediaIfNeeded/);
    assert.match(reprocessSrc, /storedOutputsValid/);
    assert.match(reprocessSrc, /retry_moment_media_processing/);
    assert.match(reprocessSrc, /reupload_required/);
  });
});
