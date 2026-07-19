import assert from "node:assert/strict";
import { describe, it } from "node:test";
import sharp from "sharp";

import {
  buildPipelineBinaryTrace,
  classifyStoredSignature,
  ensureUploadBuffer,
  hasWebpSignature,
  validateWebpBuffer,
} from "./webpBuffer.ts";

describe("webpBuffer", () => {
  it("copies sliced Sharp output into a dedicated upload buffer", async () => {
    const generated = await sharp({
      create: { width: 120, height: 90, channels: 3, background: "#aabbcc" },
    })
      .webp()
      .toBuffer({ resolveWithObject: true });

    const pool = new ArrayBuffer(generated.data.length + 4096);
    const offset = 512;
    new Uint8Array(pool).set(generated.data, offset);
    const view = new Uint8Array(pool, offset, generated.data.length);

    const uploadBuffer = ensureUploadBuffer(view);
    assert.equal(uploadBuffer.byteLength, generated.data.length);
    assert.equal(uploadBuffer.equals(generated.data), true);
    assert.equal(hasWebpSignature(uploadBuffer), true);
  });

  it("validates generated WebP magic bytes and Sharp metadata", async () => {
    const generated = await sharp({
      create: { width: 64, height: 48, channels: 3, background: "#123456" },
    })
      .webp()
      .toBuffer();

    const buffer = ensureUploadBuffer(generated);
    assert.ok(buffer.byteLength > 0);
    assert.equal(buffer.subarray(0, 4).toString("ascii"), "RIFF");
    assert.equal(buffer.subarray(8, 12).toString("ascii"), "WEBP");

    const validation = await validateWebpBuffer(buffer);
    assert.equal(validation.ok, true);
    if (!validation.ok) return;
    assert.equal(validation.format, "webp");
    assert.ok(validation.width > 0);
    assert.ok(validation.height > 0);
  });

  it("rejects UTF-8 corrupted WebP bytes", async () => {
    const generated = await sharp({
      create: { width: 800, height: 600, channels: 3, background: "#abcdef" },
    })
      .webp()
      .toBuffer();

    const corrupted = Buffer.from(generated.toString("utf8"), "utf8");
    assert.equal(classifyStoredSignature(corrupted), "utf8_corrupted_webp");

    const validation = await validateWebpBuffer(corrupted);
    assert.equal(validation.ok, false);
    if (validation.ok) return;
    assert.equal(validation.code, "invalid_webp_signature");
  });

  it("rejects empty buffers", async () => {
    const validation = await validateWebpBuffer(Buffer.alloc(0));
    assert.equal(validation.ok, false);
    if (validation.ok) return;
    assert.equal(validation.code, "empty_buffer");
  });

  it("builds a privacy-safe pipeline trace snapshot", async () => {
    const original = await sharp({
      create: { width: 20, height: 20, channels: 3, background: "#fff" },
    })
      .jpeg()
      .toBuffer();
    const display = ensureUploadBuffer(
      (
        await sharp(original).webp().toBuffer({ resolveWithObject: true })
      ).data,
    );
    const thumbnail = ensureUploadBuffer(
      (
        await sharp(original)
          .resize(10, 10)
          .webp()
          .toBuffer({ resolveWithObject: true })
      ).data,
    );

    const trace = buildPipelineBinaryTrace({
      downloadedOriginalBytes: original.length,
      originalArrayBufferBytes: original.byteLength,
      originalBuffer: original,
      displayBuffer: display,
      thumbnailBuffer: thumbnail,
    });

    assert.equal(trace.originalIsBuffer, true);
    assert.equal(trace.displayIsBuffer, true);
    assert.equal(trace.thumbnailIsBuffer, true);
    assert.ok(trace.displayBufferBytes > 0);
    assert.ok(trace.thumbnailBufferBytes > 0);
    assert.equal(trace.displayHasWebpSignature, true);
    assert.equal(trace.thumbnailHasWebpSignature, true);
  });
});
