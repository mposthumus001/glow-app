import { reportOperationalFailure } from "@/lib/monitoring/report-error";
import { createAdminClient, isMomentsProcessingConfigured } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

import { MOMENTS_BUCKET, MOMENTS_MAX_UPLOAD_BYTES } from "../constants";
import {
  calmMessageForOutcome,
  mapProcessingErrorToOutcome,
  type MomentMediaOutcome,
} from "./outcomes.ts";
import {
  diagnosticFromValidation,
} from "./momentProcessingDiagnostics.ts";
import { reportMomentProcessingDiagnostic } from "./reportMomentProcessingDiagnostic.ts";
import { processImageBuffer } from "./processImageBuffer.ts";
import { isValidOriginalPath, pathsBelongToMedia } from "./paths.ts";
import { sniffImageMime } from "./sniffMime.ts";
import {
  describeStorageBinary,
  ensureUploadBuffer,
  storageDataToBuffer,
  toWebpUploadBody,
} from "./storageBinary.ts";
import { downloadAndValidateStoredWebp } from "./verifyStoredWebp.ts";
import {
  buildPipelineBinaryTrace,
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

function logStage(
  diagnostic: ReturnType<typeof diagnosticFromValidation>,
): void {
  reportMomentProcessingDiagnostic(diagnostic);
}

async function failProcessing(
  admin: ReturnType<typeof createAdminClient>,
  mediaId: string,
  errorCode: string,
  cleanupPaths: string[] = [],
  stageDiagnostic?: ReturnType<typeof diagnosticFromValidation>,
): Promise<ProcessMomentMediaResult> {
  if (stageDiagnostic) {
    logStage(stageDiagnostic);
  }

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
    logStage(
      diagnosticFromValidation({
        mediaId,
        stage: "original_download",
        success: false,
        processingErrorCategory: "download_failed",
      }),
    );
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

  const originalBinary = describeStorageBinary(download);
  logStage(
    diagnosticFromValidation({
      mediaId,
      stage: "original_download",
      success: true,
      byteLength: originalBinary.byteLength,
      isBuffer: originalBinary.isBuffer,
      storageDataType: originalBinary.type,
    }),
  );

  let bytes: Buffer;
  try {
    bytes = ensureUploadBuffer(await storageDataToBuffer(download));
  } catch {
    logStage(
      diagnosticFromValidation({
        mediaId,
        stage: "original_decode",
        success: false,
        processingErrorCategory: "unsupported_storage_binary_type",
        storageDataType: originalBinary.type,
      }),
    );
    await admin.rpc("fail_moment_media_processing", {
      p_media_id: mediaId,
      p_error_code: "decode_failed",
    });
    return {
      outcome: "processing_failed",
      message: calmMessageForOutcome("processing_failed"),
      mediaId,
    };
  }

  logStage(
    diagnosticFromValidation({
      mediaId,
      stage: "original_decode",
      success: true,
      byteLength: bytes.byteLength,
      isBuffer: true,
      storageDataType: originalBinary.type,
    }),
  );

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
    logStage(
      diagnosticFromValidation({
        mediaId,
        stage: "original_decode",
        success: false,
        byteLength: bytes.byteLength,
        isBuffer: true,
        processingErrorCategory: sniff.error,
      }),
    );
    await admin.rpc("fail_moment_media_processing", {
      p_media_id: mediaId,
      p_error_code: sniff.error,
    });
    const outcome = mapProcessingErrorToOutcome(sniff.error);
    return { outcome, message: calmMessageForOutcome(outcome), mediaId };
  }

  const processed = await processImageBuffer(bytes);
  if (!processed.ok) {
    logStage(
      diagnosticFromValidation({
        mediaId,
        stage:
          processed.error === "webp_metadata_failed" ||
          processed.error === "invalid_webp_signature"
            ? "pre_upload_webp_validation"
            : "sharp_transform",
        success: false,
        processingErrorCategory: processed.error,
      }),
    );
    await admin.rpc("fail_moment_media_processing", {
      p_media_id: mediaId,
      p_error_code: processed.error,
    });
    const outcome = mapProcessingErrorToOutcome(processed.error);
    return { outcome, message: calmMessageForOutcome(outcome), mediaId };
  }

  logStage(
    diagnosticFromValidation({
      mediaId,
      stage: "sharp_transform",
      success: true,
      byteLength: processed.outputs.displayBytes,
      isBuffer: true,
      format: "webp",
      width: processed.outputs.width,
      height: processed.outputs.height,
    }),
  );
  logStage(
    diagnosticFromValidation({
      mediaId,
      stage: "pre_upload_webp_validation",
      success: true,
      byteLength: processed.outputs.displayBytes,
      isBuffer: true,
      format: "webp",
      width: processed.outputs.width,
      height: processed.outputs.height,
    }),
  );

  const { outputs } = processed;
  const displayUploadBody = toWebpUploadBody(outputs.display);
  const thumbnailUploadBody = toWebpUploadBody(outputs.thumbnail);

  const pipelineTrace = buildPipelineBinaryTrace({
    downloadedOriginalBytes: download.size,
    originalArrayBufferBytes: bytes.byteLength,
    originalBuffer: bytes,
    displayBuffer: ensureUploadBuffer(outputs.display),
    thumbnailBuffer: ensureUploadBuffer(outputs.thumbnail),
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
    return failProcessing(
      admin,
      mediaId,
      "upload_display_failed",
      [],
      diagnosticFromValidation({
        mediaId,
        stage: "storage_upload_display",
        success: false,
        processingErrorCategory: "upload_display_failed",
      }),
    );
  }

  logStage(
    diagnosticFromValidation({
      mediaId,
      stage: "storage_upload_display",
      success: true,
      byteLength: outputs.displayBytes,
      isBuffer: true,
      format: "webp",
      width: outputs.width,
      height: outputs.height,
    }),
  );

  const storedDisplay = await downloadAndValidateStoredWebp(
    admin,
    MOMENTS_BUCKET,
    displayPath,
  );
  if (!storedDisplay.ok) {
    return failProcessing(
      admin,
      mediaId,
      "stored_display_invalid",
      [displayPath],
      diagnosticFromValidation({
        mediaId,
        stage: "post_upload_webp_validation_display",
        success: false,
        byteLength: storedDisplay.byteLength ?? null,
        isBuffer: true,
        processingErrorCategory: storedDisplay.code,
        storageDataType: storedDisplay.storageDataType ?? null,
      }),
    );
  }

  logStage(
    diagnosticFromValidation({
      mediaId,
      stage: "post_upload_download_display",
      success: true,
      byteLength: storedDisplay.byteLength,
      isBuffer: true,
      storageDataType: storedDisplay.storageDataType,
    }),
  );
  logStage(
    diagnosticFromValidation({
      mediaId,
      stage: "post_upload_webp_validation_display",
      success: true,
      byteLength: storedDisplay.byteLength,
      isBuffer: true,
      format: storedDisplay.format,
      width: storedDisplay.width,
      height: storedDisplay.height,
      storageDataType: storedDisplay.storageDataType,
    }),
  );

  const uploadThumb = await admin.storage
    .from(MOMENTS_BUCKET)
    .upload(thumbPath, thumbnailUploadBody, {
      contentType: "image/webp",
      upsert: true,
    });

  if (uploadThumb.error) {
    return failProcessing(
      admin,
      mediaId,
      "upload_thumb_failed",
      [displayPath],
      diagnosticFromValidation({
        mediaId,
        stage: "storage_upload_thumbnail",
        success: false,
        processingErrorCategory: "upload_thumb_failed",
      }),
    );
  }

  logStage(
    diagnosticFromValidation({
      mediaId,
      stage: "storage_upload_thumbnail",
      success: true,
      byteLength: outputs.thumbnailBytes,
      isBuffer: true,
      format: "webp",
    }),
  );

  const storedThumb = await downloadAndValidateStoredWebp(
    admin,
    MOMENTS_BUCKET,
    thumbPath,
  );
  if (!storedThumb.ok) {
    return failProcessing(
      admin,
      mediaId,
      "stored_thumb_invalid",
      [displayPath, thumbPath],
      diagnosticFromValidation({
        mediaId,
        stage: "post_upload_webp_validation_thumbnail",
        success: false,
        byteLength: storedThumb.byteLength ?? null,
        isBuffer: true,
        processingErrorCategory: storedThumb.code,
        storageDataType: storedThumb.storageDataType ?? null,
      }),
    );
  }

  logStage(
    diagnosticFromValidation({
      mediaId,
      stage: "post_upload_webp_validation_thumbnail",
      success: true,
      byteLength: storedThumb.byteLength,
      isBuffer: true,
      format: storedThumb.format,
      width: storedThumb.width,
      height: storedThumb.height,
      storageDataType: storedThumb.storageDataType,
    }),
  );

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
    return failProcessing(
      admin,
      mediaId,
      "processing_failed",
      [displayPath, thumbPath],
      diagnosticFromValidation({
        mediaId,
        stage: "complete_moment_media_processing",
        success: false,
        processingErrorCategory: "processing_failed",
      }),
    );
  }

  const complete = parseClaim(completeData);
  if (!complete.ok) {
    return failProcessing(
      admin,
      mediaId,
      "processing_failed",
      [displayPath, thumbPath],
      diagnosticFromValidation({
        mediaId,
        stage: "complete_moment_media_processing",
        success: false,
        processingErrorCategory: "processing_failed",
      }),
    );
  }

  logStage(
    diagnosticFromValidation({
      mediaId,
      stage: "complete_moment_media_processing",
      success: true,
      byteLength: storedDisplay.byteLength,
      isBuffer: true,
      format: "webp",
      width: storedDisplay.width,
      height: storedDisplay.height,
    }),
  );

  const { error: deleteError } = await admin.storage
    .from(MOMENTS_BUCKET)
    .remove([originalPath]);

  if (deleteError) {
    logStage(
      diagnosticFromValidation({
        mediaId,
        stage: "original_deletion",
        success: false,
        processingErrorCategory: "original_delete_failed",
      }),
    );
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
    logStage(
      diagnosticFromValidation({
        mediaId,
        stage: "original_deletion",
        success: true,
      }),
    );
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
