/**
 * Bounded repair for ready Moments media whose stored WebP objects fail validation.
 * Marks affected rows failed when originals no longer exist.
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";

import { analyzeStoredWebpBuffer, bufferFromStorageDownload } from "../src/features/moments/processing/diagnoseStoredWebp.ts";
import { downloadAndValidateStoredWebp } from "../src/features/moments/processing/verifyStoredWebp.ts";

const BOUNDED_MEDIA_IDS = [
  "17602c70-0252-41f8-b03f-07a94634c983",
  "23f45b9a-df95-48ee-a84f-6d95926edc6a",
];

function loadEnvLocal() {
  const env = {};
  for (const line of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
    if (!line || line.startsWith("#") || !line.includes("=")) continue;
    const i = line.indexOf("=");
    let value = line.slice(i + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    env[line.slice(0, i).trim()] = value;
  }
  return env;
}

const env = loadEnvLocal();
const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const bucket = "moments-private";
const repairs = [];

for (const mediaId of BOUNDED_MEDIA_IDS) {
  const { data: row, error } = await admin
    .from("moment_media")
    .select("id, processing_status, original_path, storage_path, thumbnail_path")
    .eq("id", mediaId)
    .maybeSingle();

  if (error || !row) {
    repairs.push({ mediaId, action: "skipped", reason: "not_found" });
    continue;
  }

  const displayValid = row.storage_path
    ? await downloadAndValidateStoredWebp(admin, bucket, row.storage_path)
    : { ok: false, code: "download_failed" };
  const thumbValid = row.thumbnail_path
    ? await downloadAndValidateStoredWebp(admin, bucket, row.thumbnail_path)
    : { ok: false, code: "download_failed" };

  let originalExists = false;
  if (row.original_path) {
    const { data, error: originalError } = await admin.storage
      .from(bucket)
      .download(row.original_path);
    originalExists = !originalError && Boolean(data);
  }

  if (displayValid.ok && thumbValid.ok) {
    repairs.push({ mediaId, action: "noop", reason: "already_valid" });
    continue;
  }

  let thumbDiag = null;
  let displayDiag = null;
  if (row.thumbnail_path) {
    const { data } = await admin.storage.from(bucket).download(row.thumbnail_path);
    if (data) {
      thumbDiag = await analyzeStoredWebpBuffer(
        "thumb",
        await bufferFromStorageDownload(data),
      );
    }
  }
  if (row.storage_path) {
    const { data } = await admin.storage.from(bucket).download(row.storage_path);
    if (data) {
      displayDiag = await analyzeStoredWebpBuffer(
        "display",
        await bufferFromStorageDownload(data),
      );
    }
  }

  if (originalExists) {
    repairs.push({
      mediaId,
      action: "pending_reprocess",
      reason: "original_exists",
      thumb: thumbDiag,
      display: displayDiag,
    });
    continue;
  }

  const cleanupPaths = [row.storage_path, row.thumbnail_path].filter(Boolean);
  if (cleanupPaths.length > 0) {
    await admin.storage.from(bucket).remove(cleanupPaths);
  }

  await admin
    .from("moment_media")
    .update({
      processing_status: "failed",
      processing_error_code: "reupload_required",
      processing_completed_at: new Date().toISOString(),
    })
    .eq("id", mediaId);

  repairs.push({
    mediaId,
    action: "marked_failed_reupload_required",
    originalExists,
    thumb: thumbDiag,
    display: displayDiag,
  });
}

console.log(JSON.stringify({ ok: true, repairs }, null, 2));
