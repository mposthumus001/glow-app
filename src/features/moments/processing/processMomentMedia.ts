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
import { downloadAndValidateStoredWebp } from "./verifyStoredWebp.ts";
import {
  buildPipelineBinaryTrace,
  ensureUploadBuffer,
  type PipelineBinaryTrace,
} from "./webpBuffer.ts";

export type ProcessMomentMediaResult = {
  outcome: MomentMediaOutcome;
  message: string;
  mediaId: string;
  pipelineTrace?: PipelineBinaryTrace;
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

function shouldTracePipeline(): boolean {
  return process.env.MOMENTS_PIPELINE_TRACE === "1";
}

async function failProcessing(
  admin: ReturnType<typeof createAdminClient>,
  mediaId: string,
  errorCode: string,
  cleanupPaths: string[] = [],
): Promise<ProcessMomentMediaResult> {
  if (cleanupPaths.length > 0) {
    await admin.storage.from(MOMENTS_BUCKET).remove(cleanupPaths);
  }

  await admin.rpc("fail_moment_media_processing", {
    p_media_id: mediaId,
    p_error_code: errorCode,
  });

  const outcome = mapProcessingErrorToOutcome(errorCode);
  return {
    outcome,
    message: calmMessageForOutcome(outcome),
    mediaId,
  };
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

  const originalArrayBuffer = await download.arrayBuffer();
  const bytes = ensureUploadBuffer(Buffer.from(originalArrayBuffer));
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
  const displayUploadBody = ensureUploadBuffer(outputs.display);
  const thumbnailUploadBody = ensureUploadBuffer(outputs.thumbnail);

  const pipelineTrace = buildPipelineBinaryTrace({
    downloadedOriginalBytes: download.size,
    originalArrayBufferBytes: originalArrayBuffer.byteLength,
    originalBuffer: bytes,
    displayBuffer: displayUploadBody,
    thumbnailBuffer: thumbnailUploadBody,
  });

  if (shouldTracePipeline()) {
    reportOperationalFailure("moments_pipeline_trace", {
      featureArea: "moments",
      operation: "process_moment_media_trace",
      userId: user.id,
      entityRef: mediaId,
      responseCategory: JSON.stringify(pipelineTrace),
    });
  }

  const uploadDisplay = await admin.storage
    .from(MOMENTS_BUCKET)
    .upload(displayPath, displayUploadBody, {
      contentType: "image/webp",
      upsert: true,
    });

  if (uploadDisplay.error) {
    return failProcessing(admin, mediaId, "upload_display_failed");
  }

  const storedDisplay = await downloadAndValidateStoredWebp(
    admin,
    MOMENTS_BUCKET,
    displayPath,
  );
  if (!storedDisplay.ok) {
    return failProcessing(admin, mediaId, "stored_display_invalid", [
      displayPath,
    ]);
  }

  const uploadThumb = await admin.storage
    .from(MOMENTS_BUCKET)
    .upload(thumbPath, thumbnailUploadBody, {
      contentType: "image/webp",
      upsert: true,
    });

  if (uploadThumb.error) {
    return failProcessing(admin, mediaId, "upload_thumb_failed", [displayPath]);
  }

  const storedThumb = await downloadAndValidateStoredWebp(
    admin,
    MOMENTS_BUCKET,
    thumbPath,
  );
  if (!storedThumb.ok) {
    return failProcessing(admin, mediaId, "stored_thumb_invalid", [
      displayPath,
      thumbPath,
    ]);
  }

  const { data: completeData, error: completeError } = await admin.rpc(
    "complete_moment_media_processing",
    {
      p_media_id: mediaId,
      p_width: outputs.width,
      p_height: outputs.height,
      p_processed_size_bytes: storedDisplay.byteLength,
      p_thumbnail_size_bytes: storedThumb.byteLength,
      p_original_deleted: false,
      p_mime_type: "image/webp",
    },
  );

  if (completeError) {
    reportOperationalFailure(completeError.message, {
      featureArea: "moments",
      operation: "complete_moment_media_processing",
      userId: user.id,
    });
    return failProcessing(admin, mediaId, "processing_failed", [
      displayPath,
      thumbPath,
    ]);
  }

  const complete = parseClaim(completeData);
  if (!complete.ok) {
    return failProcessing(admin, mediaId, "processing_failed", [
      displayPath,
      thumbPath,
    ]);
  }

  const { error: deleteError } = await admin.storage
    .from(MOMENTS_BUCKET)
    .remove([originalPath]);

  if (deleteError) {
    reportOperationalFailure(deleteError.message, {
      featureArea: "moments",
      operation: "delete_original_after_processing",
      userId: user.id,
    });
    await admin
      .from("moment_media")
      .update({ original_cleanup_required: true })
      .eq("id", mediaId);
  } else {
    await admin
      .from("moment_media")
      .update({ original_cleanup_required: false })
      .eq("id", mediaId);
  }

  return {
    outcome: "ready",
    message: calmMessageForOutcome("ready"),
    mediaId,
    pipelineTrace: shouldTracePipeline() ? pipelineTrace : undefined,
  };
}
