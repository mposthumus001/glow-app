import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/supabase/database.types";

import { formatBabyAgeAtDate } from "./ageAtDate";
import { MOMENTS_BUCKET, MOMENTS_SIGNED_URL_TTL_SECONDS } from "./constants";
import {
  signedUrlExpiresAt,
  type SignedMediaUrl,
} from "./mediaUrl";
import {
  calmMessageForOutcome,
  mapProcessingErrorToOutcome,
  outcomeAllowsRetry,
  type MomentMediaOutcome,
} from "./processing/outcomes";
import { reportMomentsMediaIssue } from "./reportMomentsMediaIssue";
import type {
  BabyMomentsContext,
  MomentDetailView,
  MomentListItem,
  MomentMediaDisplayStatus,
  MomentMediaView,
  MomentPreviewItem,
  MomentTagView,
  SystemTagOption,
} from "./types";

type MediaRow = {
  id: string;
  moment_id: string;
  processing_status: string;
  processing_error_code: string | null;
  thumbnail_path: string | null;
  storage_path: string;
  sort_order: number;
};

type MomentBaseRow = {
  id: string;
  title: string | null;
  caption: string | null;
  occurred_on: string;
  is_favourite: boolean;
};

function mediaDisplayStatus(raw: string): MomentMediaDisplayStatus {
  if (raw === "ready" || raw === "processing" || raw === "pending" || raw === "failed") {
    return raw;
  }
  return "failed";
}

function mediaOutcomeFromRow(row: MediaRow): MomentMediaOutcome {
  switch (row.processing_status) {
    case "ready":
      return "ready";
    case "processing":
      return "processing";
    case "pending":
      return "uploaded";
    case "failed":
      return mapProcessingErrorToOutcome(row.processing_error_code);
    default:
      return "processing_failed";
  }
}

async function createSignedMediaUrl(
  supabase: SupabaseClient<Database>,
  path: string,
): Promise<SignedMediaUrl | null> {
  const { data, error } = await supabase.storage
    .from(MOMENTS_BUCKET)
    .createSignedUrl(path, MOMENTS_SIGNED_URL_TTL_SECONDS);

  if (error || !data?.signedUrl) return null;

  return {
    url: data.signedUrl,
    expiresIn: MOMENTS_SIGNED_URL_TTL_SECONDS,
    expiresAt: signedUrlExpiresAt(),
  };
}

async function signedThumbnailUrl(
  supabase: SupabaseClient<Database>,
  row: Pick<MediaRow, "id" | "processing_status" | "thumbnail_path">,
): Promise<SignedMediaUrl | null> {
  if (row.processing_status !== "ready") {
    return null;
  }

  if (!row.thumbnail_path) {
    reportMomentsMediaIssue({
      mediaId: row.id,
      processingStatus: row.processing_status,
      responseCategory: "missing_object",
      operation: "signed_thumbnail_missing_path",
    });
    return null;
  }

  const signed = await createSignedMediaUrl(supabase, row.thumbnail_path);
  if (!signed) {
    reportMomentsMediaIssue({
      mediaId: row.id,
      processingStatus: row.processing_status,
      responseCategory: "sign_failed",
      operation: "signed_thumbnail_create",
    });
    return null;
  }

  return signed;
}

async function signedDisplayUrl(
  supabase: SupabaseClient<Database>,
  row: Pick<MediaRow, "id" | "processing_status" | "storage_path">,
): Promise<SignedMediaUrl | null> {
  if (row.processing_status !== "ready") return null;

  if (!row.storage_path) {
    reportMomentsMediaIssue({
      mediaId: row.id,
      processingStatus: row.processing_status,
      responseCategory: "missing_object",
      operation: "signed_display_missing_path",
    });
    return null;
  }

  const signed = await createSignedMediaUrl(supabase, row.storage_path);
  if (!signed) {
    reportMomentsMediaIssue({
      mediaId: row.id,
      processingStatus: row.processing_status,
      responseCategory: "sign_failed",
      operation: "signed_display_create",
    });
    return null;
  }

  return signed;
}

async function mapMediaRow(
  supabase: SupabaseClient<Database>,
  row: MediaRow,
): Promise<MomentMediaView> {
  const outcome = mediaOutcomeFromRow(row);
  const status = mediaDisplayStatus(row.processing_status);
  let message: string | null = null;

  if (status === "failed") {
    message = calmMessageForOutcome(
      outcome === "processing_failed" ? "retry_available" : outcome,
    );
  } else if (status === "processing" || status === "pending") {
    message = calmMessageForOutcome(status === "pending" ? "uploaded" : "processing");
  }

  const signed =
    status === "ready" ? await signedThumbnailUrl(supabase, row) : null;

  if (status === "ready" && !signed) {
    message = "Photo unavailable";
  }

  return {
    id: row.id,
    status,
    thumbnailUrl: signed?.url ?? null,
    urlExpiresAt: signed?.expiresAt ?? null,
    canRetry:
      status === "failed" &&
      outcomeAllowsRetry(outcome === "processing_failed" ? "retry_available" : outcome),
    message,
  };
}

function primaryMediaRow(media: MediaRow[]): MediaRow | null {
  if (!media.length) return null;
  const sorted = [...media].sort((a, b) => a.sort_order - b.sort_order);
  return sorted[0] ?? null;
}

function ageLabelForMoment(baby: BabyMomentsContext, occurredOn: string): string | null {
  return formatBabyAgeAtDate({
    dateOfBirth: baby.dateOfBirth,
    dueDate: baby.dueDate,
    occurredOn,
  }).label;
}

async function loadMomentIdsForBaby(
  supabase: SupabaseClient<Database>,
  babyId: string,
  ownerId: string,
): Promise<string[]> {
  const { data: links, error: linksError } = await supabase
    .from("moment_children")
    .select("moment_id")
    .eq("baby_id", babyId);

  if (linksError || !links?.length) return [];

  const linkedIds = links.map((row) => row.moment_id);
  const { data: moments, error: momentsError } = await supabase
    .from("moments")
    .select("id")
    .in("id", linkedIds)
    .eq("owner_parent_id", ownerId)
    .is("deleted_at", null);

  if (momentsError || !moments) return [];
  return moments.map((row) => row.id);
}

async function loadMomentsBase(
  supabase: SupabaseClient<Database>,
  momentIds: string[],
  ownerId: string,
  limit?: number,
): Promise<MomentBaseRow[]> {
  if (!momentIds.length) return [];

  let query = supabase
    .from("moments")
    .select("id, title, caption, occurred_on, is_favourite")
    .in("id", momentIds)
    .eq("owner_parent_id", ownerId)
    .is("deleted_at", null)
    .order("occurred_on", { ascending: false });

  if (limit) {
    query = query.limit(limit);
  }

  const { data, error } = await query;
  if (error || !data) return [];
  return data;
}

async function loadMediaForMoments(
  supabase: SupabaseClient<Database>,
  momentIds: string[],
  ownerId: string,
): Promise<Map<string, MediaRow[]>> {
  if (!momentIds.length) return new Map();

  const { data, error } = await supabase
    .from("moment_media")
    .select(
      "id, moment_id, processing_status, processing_error_code, thumbnail_path, storage_path, sort_order",
    )
    .in("moment_id", momentIds)
    .eq("owner_parent_id", ownerId)
    .is("deleted_at", null);

  const map = new Map<string, MediaRow[]>();
  if (error || !data) return map;

  for (const row of data) {
    const list = map.get(row.moment_id) ?? [];
    list.push(row as MediaRow);
    map.set(row.moment_id, list);
  }
  return map;
}

async function mapListItem(
  supabase: SupabaseClient<Database>,
  row: MomentBaseRow,
  media: MediaRow[],
  baby: BabyMomentsContext,
): Promise<MomentListItem> {
  const primary = primaryMediaRow(media);
  return {
    id: row.id,
    title: row.title,
    caption: row.caption,
    occurredOn: row.occurred_on,
    ageLabel: ageLabelForMoment(baby, row.occurred_on),
    isFavourite: row.is_favourite,
    primaryMedia: primary ? await mapMediaRow(supabase, primary) : null,
  };
}

export async function loadMomentsPreviewForBaby(
  supabase: SupabaseClient<Database>,
  baby: BabyMomentsContext,
  ownerId: string,
  limit = 3,
): Promise<MomentPreviewItem[]> {
  const momentIds = await loadMomentIdsForBaby(supabase, baby.babyId, ownerId);
  const moments = await loadMomentsBase(supabase, momentIds, ownerId, limit);
  const mediaMap = await loadMediaForMoments(
    supabase,
    moments.map((row) => row.id),
    ownerId,
  );

  const items: MomentPreviewItem[] = [];
  for (const row of moments) {
    const primary = primaryMediaRow(mediaMap.get(row.id) ?? []);
    items.push({
      id: row.id,
      title: row.title,
      caption: row.caption,
      occurredOn: row.occurred_on,
      ageLabel: ageLabelForMoment(baby, row.occurred_on),
      primaryMedia: primary ? await mapMediaRow(supabase, primary) : null,
    });
  }
  return items;
}

export async function loadMomentsForBaby(
  supabase: SupabaseClient<Database>,
  baby: BabyMomentsContext,
  ownerId: string,
): Promise<MomentListItem[]> {
  const momentIds = await loadMomentIdsForBaby(supabase, baby.babyId, ownerId);
  const moments = await loadMomentsBase(supabase, momentIds, ownerId);
  const mediaMap = await loadMediaForMoments(supabase, momentIds, ownerId);

  const items: MomentListItem[] = [];
  for (const row of moments) {
    items.push(
      await mapListItem(supabase, row, mediaMap.get(row.id) ?? [], baby),
    );
  }
  return items;
}

export async function loadMomentDetail(
  supabase: SupabaseClient<Database>,
  momentId: string,
  baby: BabyMomentsContext,
  ownerId: string,
): Promise<MomentDetailView | null> {
  const { data: moment, error: momentError } = await supabase
    .from("moments")
    .select("id, title, caption, occurred_on, is_favourite")
    .eq("id", momentId)
    .eq("owner_parent_id", ownerId)
    .is("deleted_at", null)
    .maybeSingle();

  if (momentError || !moment) return null;

  const { data: childLink, error: childError } = await supabase
    .from("moment_children")
    .select("baby_id")
    .eq("moment_id", momentId)
    .eq("baby_id", baby.babyId)
    .maybeSingle();

  if (childError || !childLink) return null;

  const { data: allChildren } = await supabase
    .from("moment_children")
    .select("baby_id")
    .eq("moment_id", momentId);

  const { data: tagLinks, error: tagLinksError } = await supabase
    .from("moment_tag_links")
    .select("tag_id")
    .eq("moment_id", momentId);

  const tags: MomentTagView[] = [];
  if (!tagLinksError && tagLinks?.length) {
    const tagIds = tagLinks.map((link) => link.tag_id);
    const { data: tagRows } = await supabase
      .from("moment_tags")
      .select("id, label, is_system")
      .in("id", tagIds)
      .is("deleted_at", null);

    for (const tag of tagRows ?? []) {
      tags.push({ id: tag.id, label: tag.label, isSystem: tag.is_system });
    }
  }

  const mediaMap = await loadMediaForMoments(supabase, [momentId], ownerId);
  const mediaRows = mediaMap.get(momentId) ?? [];
  const media = await Promise.all(mediaRows.map((row) => mapMediaRow(supabase, row)));
  const primary = primaryMediaRow(mediaRows);
  const display = primary ? await signedDisplayUrl(supabase, primary) : null;

  return {
    id: moment.id,
    title: moment.title,
    caption: moment.caption,
    occurredOn: moment.occurred_on,
    ageLabel: ageLabelForMoment(baby, moment.occurred_on),
    isFavourite: moment.is_favourite,
    babyIds: (allChildren ?? []).map((row) => row.baby_id),
    tags,
    media,
    displayUrl: display?.url ?? null,
    displayUrlExpiresAt: display?.expiresAt ?? null,
    displayMediaId: primary?.id ?? null,
  };
}

export async function loadSystemTags(
  supabase: SupabaseClient<Database>,
): Promise<SystemTagOption[]> {
  const { data, error } = await supabase
    .from("moment_tags")
    .select("id, label")
    .eq("is_system", true)
    .is("deleted_at", null)
    .order("label", { ascending: true });

  if (error || !data) return [];
  return data.map((tag) => ({ id: tag.id, label: tag.label }));
}

export async function resolveMediaSignedUrlById(
  supabase: SupabaseClient<Database>,
  mediaId: string,
  ownerId: string,
  preferThumbnail: boolean,
): Promise<SignedMediaUrl | null> {
  const { data, error } = await supabase
    .from("moment_media")
    .select(
      "id, moment_id, processing_status, processing_error_code, thumbnail_path, storage_path, sort_order",
    )
    .eq("id", mediaId)
    .eq("owner_parent_id", ownerId)
    .is("deleted_at", null)
    .maybeSingle();

  if (error || !data) return null;
  const row = data as MediaRow;

  if (preferThumbnail) {
    return signedThumbnailUrl(supabase, row);
  }
  return signedDisplayUrl(supabase, row);
}

/** @deprecated Prefer resolveMediaSignedUrlById */
export async function resolveMediaThumbnailById(
  supabase: SupabaseClient<Database>,
  mediaId: string,
  ownerId: string,
): Promise<string | null> {
  const signed = await resolveMediaSignedUrlById(
    supabase,
    mediaId,
    ownerId,
    true,
  );
  return signed?.url ?? null;
}
