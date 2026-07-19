import type { SupabaseClient } from "@supabase/supabase-js";

import {
  describeStorageBinary,
  ensureUploadBuffer,
  storageDataToBuffer,
} from "./storageBinary.ts";
import {
  validateWebpBuffer,
  type WebpValidationErrorCode,
  type WebpValidationResult,
} from "./webpBuffer.ts";

export type StoredWebpVerificationResult =
  | ({ ok: true } & Extract<WebpValidationResult, { ok: true }> & {
      storageDataType: string;
    })
  | {
      ok: false;
      code: "download_failed" | WebpValidationErrorCode;
      storageDataType?: string;
      byteLength?: number;
    };

const POST_UPLOAD_VERIFY_ATTEMPTS = 3;
const POST_UPLOAD_VERIFY_DELAY_MS = 150;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function downloadAndValidateStoredWebp(
  admin: SupabaseClient,
  bucket: string,
  path: string,
): Promise<StoredWebpVerificationResult> {
  for (let attempt = 0; attempt < POST_UPLOAD_VERIFY_ATTEMPTS; attempt += 1) {
    const { data, error } = await admin.storage.from(bucket).download(path);
    if (error || !data) {
      if (attempt < POST_UPLOAD_VERIFY_ATTEMPTS - 1) {
        await delay(POST_UPLOAD_VERIFY_DELAY_MS * (attempt + 1));
        continue;
      }
      return { ok: false, code: "download_failed" };
    }

    const storageDataType = describeStorageBinary(data).type;
    let buffer: Buffer;
    try {
      buffer = ensureUploadBuffer(await storageDataToBuffer(data));
    } catch {
      return { ok: false, code: "not_a_buffer", storageDataType };
    }

    const validation = await validateWebpBuffer(buffer);
    if (validation.ok) {
      return { ...validation, storageDataType };
    }

    if (attempt < POST_UPLOAD_VERIFY_ATTEMPTS - 1) {
      await delay(POST_UPLOAD_VERIFY_DELAY_MS * (attempt + 1));
      continue;
    }

    return {
      ok: false,
      code: validation.code,
      storageDataType,
      byteLength: buffer.byteLength,
    };
  }

  return { ok: false, code: "download_failed" };
}
