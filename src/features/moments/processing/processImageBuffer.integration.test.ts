import assert from "node:assert/strict";
import { describe, it } from "node:test";
import sharp from "sharp";

import { ensureUploadBuffer, validateWebpBuffer } from "./webpBuffer.ts";

describe("processImageBuffer integration", () => {
  it("returns validated dedicated WebP buffers for display and thumbnail", async () => {
    const { processImageBuffer } = await import("./processImageBuffer.ts");

    const input = await sharp({
      create: {
        width: 1200,
        height: 800,
        channels: 3,
        background: { r: 120, g: 80, b: 200 },
      },
    })
      .jpeg()
      .toBuffer();

    const result = await processImageBuffer(input);
    assert.equal(result.ok, true);
    if (!result.ok) return;

    for (const key of ["display", "thumbnail"] as const) {
      const buffer = result.outputs[key];
      assert.equal(Buffer.isBuffer(buffer), true);
      assert.ok(buffer.byteLength > 0);
      assert.equal(buffer.subarray(0, 4).toString("ascii"), "RIFF");
      assert.equal(buffer.subarray(8, 12).toString("ascii"), "WEBP");

      const validation = await validateWebpBuffer(buffer);
      assert.equal(validation.ok, true);
    }
  });

  it("does not accept UTF-8 corrupted Sharp output", async () => {
    const generated = await sharp({
      create: { width: 200, height: 150, channels: 3, background: "#654321" },
    })
      .webp()
      .toBuffer({ resolveWithObject: true });

    const corrupted = ensureUploadBuffer(
      Buffer.from(generated.data.toString("utf8"), "utf8"),
    );
    const validation = await validateWebpBuffer(corrupted);
    assert.equal(validation.ok, false);
  });
});
