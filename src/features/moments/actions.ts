"use server";

import { calmUserFacingError } from "@/lib/errors/calm-messages";
import { reportOperationalFailure } from "@/lib/monitoring/report-error";
import { createClient } from "@/lib/supabase/server";

import {
  MOMENTS_BUCKET,
  MOMENTS_QUOTA_BYTES,
  MOMENTS_SIGNED_URL_TTL_SECONDS,
} from "./constants";
import { isMomentsEnabled } from "./config";
import {
  mapRpcError,
  validateCreateMomentInput,
  validateUploadSlotInput,
  type CreateMomentInput,
  type UploadSlotInput,
} from "./validation";
import {
  mapProcessingErrorToOutcome,
  type MomentMediaOutcome,
  calmMessageForOutcome,
  outcomeAllowsRetry,
} from "./processing/outcomes";
import { processMomentMedia } from "./processing/processMomentMedia";

export type MomentActionResult<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; error: string };

type RpcPayload = {
  ok?: boolean;
  error?: string;
  moment_id?: string;
  media_id?: string;
  original_path?: string;
  storage_path?: string;
  thumbnail_path?: string;
  status?: string;
};

async function requireAuthenticatedParent() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { supabase, user: null as null, error: "Please sign in again." };
  }

  return { supabase, user, error: null as null };
}

function parseRpc(payload: unknown): RpcPayload {
  if (payload && typeof payload === "object") {
    return payload as RpcPayload;
  }
  return {};
}

export async function createPrivateMoment(
  input: CreateMomentInput,
): Promise<MomentActionResult<{ momentId: string }>> {
  if (!isMomentsEnabled()) {
    return { ok: false, error: "Moments are not available yet." };
  }

  const parsed = validateCreateMomentInput(input);
  if (!parsed.ok) return { ok: false, error: parsed.error };

  const { supabase, user, error } = await requireAuthenticatedParent();
  if (error || !user) return { ok: false, error: error ?? "Please sign in again." };

  const { data, error: rpcError } = await supabase.rpc("create_private_moment", {
    p_title: parsed.value.title,
    p_caption: parsed.value.caption,
    p_occurred_on: parsed.value.occurredOn,
    p_baby_ids: parsed.value.babyIds,
    p_tag_ids: parsed.value.tagIds,
    p_custom_tag_labels: parsed.value.customTagLabels,
  });

  if (rpcError) {
    reportOperationalFailure(rpcError.message, {
      featureArea: "moments",
      operation: "create_private_moment",
      supabaseCode: rpcError.code,
      userId: user.id,
    });
    return {
      ok: false,
      error: calmUserFacingError(rpcError.message, "profile"),
    };
  }

  const result = parseRpc(data);
  if (!result.ok || !result.moment_id) {
    return { ok: false, error: mapRpcError(result.error) };
  }

  return { ok: true, data: { momentId: result.moment_id } };
}

export async function requestMomentUploadSlot(
  input: UploadSlotInput,
): Promise<
  MomentActionResult<{
    mediaId: string;
    originalPath: string;
    displayPath: string;
    thumbnailPath: string;
    signedUploadUrl: string;
  }>
> {
  if (!isMomentsEnabled()) {
    return { ok: false, error: "Moments are not available yet." };
  }

  const parsed = validateUploadSlotInput(input);
  if (!parsed.ok) return { ok: false, error: parsed.error };

  const { supabase, user, error } = await requireAuthenticatedParent();
  if (error || !user) return { ok: false, error: error ?? "Please sign in again." };

  const { data, error: rpcError } = await supabase.rpc(
    "create_moment_media_upload_slot",
    {
      p_moment_id: parsed.value.momentId,
      p_mime_type: parsed.value.mimeType,
      p_original_filename: parsed.value.originalFilename,
      p_size_bytes: parsed.value.sizeBytes,
      p_extension: parsed.value.extension,
    },
  );

  if (rpcError) {
    reportOperationalFailure(rpcError.message, {
      featureArea: "moments",
      operation: "create_moment_media_upload_slot",
      supabaseCode: rpcError.code,
      userId: user.id,
    });
    return {
      ok: false,
      error: calmUserFacingError(rpcError.message, "profile"),
    };
  }

  const result = parseRpc(data);
  if (
    !result.ok ||
    !result.media_id ||
    !result.original_path ||
    !result.storage_path ||
    !result.thumbnail_path
  ) {
    return { ok: false, error: mapRpcError(result.error) };
  }

  const { data: signed, error: signError } = await supabase.storage
    .from(MOMENTS_BUCKET)
    .createSignedUploadUrl(result.original_path, { upsert: false });

  if (signError || !signed?.signedUrl) {
    reportOperationalFailure(signError?.message ?? "signed_upload_failed", {
      featureArea: "moments",
      operation: "createSignedUploadUrl",
      userId: user.id,
    });
    return {
      ok: false,
      error: "We couldn't prepare the upload just now. Please try again.",
    };
  }

  return {
    ok: true,
    data: {
      mediaId: result.media_id,
      originalPath: result.original_path,
      displayPath: result.storage_path,
      thumbnailPath: result.thumbnail_path,
      signedUploadUrl: signed.signedUrl,
    },
  };
}

export async function finalizeMomentMediaUpload(input: {
  mediaId: string;
  sizeBytes: number;
}): Promise<
  MomentActionResult<{
    mediaId: string;
    outcome: MomentMediaOutcome;
    message: string;
  }>
> {
  if (!isMomentsEnabled()) {
    return { ok: false, error: "Moments are not available yet." };
  }

  const { supabase, user, error } = await requireAuthenticatedParent();
  if (error || !user) return { ok: false, error: error ?? "Please sign in again." };

  const { data, error: rpcError } = await supabase.rpc(
    "finalize_moment_media_upload",
    {
      p_media_id: input.mediaId,
      p_size_bytes: input.sizeBytes,
    },
  );

  if (rpcError) {
    return {
      ok: false,
      error: calmUserFacingError(rpcError.message, "profile"),
    };
  }

  const result = parseRpc(data);
  if (!result.ok || !result.media_id) {
    return { ok: false, error: mapRpcError(result.error) };
  }

  const processed = await processMomentMedia(result.media_id);

  return {
    ok: true,
    data: {
      mediaId: result.media_id,
      outcome: processed.outcome,
      message: processed.message,
    },
  };
}

export async function requestMomentMediaProcessing(
  mediaId: string,
): Promise<
  MomentActionResult<{
    mediaId: string;
    outcome: MomentMediaOutcome;
    message: string;
  }>
> {
  if (!isMomentsEnabled()) {
    return { ok: false, error: "Moments are not available yet." };
  }

  const trimmed = mediaId?.trim();
  if (!trimmed) {
    return { ok: false, error: "That photo could not be found." };
  }

  const { user, error } = await requireAuthenticatedParent();
  if (error || !user) return { ok: false, error: error ?? "Please sign in again." };

  const processed = await processMomentMedia(trimmed);

  return {
    ok: true,
    data: {
      mediaId: trimmed,
      outcome: processed.outcome,
      message: processed.message,
    },
  };
}

export async function retryMomentMediaProcessing(
  mediaId: string,
): Promise<
  MomentActionResult<{
    mediaId: string;
    outcome: MomentMediaOutcome;
    message: string;
  }>
> {
  if (!isMomentsEnabled()) {
    return { ok: false, error: "Moments are not available yet." };
  }

  const trimmed = mediaId?.trim();
  if (!trimmed) {
    return { ok: false, error: "That photo could not be found." };
  }

  const { supabase, user, error } = await requireAuthenticatedParent();
  if (error || !user) return { ok: false, error: error ?? "Please sign in again." };

  const { data, error: rpcError } = await supabase.rpc(
    "retry_moment_media_processing",
    { p_media_id: trimmed },
  );

  if (rpcError) {
    return {
      ok: false,
      error: calmUserFacingError(rpcError.message, "profile"),
    };
  }

  const result = parseRpc(data);
  if (!result.ok) {
    return { ok: false, error: mapRpcError(result.error) };
  }

  const processed = await processMomentMedia(trimmed);

  return {
    ok: true,
    data: {
      mediaId: trimmed,
      outcome: processed.outcome,
      message: processed.message,
    },
  };
}

export async function getMomentMediaStatus(mediaId: string): Promise<
  MomentActionResult<{
    mediaId: string;
    processingStatus: string;
    outcome: MomentMediaOutcome;
    message: string;
    canRetry: boolean;
  }>
> {
  if (!isMomentsEnabled()) {
    return { ok: false, error: "Moments are not available yet." };
  }

  const trimmed = mediaId?.trim();
  if (!trimmed) {
    return { ok: false, error: "That photo could not be found." };
  }

  const { supabase, user, error } = await requireAuthenticatedParent();
  if (error || !user) return { ok: false, error: error ?? "Please sign in again." };

  const { data: media, error: mediaError } = await supabase
    .from("moment_media")
    .select("id, processing_status, processing_error_code")
    .eq("id", trimmed)
    .eq("owner_parent_id", user.id)
    .is("deleted_at", null)
    .maybeSingle();

  if (mediaError || !media) {
    return { ok: false, error: "That photo could not be found." };
  }

  let outcome: MomentMediaOutcome;
  switch (media.processing_status) {
    case "ready":
      outcome = "ready";
      break;
    case "processing":
      outcome = "processing";
      break;
    case "pending":
      outcome = "uploaded";
      break;
    case "failed":
      outcome = mapProcessingErrorToOutcome(media.processing_error_code);
      if (outcome === "processing_failed") {
        outcome = "retry_available";
      }
      break;
    default:
      outcome = "processing_failed";
  }

  return {
    ok: true,
    data: {
      mediaId: trimmed,
      processingStatus: media.processing_status,
      outcome,
      message: calmMessageForOutcome(outcome),
      canRetry: outcomeAllowsRetry(outcome),
    },
  };
}

export async function getMomentDownloadUrl(input: {
  storagePath: string;
  preferThumbnail?: boolean;
}): Promise<MomentActionResult<{ signedUrl: string; expiresIn: number }>> {
  if (!isMomentsEnabled()) {
    return { ok: false, error: "Moments are not available yet." };
  }

  const path = input.storagePath?.trim();
  if (!path) {
    return { ok: false, error: "That photo could not be found." };
  }

  const { supabase, user, error } = await requireAuthenticatedParent();
  if (error || !user) return { ok: false, error: error ?? "Please sign in again." };

  const { data: media, error: mediaError } = await supabase
    .from("moment_media")
    .select("id, owner_parent_id, processing_status, thumbnail_path, storage_path")
    .eq("owner_parent_id", user.id)
    .is("deleted_at", null)
    .eq("storage_path", path)
    .maybeSingle();

  if (mediaError || !media) {
    return { ok: false, error: "That photo could not be found." };
  }

  if (media.processing_status !== "ready" && !input.preferThumbnail) {
    return {
      ok: false,
      error: "Your photo is still being prepared.",
    };
  }

  const targetPath =
    input.preferThumbnail && media.thumbnail_path
      ? media.thumbnail_path
      : media.storage_path;

  const { data: signed, error: signError } = await supabase.storage
    .from(MOMENTS_BUCKET)
    .createSignedUrl(targetPath, MOMENTS_SIGNED_URL_TTL_SECONDS);

  if (signError || !signed?.signedUrl) {
    return {
      ok: false,
      error: "We couldn't open that photo just now. Please try again.",
    };
  }

  return {
    ok: true,
    data: {
      signedUrl: signed.signedUrl,
      expiresIn: MOMENTS_SIGNED_URL_TTL_SECONDS,
    },
  };
}

export async function getMomentQuotaStatus(): Promise<
  MomentActionResult<{
    usedBytes: number;
    quotaBytes: number;
    remainingBytes: number;
  }>
> {
  if (!isMomentsEnabled()) {
    return { ok: false, error: "Moments are not available yet." };
  }

  const { supabase, user, error } = await requireAuthenticatedParent();
  if (error || !user) return { ok: false, error: error ?? "Please sign in again." };

  const { data, error: rpcError } = await supabase.rpc(
    "moments_parent_media_bytes",
    { p_parent_id: user.id },
  );

  if (rpcError) {
    return {
      ok: false,
      error: calmUserFacingError(rpcError.message, "profile"),
    };
  }

  const usedBytes = Number(data ?? 0);
  const quotaBytes = MOMENTS_QUOTA_BYTES;

  return {
    ok: true,
    data: {
      usedBytes,
      quotaBytes,
      remainingBytes: Math.max(0, quotaBytes - usedBytes),
    },
  };
}
