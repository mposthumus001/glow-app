import { reportOperationalFailure } from "@/lib/monitoring/report-error";
import { createAdminClient, isMomentsProcessingConfigured } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

import { MOMENTS_BUCKET } from "../constants";
import {
  calmMessageForOutcome,
  type MomentMediaOutcome,
} from "./outcomes.ts";
import { processMomentMedia } from "./processMomentMedia.ts";
import { downloadAndValidateStoredWebp } from "./verifyStoredWebp.ts";

export type ReprocessMomentMediaResult = {
  outcome: MomentMediaOutcome;
  message: string;
  mediaId: string;
  reprocessed: boolean;
};

type MediaRow = {
  id: string;
  owner_parent_id: string;
  processing_status: string;
  original_path: string | null;
  storage_path: string | null;
  thumbnail_path: string | null;
};

async function originalStillExists(
  admin: ReturnType<typeof createAdminClient>,
  originalPath: string,
): Promise<boolean> {
  const { data, error } = await admin.storage
    .from(MOMENTS_BUCKET)
    .download(originalPath);
  return !error && Boolean(data);
}

async function storedOutputsValid(
  admin: ReturnType<typeof createAdminClient>,
  row: MediaRow,
): Promise<boolean> {
  if (!row.storage_path || !row.thumbnail_path) return false;

  const display = await downloadAndValidateStoredWebp(
    admin,
    MOMENTS_BUCKET,
    row.storage_path,
  );
  if (!display.ok) return false;

  const thumb = await downloadAndValidateStoredWebp(
    admin,
    MOMENTS_BUCKET,
    row.thumbnail_path,
  );
  return thumb.ok;
}

/**
 * Idempotent repair/reprocess path for owner-owned media.
 * - ready + invalid stored output: reprocess when original exists, else fail safely
 * - failed + original exists: reset to pending and reprocess
 */
export async function reprocessMomentMediaIfNeeded(
  mediaId: string,
): Promise<ReprocessMomentMediaResult> {
  const trimmed = mediaId.trim();
  if (!trimmed) {
    return {
      outcome: "processing_failed",
      message: calmMessageForOutcome("processing_failed"),
      mediaId: trimmed,
      reprocessed: false,
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      outcome: "processing_failed",
      message: calmMessageForOutcome("processing_failed"),
      mediaId: trimmed,
      reprocessed: false,
    };
  }

  if (!isMomentsProcessingConfigured()) {
    return {
      outcome: "processing_failed",
      message: calmMessageForOutcome("processing_failed"),
      mediaId: trimmed,
      reprocessed: false,
    };
  }

  const { data: row, error } = await supabase
    .from("moment_media")
    .select(
      "id, owner_parent_id, processing_status, original_path, storage_path, thumbnail_path",
    )
    .eq("id", trimmed)
    .is("deleted_at", null)
    .maybeSingle();

  if (error || !row || row.owner_parent_id !== user.id) {
    return {
      outcome: "processing_failed",
      message: calmMessageForOutcome("processing_failed"),
      mediaId: trimmed,
      reprocessed: false,
    };
  }

  const media = row as MediaRow;
  const admin = createAdminClient();

  if (media.processing_status === "ready") {
    const valid = await storedOutputsValid(admin, media);
    if (valid) {
      return {
        outcome: "ready",
        message: calmMessageForOutcome("ready"),
        mediaId: trimmed,
        reprocessed: false,
      };
    }

    const originalPath = media.original_path?.trim();
    if (!originalPath || !(await originalStillExists(admin, originalPath))) {
      await admin
        .from("moment_media")
        .update({
          processing_status: "failed",
          processing_error_code: "reupload_required",
        })
        .eq("id", trimmed);
      const cleanupPaths = [media.storage_path, media.thumbnail_path].filter(
        (path): path is string => Boolean(path),
      );
      if (cleanupPaths.length > 0) {
        await admin.storage.from(MOMENTS_BUCKET).remove(cleanupPaths);
      }
      return {
        outcome: "retry_available",
        message: calmMessageForOutcome("retry_available"),
        mediaId: trimmed,
        reprocessed: false,
      };
    }
  } else if (media.processing_status !== "failed") {
    return {
      outcome: "processing",
      message: calmMessageForOutcome("processing"),
      mediaId: trimmed,
      reprocessed: false,
    };
  } else {
    const originalPath = media.original_path?.trim();
    if (!originalPath || !(await originalStillExists(admin, originalPath))) {
      await admin
        .from("moment_media")
        .update({
          processing_status: "failed",
          processing_error_code: "reupload_required",
        })
        .eq("id", trimmed);
      return {
        outcome: "retry_available",
        message: calmMessageForOutcome("retry_available"),
        mediaId: trimmed,
        reprocessed: false,
      };
    }
  }

  const { error: retryError } = await supabase.rpc(
    "retry_moment_media_processing",
    { p_media_id: trimmed },
  );

  if (retryError) {
    reportOperationalFailure(retryError.message, {
      featureArea: "moments",
      operation: "retry_moment_media_processing",
      userId: user.id,
    });
    return {
      outcome: "processing_failed",
      message: calmMessageForOutcome("processing_failed"),
      mediaId: trimmed,
      reprocessed: false,
    };
  }

  const processed = await processMomentMedia(trimmed);
  return {
    outcome: processed.outcome,
    message: processed.message,
    mediaId: trimmed,
    reprocessed: true,
  };
}
