/** Private Moments bucket — never public. */
export const MOMENTS_BUCKET = "moments-private" as const;

/** 8 MB maximum original upload. */
export const MOMENTS_MAX_UPLOAD_BYTES = 8 * 1024 * 1024;

/** Beta quota per owner_parent_id. */
export const MOMENTS_QUOTA_BYTES = 1 * 1024 * 1024 * 1024;

/** Signed URL TTL (seconds). */
export const MOMENTS_SIGNED_URL_TTL_SECONDS = 120;

export const MOMENTS_ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

export type MomentsAllowedMimeType = (typeof MOMENTS_ALLOWED_MIME_TYPES)[number];

export const MOMENTS_EXTENSION_BY_MIME: Record<MomentsAllowedMimeType, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export const MOMENTS_TITLE_MAX = 120;
export const MOMENTS_CAPTION_MAX = 500;
export const MOMENTS_TAG_LABEL_MAX = 60;

export const MOMENTS_ORPHAN_PENDING_HOURS = 24;
