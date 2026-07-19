import type { SupabaseClient } from "@supabase/supabase-js";

import { bufferFromStorageDownload } from "./diagnoseStoredWebp.ts";
import {
  ensureUploadBuffer,
  validateWebpBuffer,
  type WebpValidationErrorCode,
  type WebpValidationResult,
} from "./webpBuffer.ts";

export type StoredWebpVerificationResult =
  | ({ ok: true } & Extract<WebpValidationResult, { ok: true }>)
  | {
      ok: false;
      code: "download_failed" | WebpValidationErrorCode;
    };

export async function downloadAndValidateStoredWebp(
  admin: SupabaseClient,
  bucket: string,
  path: string,
): Promise<StoredWebpVerificationResult> {
  const { data, error } = await admin.storage.from(bucket).download(path);
  if (error || !data) {
    return { ok: false, code: "download_failed" };
  }

  const buffer = ensureUploadBuffer(await bufferFromStorageDownload(data));
  const validation = await validateWebpBuffer(buffer);
  if (!validation.ok) {
    return { ok: false, code: validation.code };
  }
  return validation;
}
