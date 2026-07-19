export type StorageBinaryInput =
  | Blob
  | ArrayBuffer
  | Uint8Array
  | Buffer;

export type StorageDataType =
  | "buffer"
  | "arraybuffer"
  | "uint8array"
  | "blob"
  | "unknown";

export function detectStorageDataType(data: unknown): StorageDataType {
  if (Buffer.isBuffer(data)) return "buffer";
  if (data instanceof ArrayBuffer) return "arraybuffer";
  if (ArrayBuffer.isView(data)) return "uint8array";
  if (typeof Blob !== "undefined" && data instanceof Blob) return "blob";
  return "unknown";
}

/** Safe conversion for Supabase Storage download payloads — never uses toString(). */
export async function storageDataToBuffer(
  data: StorageBinaryInput,
): Promise<Buffer> {
  if (Buffer.isBuffer(data)) {
    return Buffer.from(data);
  }

  if (data instanceof ArrayBuffer) {
    return Buffer.from(data);
  }

  if (ArrayBuffer.isView(data)) {
    return Buffer.from(data.buffer, data.byteOffset, data.byteLength);
  }

  if (typeof Blob !== "undefined" && data instanceof Blob) {
    return Buffer.from(await data.arrayBuffer());
  }

  throw new Error("unsupported_storage_binary_type");
}

/** Copy bytes into a dedicated Node Buffer safe for Sharp and Storage upload. */
export function ensureUploadBuffer(input: Buffer | Uint8Array): Buffer {
  if (Buffer.isBuffer(input)) {
    return Buffer.from(input);
  }
  return Buffer.from(input.buffer, input.byteOffset, input.byteLength);
}

/**
 * Prefer Blob upload bodies — Supabase uses multipart FormData for Blob, which
 * avoids raw Buffer PUT edge cases in some serverless fetch implementations.
 */
export function toWebpUploadBody(buffer: Buffer): Blob {
  const copy = ensureUploadBuffer(buffer);
  return new Blob([Uint8Array.from(copy)], { type: "image/webp" });
}

export function describeStorageBinary(data: unknown): {
  type: StorageDataType;
  byteLength: number | null;
  isBuffer: boolean;
} {
  const type = detectStorageDataType(data);
  if (Buffer.isBuffer(data)) {
    return { type, byteLength: data.byteLength, isBuffer: true };
  }
  if (data instanceof ArrayBuffer) {
    return { type, byteLength: data.byteLength, isBuffer: false };
  }
  if (ArrayBuffer.isView(data)) {
    return { type, byteLength: data.byteLength, isBuffer: false };
  }
  if (typeof Blob !== "undefined" && data instanceof Blob) {
    return { type, byteLength: data.size, isBuffer: false };
  }
  return { type, byteLength: null, isBuffer: false };
}
