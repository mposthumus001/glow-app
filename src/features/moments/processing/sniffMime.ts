import type { MomentsAllowedMimeType } from "../constants.ts";

const JPEG = Buffer.from([0xff, 0xd8, 0xff]);
const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const RIFF = "RIFF";
const WEBP = "WEBP";

export type SniffResult =
  | { ok: true; mime: MomentsAllowedMimeType }
  | { ok: false; error: "unsupported_image" | "mime_mismatch" };

export function sniffImageMime(
  buffer: Buffer,
  declaredMime?: string | null,
): SniffResult {
  if (buffer.length < 3) {
    return { ok: false, error: "unsupported_image" };
  }

  let detected: MomentsAllowedMimeType | null = null;

  if (buffer.length >= 3 && buffer.subarray(0, 3).equals(JPEG)) {
    detected = "image/jpeg";
  } else if (buffer.length >= 8 && buffer.subarray(0, 8).equals(PNG)) {
    detected = "image/png";
  } else if (
    buffer.length >= 12 &&
    buffer.subarray(0, 4).toString("ascii") === RIFF &&
    buffer.subarray(8, 12).toString("ascii") === WEBP
  ) {
    detected = "image/webp";
  }

  if (!detected) {
    return { ok: false, error: "unsupported_image" };
  }

  if (
    declaredMime &&
    declaredMime !== detected &&
    !(declaredMime === "image/jpeg" && detected === "image/jpeg")
  ) {
    return { ok: false, error: "mime_mismatch" };
  }

  return { ok: true, mime: detected };
}
