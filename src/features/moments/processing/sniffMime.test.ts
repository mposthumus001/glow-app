import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { sniffImageMime } from "./sniffMime.ts";

describe("sniffImageMime", () => {
  it("detects JPEG magic bytes", () => {
    const buf = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
    const result = sniffImageMime(buf, "image/jpeg");
    assert.equal(result.ok, true);
    if (result.ok) assert.equal(result.mime, "image/jpeg");
  });

  it("detects PNG magic bytes", () => {
    const buf = Buffer.from([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00,
    ]);
    const result = sniffImageMime(buf);
    assert.equal(result.ok, true);
    if (result.ok) assert.equal(result.mime, "image/png");
  });

  it("rejects unknown bytes", () => {
    const result = sniffImageMime(Buffer.from("not-an-image"));
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.error, "unsupported_image");
  });

  it("rejects declared MIME mismatch", () => {
    const buf = Buffer.from([0xff, 0xd8, 0xff, 0xe0]);
    const result = sniffImageMime(buf, "image/png");
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.error, "mime_mismatch");
  });
});
