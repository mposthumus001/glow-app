import assert from "node:assert/strict";
import { describe, it } from "node:test";
import sharp from "sharp";

import { analyzeStoredWebpBuffer } from "./diagnoseStoredWebp.ts";

describe("diagnoseStoredWebp", () => {
  it("detects corrupt stored bytes without leaking paths or tokens", async () => {
    const generated = await sharp({
      create: { width: 800, height: 600, channels: 3, background: "#336699" },
    })
      .webp()
      .toBuffer();

    const valid = await analyzeStoredWebpBuffer("display", generated);
    assert.equal(valid.sharpOk, true);
    assert.equal(valid.signature, "riff_webp");
    assert.match(valid.first12Hex, /^52494646/);

    const corrupted = Buffer.from(generated.toString("utf8"), "utf8");
    const invalid = await analyzeStoredWebpBuffer("display", corrupted);
    assert.equal(invalid.sharpOk, false);
    assert.equal(invalid.signature, "utf8_corrupted_webp");
    assert.match(invalid.first12Hex, /efbfbd/);
  });
});
