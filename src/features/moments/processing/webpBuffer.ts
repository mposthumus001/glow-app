import sharp from "sharp";

export type WebpValidationErrorCode =
  | "empty_buffer"
  | "not_a_buffer"
  | "invalid_webp_signature"
  | "webp_metadata_failed";

export type WebpValidationResult =
  | {
      ok: true;
      byteLength: number;
      width: number;
      height: number;
      format: "webp";
    }
  | { ok: false; code: WebpValidationErrorCode };

export type StoredSignatureClass =
  | "riff_webp"
  | "utf8_corrupted_webp"
  | "json_text"
  | "html"
  | "possible_base64_text"
  | "jpeg_signature"
  | "png_signature"
  | "zero_empty"
  | "unknown_binary";

/** Copy bytes into a dedicated Node Buffer safe for Storage upload. */
export function ensureUploadBuffer(input: Buffer | Uint8Array): Buffer {
  if (Buffer.isBuffer(input)) {
    return Buffer.from(input.buffer, input.byteOffset, input.byteLength);
  }
  return Buffer.from(input);
}

export function hasWebpSignature(buffer: Buffer): boolean {
  if (buffer.length < 12) return false;
  return (
    buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
    buffer.subarray(8, 12).toString("ascii") === "WEBP"
  );
}

export function classifyStoredSignature(buffer: Buffer): StoredSignatureClass {
  if (buffer.length === 0) return "zero_empty";

  const head = buffer.subarray(0, Math.min(12, buffer.length));
  const ascii = head.toString("ascii");

  if (ascii.startsWith("RIFF") && buffer.length >= 12) {
    const headerBytes = buffer.subarray(4, 12);
    if (
      headerBytes.includes(0xef) &&
      headerBytes.includes(0xbf) &&
      headerBytes.includes(0xbd)
    ) {
      return "utf8_corrupted_webp";
    }
    const webpTag = buffer.subarray(8, 12).toString("ascii");
    if (webpTag === "WEBP") return "riff_webp";
  }

  if (ascii.trimStart().startsWith("{") || ascii.trimStart().startsWith("[")) {
    return "json_text";
  }
  if (ascii.startsWith("<!") || ascii.toLowerCase().startsWith("<html")) {
    return "html";
  }
  if (
    /^[A-Za-z0-9+/=]+$/.test(
      buffer.subarray(0, Math.min(32, buffer.length)).toString("ascii"),
    )
  ) {
    return "possible_base64_text";
  }
  if (buffer[0] === 0xff && buffer[1] === 0xd8) return "jpeg_signature";
  if (buffer[0] === 0x89 && buffer[1] === 0x50) return "png_signature";
  return "unknown_binary";
}

export async function validateWebpBuffer(
  buffer: Buffer,
): Promise<WebpValidationResult> {
  if (!Buffer.isBuffer(buffer)) {
    return { ok: false, code: "not_a_buffer" };
  }
  if (buffer.byteLength === 0) {
    return { ok: false, code: "empty_buffer" };
  }
  if (!hasWebpSignature(buffer)) {
    return { ok: false, code: "invalid_webp_signature" };
  }

  try {
    const metadata = await sharp(buffer).metadata();
    if (
      metadata.format !== "webp" ||
      !metadata.width ||
      !metadata.height ||
      metadata.width <= 0 ||
      metadata.height <= 0
    ) {
      return { ok: false, code: "webp_metadata_failed" };
    }
    return {
      ok: true,
      byteLength: buffer.byteLength,
      width: metadata.width,
      height: metadata.height,
      format: "webp",
    };
  } catch {
    return { ok: false, code: "webp_metadata_failed" };
  }
}

export type PipelineBinaryTrace = {
  downloadedOriginalBytes: number;
  originalArrayBufferBytes: number;
  originalBufferBytes: number;
  originalIsBuffer: boolean;
  displayBufferBytes: number;
  displayIsBuffer: boolean;
  displayHasWebpSignature: boolean;
  thumbnailBufferBytes: number;
  thumbnailIsBuffer: boolean;
  thumbnailHasWebpSignature: boolean;
};

export function buildPipelineBinaryTrace(input: {
  downloadedOriginalBytes: number;
  originalArrayBufferBytes: number;
  originalBuffer: Buffer;
  displayBuffer: Buffer;
  thumbnailBuffer: Buffer;
}): PipelineBinaryTrace {
  return {
    downloadedOriginalBytes: input.downloadedOriginalBytes,
    originalArrayBufferBytes: input.originalArrayBufferBytes,
    originalBufferBytes: input.originalBuffer.byteLength,
    originalIsBuffer: Buffer.isBuffer(input.originalBuffer),
    displayBufferBytes: input.displayBuffer.byteLength,
    displayIsBuffer: Buffer.isBuffer(input.displayBuffer),
    displayHasWebpSignature: hasWebpSignature(input.displayBuffer),
    thumbnailBufferBytes: input.thumbnailBuffer.byteLength,
    thumbnailIsBuffer: Buffer.isBuffer(input.thumbnailBuffer),
    thumbnailHasWebpSignature: hasWebpSignature(input.thumbnailBuffer),
  };
}
