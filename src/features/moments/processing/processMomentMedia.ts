import { reportOperationalFailure } from "@/lib/monitoring/report-error";
import { createAdminClient, isMomentsProcessingConfigured } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

import { MOMENTS_BUCKET, MOMENTS_MAX_UPLOAD_BYTES } from "../constants";
import {
  calmMessageForOutcome,
  mapProcessingErrorToOutcome,
  type MomentMediaOutcome,
} from "./outcomes.ts";
import { processImageBuffer } from "./processImageBuffer.ts";
import { isValidOriginalPath, pathsBelongToMedia } from "./paths.ts";
import { sniffImageMime } from "./sniffMime.ts";

export type ProcessMomentMediaResult = {
  outcome: MomentMediaOutcome;
  message: string;
  mediaId: string;
};

type ClaimPayload = {
  ok?: boolean;
  error?: string;
  status?: string;
  media_id?: string;
  original_path?: string;
  storage_path?: string;
  thumbnail_path?: string;
  owner_parent_id?: string;
  moment_id?: string;
};

function parseClaim(payload: unknown): ClaimPayload {
  if (payload && typeof payload === "object") return payload as ClaimPayload;
  return {};
}

export async function processMomentMedia(
  mediaId: string,
): Promise<ProcessMomentMediaResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      outcome: "processing_failed",
      message: calmMessageForOutcome("processing_failed"),
      mediaId,
    };
  }

  const { data: claimData, error: claimError } = await supabase.rpc(
    "claim_moment_media_processing",
    { p_media_id: mediaId },
  );

  if (claimError) {
    reportOperationalFailure(claimError.message, {
      featureArea: "moments",
      operation: "claim_moment_media_processing",
      supabaseCode: claimError.code,
      userId: user.id,
    });
    return {
      outcome: "processing_failed",
      message: calmMessageForOutcome("processing_failed"),
      mediaId,
    };
  }

  const claim = parseClaim(claimData);
  if (!claim.ok) {
    const outcome = mapProcessingErrorToOutcome(claim.error);
    return {
      outcome,
      message: calmMessageForOutcome(outcome),
      mediaId,
    };
  }

  if (claim.status === "ready") {
    return {
      outcome: "ready",
      message: calmMessageForOutcome("ready"),
      mediaId,
    };
  }

  if (claim.status === "processing" && !claim.original_path) {
    return {
      outcome: "processing",
      message: calmMessageForOutcome("processing"),
      mediaId,
    };
  }

  const originalPath = claim.original_path?.trim();
  const displayPath = claim.storage_path?.trim();
  const thumbPath = claim.thumbnail_path?.trim();
  const ownerId = claim.owner_parent_id;
  const momentId = claim.moment_id;

  if (
    !originalPath ||
    !displayPath ||
    !thumbPath ||
    !ownerId ||
    !momentId ||
    ownerId !== user.id
  ) {
    return {
      outcome: "processing_failed",
      message: calmMessageForOutcome("processing_failed"),
      mediaId,
    };
  }

  if (
    !isValidOriginalPath(originalPath) ||
    !pathsBelongToMedia(
      {
        originalPath,
        storagePath: displayPath,
        thumbnailPath: thumbPath,
      },
      ownerId,
      momentId,
      mediaId,
    )
  ) {
    return {
      outcome: "processing_failed",
      message: calmMessageForOutcome("processing_failed"),
      mediaId,
    };
  }

  if (!isMomentsProcessingConfigured()) {
    reportOperationalFailure("moments_processing_not_configured", {
      featureArea: "moments",
      operation: "process_moment_media",
      userId: user.id,
    });
    return {
      outcome: "processing_failed",
      message: calmMessageForOutcome("processing_failed"),
      mediaId,
    };
  }

  const admin = createAdminClient();

  const { data: download, error: downloadError } = await admin.storage
    .from(MOMENTS_BUCKET)
    .download(originalPath);

  if (downloadError || !download) {
    await admin.rpc("fail_moment_media_processing", {
      p_media_id: mediaId,
      p_error_code: "download_failed",
    });
    return {
      outcome: "processing_failed",
      message: calmMessageForOutcome("processing_failed"),
      mediaId,
    };
  }

  const bytes = Buffer.from(await download.arrayBuffer());
  if (bytes.length > MOMENTS_MAX_UPLOAD_BYTES) {
    await admin.rpc("fail_moment_media_processing", {
      p_media_id: mediaId,
      p_error_code: "image_too_large",
    });
    return {
      outcome: "image_too_large",
      message: calmMessageForOutcome("image_too_large"),
      mediaId,
    };
  }

  const sniff = sniffImageMime(bytes);
  if (!sniff.ok) {
    await admin.rpc("fail_moment_media_processing", {
      p_media_id: mediaId,
      p_error_code: sniff.error,
    });
    const outcome = mapProcessingErrorToOutcome(sniff.error);
    return { outcome, message: calmMessageForOutcome(outcome), mediaId };
  }

  const processed = await processImageBuffer(bytes);
  if (!processed.ok) {
    await admin.rpc("fail_moment_media_processing", {
      p_media_id: mediaId,
      p_error_code: processed.error,
    });
    const outcome = mapProcessingErrorToOutcome(processed.error);
    return { outcome, message: calmMessageForOutcome(outcome), mediaId };
  }

  const { outputs } = processed;

  const uploadDisplay = await admin.storage
    .from(MOMENTS_BUCKET)
    .upload(displayPath, outputs.display, {
      contentType: "image/webp",
      upsert: true,
    });

  if (uploadDisplay.error) {
    await admin.rpc("fail_moment_media_processing", {
      p_media_id: mediaId,
      p_error_code: "upload_display_failed",
    });
    return {
      outcome: "processing_failed",
      message: calmMessageForOutcome("processing_failed"),
      mediaId,
    };
  }

  const uploadThumb = await admin.storage
    .from(MOMENTS_BUCKET)
    .upload(thumbPath, outputs.thumbnail, {
      contentType: "image/webp",
      upsert: true,
    });

  if (uploadThumb.error) {
    await admin.rpc("fail_moment_media_processing", {
      p_media_id: mediaId,
      p_error_code: "upload_thumb_failed",
    });
    return {
      outcome: "processing_failed",
      message: calmMessageForOutcome("processing_failed"),
      mediaId,
    };
  }

  const { error: deleteError } = await admin.storage
    .from(MOMENTS_BUCKET)
    .remove([originalPath]);

  const originalDeleted = !deleteError;

  if (deleteError) {
    reportOperationalFailure(deleteError.message, {
      featureArea: "moments",
      operation: "delete_original_after_processing",
      userId: user.id,
    });
  }

  const { data: completeData, error: completeError } = await admin.rpc(
    "complete_moment_media_processing",
    {
      p_media_id: mediaId,
      p_width: outputs.width,
      p_height: outputs.height,
      p_processed_size_bytes: outputs.displayBytes,
      p_thumbnail_size_bytes: outputs.thumbnailBytes,
      p_original_deleted: originalDeleted,
      p_mime_type: "image/webp",
    },
  );

  if (completeError) {
    reportOperationalFailure(completeError.message, {
      featureArea: "moments",
      operation: "complete_moment_media_processing",
      userId: user.id,
    });
    return {
      outcome: "processing_failed",
      message: calmMessageForOutcome("processing_failed"),
      mediaId,
    };
  }

  const complete = parseClaim(completeData);
  if (!complete.ok) {
    return {
      outcome: "processing_failed",
      message: calmMessageForOutcome("processing_failed"),
      mediaId,
    };
  }

  return {
    outcome: "ready",
    message: calmMessageForOutcome("ready"),
    mediaId,
  };
}
