import sharp from "sharp";

import { MOMENTS_MAX_UPLOAD_BYTES } from "../constants.ts";
import {
  ensureUploadBuffer,
  validateWebpBuffer,
  type WebpValidationErrorCode,
} from "./webpBuffer.ts";

/** Longest edge for privacy-safe display output. */
export const MOMENTS_DISPLAY_MAX_EDGE = 2048;

/** Longest edge for thumbnail output. */
export const MOMENTS_THUMB_MAX_EDGE = 400;

/** Reject decompression bombs — ~16 MP cap before decode. */
export const MOMENTS_MAX_INPUT_PIXELS = 4096 * 4096;

export type ProcessedImageOutputs = {
  display: Buffer;
  thumbnail: Buffer;
  width: number;
  height: number;
  displayBytes: number;
  thumbnailBytes: number;
};

export type ProcessImageErrorCode =
  | "image_too_large"
  | "pixel_limit_exceeded"
  | "unsupported_image"
  | "decode_failed"
  | "malformed_image"
  | WebpValidationErrorCode;

export type ProcessImageResult =
  | { ok: true; outputs: ProcessedImageOutputs }
  | { ok: false; error: ProcessImageErrorCode };

export async function processImageBuffer(
  input: Buffer,
): Promise<ProcessImageResult> {
  if (input.length === 0 || input.length > MOMENTS_MAX_UPLOAD_BYTES) {
    return { ok: false, error: "image_too_large" };
  }

  try {
    const pipeline = sharp(input, {
      failOn: "error",
      limitInputPixels: MOMENTS_MAX_INPUT_PIXELS,
      sequentialRead: true,
    }).rotate();

    const metadata = await pipeline.metadata();
    if (!metadata.width || !metadata.height) {
      return { ok: false, error: "malformed_image" };
    }

    const display = await sharp(input, {
      limitInputPixels: MOMENTS_MAX_INPUT_PIXELS,
      sequentialRead: true,
    })
      .rotate()
      .resize({
        width: MOMENTS_DISPLAY_MAX_EDGE,
        height: MOMENTS_DISPLAY_MAX_EDGE,
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality: 82, effort: 4 })
      .toBuffer({ resolveWithObject: true });

    const thumbnail = await sharp(input, {
      limitInputPixels: MOMENTS_MAX_INPUT_PIXELS,
      sequentialRead: true,
    })
      .rotate()
      .resize({
        width: MOMENTS_THUMB_MAX_EDGE,
        height: MOMENTS_THUMB_MAX_EDGE,
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality: 75, effort: 3 })
      .toBuffer({ resolveWithObject: true });

    const displayBuffer = ensureUploadBuffer(display.data);
    const thumbnailBuffer = ensureUploadBuffer(thumbnail.data);

    const displayValidation = await validateWebpBuffer(displayBuffer);
    if (!displayValidation.ok) {
      return { ok: false, error: displayValidation.code };
    }

    const thumbnailValidation = await validateWebpBuffer(thumbnailBuffer);
    if (!thumbnailValidation.ok) {
      return { ok: false, error: thumbnailValidation.code };
    }

    return {
      ok: true,
      outputs: {
        display: displayBuffer,
        thumbnail: thumbnailBuffer,
        width: displayValidation.width,
        height: displayValidation.height,
        displayBytes: displayBuffer.byteLength,
        thumbnailBytes: thumbnailBuffer.byteLength,
      },
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message.toLowerCase() : String(error);

    if (message.includes("pixel limit") || message.includes("exceeds")) {
      return { ok: false, error: "pixel_limit_exceeded" };
    }
    if (message.includes("unsupported") || message.includes("invalid")) {
      return { ok: false, error: "unsupported_image" };
    }
    return { ok: false, error: "decode_failed" };
  }
}
