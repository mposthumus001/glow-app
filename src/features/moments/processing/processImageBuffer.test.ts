import assert from "node:assert/strict";
import { describe, it } from "node:test";
import sharp from "sharp";

import {
  MOMENTS_DISPLAY_MAX_EDGE,
  MOMENTS_THUMB_MAX_EDGE,
  processImageBuffer,
} from "./processImageBuffer.ts";

async function tinyJpeg(): Promise<Buffer> {
  return sharp({
    create: {
      width: 32,
      height: 24,
      channels: 3,
      background: { r: 200, g: 100, b: 50 },
    },
  })
    .jpeg()
    .toBuffer();
}

async function exifRotatedJpeg(): Promise<Buffer> {
  return sharp({
    create: {
      width: 40,
      height: 20,
      channels: 3,
      background: { r: 10, g: 20, b: 30 },
    },
  })
    .withMetadata({ orientation: 6 })
    .jpeg()
    .toBuffer();
}

describe("processImageBuffer", () => {
  it("produces WebP display and thumbnail under size caps", async () => {
    const input = await tinyJpeg();
    const result = await processImageBuffer(input);
    assert.equal(result.ok, true);
    if (!result.ok) return;

    const { outputs } = result;
    assert.ok(outputs.display.length > 0);
    assert.ok(outputs.thumbnail.length > 0);
    assert.ok(outputs.width <= MOMENTS_DISPLAY_MAX_EDGE);
    assert.ok(outputs.height <= MOMENTS_DISPLAY_MAX_EDGE);

    const thumbMeta = await sharp(outputs.thumbnail).metadata();
    assert.ok((thumbMeta.width ?? 0) <= MOMENTS_THUMB_MAX_EDGE);
    assert.ok((thumbMeta.height ?? 0) <= MOMENTS_THUMB_MAX_EDGE);
  });

  it("applies EXIF orientation before resize", async () => {
    const input = await exifRotatedJpeg();
    const result = await processImageBuffer(input);
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.outputs.width, 20);
    assert.equal(result.outputs.height, 40);
  });

  it("rejects empty buffers", async () => {
    const result = await processImageBuffer(Buffer.alloc(0));
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.error, "image_too_large");
  });

  it("returns dedicated WebP buffers that pass signature and metadata checks", async () => {
    const input = await tinyJpeg();
    const result = await processImageBuffer(input);
    assert.equal(result.ok, true);
    if (!result.ok) return;

    for (const buffer of [result.outputs.display, result.outputs.thumbnail]) {
      assert.equal(Buffer.isBuffer(buffer), true);
      assert.equal(buffer.subarray(0, 4).toString("ascii"), "RIFF");
      assert.equal(buffer.subarray(8, 12).toString("ascii"), "WEBP");
      const meta = await sharp(buffer).metadata();
      assert.equal(meta.format, "webp");
    }
  });
});
