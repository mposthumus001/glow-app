import assert from "node:assert/strict";
import { describe, it } from "node:test";
import sharp from "sharp";

import {
  describeStorageBinary,
  detectStorageDataType,
  ensureUploadBuffer,
  storageDataToBuffer,
  toWebpUploadBody,
} from "./storageBinary.ts";

describe("storageBinary", () => {
  it("converts Supabase Blob download correctly", async () => {
    const source = await sharp({
      create: { width: 40, height: 30, channels: 3, background: "#abc" },
    })
      .webp()
      .toBuffer();
    const blob = new Blob([source], { type: "image/webp" });
    assert.equal(detectStorageDataType(blob), "blob");

    const converted = await storageDataToBuffer(blob);
    assert.equal(converted.byteLength, source.byteLength);
    assert.equal(converted.equals(source), true);
  });

  it("converts ArrayBuffer correctly", async () => {
    const source = new Uint8Array([1, 2, 3, 4]).buffer;
    const converted = await storageDataToBuffer(source);
    assert.deepEqual([...converted], [1, 2, 3, 4]);
  });

  it("converts Uint8Array with non-zero byteOffset correctly", async () => {
    const pool = new Uint8Array([9, 9, 9, 1, 2, 3, 4, 9, 9]);
    const view = pool.subarray(3, 7);
    assert.equal(view.byteOffset, 3);

    const converted = await storageDataToBuffer(view);
    assert.deepEqual([...converted], [1, 2, 3, 4]);
    assert.equal(converted.byteLength, 4);
  });

  it("does not expand pooled Node Buffer backing arrays", async () => {
    const generated = await sharp({
      create: { width: 80, height: 60, channels: 3, background: "#654321" },
    })
      .webp()
      .toBuffer({ resolveWithObject: true });

    const pool = new ArrayBuffer(generated.data.length + 8192);
    const offset = 256;
    new Uint8Array(pool).set(generated.data, offset);
    const view = new Uint8Array(pool, offset, generated.data.length);

    const copied = ensureUploadBuffer(view);
    assert.equal(copied.byteLength, generated.data.length);
    assert.equal(copied.equals(generated.data), true);

    const wrong = Buffer.from(view.buffer);
    assert.ok(wrong.byteLength > copied.byteLength);
  });

  it("wraps upload bytes in a WebP Blob without changing length", async () => {
    const source = await sharp({
      create: { width: 50, height: 40, channels: 3, background: "#fedcba" },
    })
      .webp()
      .toBuffer();

    const body = toWebpUploadBody(source);
    assert.equal(body.type, "image/webp");
    assert.equal(body.size, source.byteLength);

    const roundtrip = await storageDataToBuffer(body);
    assert.equal(roundtrip.byteLength, source.byteLength);
    assert.equal(roundtrip.equals(source), true);
  });

  it("describes storage binary metadata safely", () => {
    const buffer = Buffer.from([1, 2, 3]);
    const described = describeStorageBinary(buffer);
    assert.equal(described.type, "buffer");
    assert.equal(described.byteLength, 3);
    assert.equal(described.isBuffer, true);
  });
});
