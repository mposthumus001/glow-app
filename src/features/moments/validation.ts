import {
  MOMENTS_ALLOWED_MIME_TYPES,
  MOMENTS_CAPTION_MAX,
  MOMENTS_MAX_UPLOAD_BYTES,
  MOMENTS_TAG_LABEL_MAX,
  MOMENTS_TITLE_MAX,
  type MomentsAllowedMimeType,
} from "./constants.ts";

export type ValidationResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: string };

export type CreateMomentInput = {
  title?: string | null;
  caption?: string | null;
  occurredOn: string;
  babyIds?: string[];
  tagIds?: string[];
  customTagLabels?: string[];
  visibility?: string;
};

export type UploadSlotInput = {
  momentId: string;
  mimeType: string;
  originalFilename?: string | null;
  sizeBytes: number;
};

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export function validateOccurredOn(value: string): ValidationResult<string> {
  const trimmed = value.trim();
  if (!ISO_DATE.test(trimmed)) {
    return { ok: false, error: "Please choose a valid date." };
  }
  const [y, m, d] = trimmed.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  if (
    date.getUTCFullYear() !== y ||
    date.getUTCMonth() !== m - 1 ||
    date.getUTCDate() !== d
  ) {
    return { ok: false, error: "Please choose a valid date." };
  }
  return { ok: true, value: trimmed };
}

export function validateCreateMomentInput(
  input: CreateMomentInput,
): ValidationResult<{
  title: string | null;
  caption: string | null;
  occurredOn: string;
  babyIds: string[];
  tagIds: string[];
  customTagLabels: string[];
}> {
  if (input.visibility && input.visibility !== "private") {
    return {
      ok: false,
      error: "Shared Moments are not available yet.",
    };
  }

  const occurred = validateOccurredOn(input.occurredOn);
  if (!occurred.ok) return occurred;

  const titleRaw = input.title?.trim() ?? "";
  const captionRaw = input.caption?.trim() ?? "";

  if (titleRaw.length > MOMENTS_TITLE_MAX) {
    return {
      ok: false,
      error: `Title can be up to ${MOMENTS_TITLE_MAX} characters.`,
    };
  }

  if (captionRaw.length > MOMENTS_CAPTION_MAX) {
    return {
      ok: false,
      error: `Caption can be up to ${MOMENTS_CAPTION_MAX} characters.`,
    };
  }

  const babyIds = [...new Set((input.babyIds ?? []).filter(Boolean))];
  const tagIds = [...new Set((input.tagIds ?? []).filter(Boolean))];

  const customTagLabels = normaliseCustomTagLabels(input.customTagLabels ?? []);

  return {
    ok: true,
    value: {
      title: titleRaw || null,
      caption: captionRaw || null,
      occurredOn: occurred.value,
      babyIds,
      tagIds,
      customTagLabels,
    },
  };
}

export function normaliseTagLabel(label: string): string {
  return label.trim().toLowerCase();
}

export function normaliseCustomTagLabels(labels: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const raw of labels) {
    const trimmed = raw.trim();
    if (!trimmed || trimmed.length > MOMENTS_TAG_LABEL_MAX) continue;
    const normalised = normaliseTagLabel(trimmed);
    if (!normalised || seen.has(normalised)) continue;
    seen.add(normalised);
    result.push(trimmed);
  }

  return result;
}

export function isAllowedMimeType(
  mimeType: string,
): mimeType is MomentsAllowedMimeType {
  return (MOMENTS_ALLOWED_MIME_TYPES as readonly string[]).includes(mimeType);
}

export function validateUploadSlotInput(
  input: UploadSlotInput,
): ValidationResult<{
  momentId: string;
  mimeType: MomentsAllowedMimeType;
  originalFilename: string | null;
  sizeBytes: number;
  extension: string;
}> {
  const momentId = input.momentId?.trim();
  if (!momentId) {
    return { ok: false, error: "Moment not found." };
  }

  const mime = input.mimeType?.trim().toLowerCase();
  if (!mime || !isAllowedMimeType(mime)) {
    return {
      ok: false,
      error: "Please choose a JPEG, PNG, or WebP photo.",
    };
  }

  if (
    !Number.isFinite(input.sizeBytes) ||
    input.sizeBytes <= 0 ||
    input.sizeBytes > MOMENTS_MAX_UPLOAD_BYTES
  ) {
    return {
      ok: false,
      error: "Photos must be 8 MB or smaller.",
    };
  }

  const filename = input.originalFilename?.trim().slice(0, 255) || null;
  const extension =
    mime === "image/jpeg"
      ? "jpg"
      : mime === "image/png"
        ? "png"
        : "webp";

  return {
    ok: true,
    value: {
      momentId,
      mimeType: mime,
      originalFilename: filename,
      sizeBytes: Math.floor(input.sizeBytes),
      extension,
    },
  };
}

export function mapRpcError(code: string | undefined): string {
  switch (code) {
    case "not_authenticated":
      return "Please sign in again.";
    case "invalid_baby":
      return "That child could not be linked to this Moment.";
    case "invalid_tag":
      return "One of the tags is not available.";
    case "quota_exceeded":
      return "Your Moments storage is full for now. Please remove some photos or try again later.";
    case "unsupported_mime":
    case "unsupported_extension":
      return "Please choose a JPEG, PNG, or WebP photo.";
    case "invalid_size":
      return "Photos must be 8 MB or smaller.";
    case "not_owner":
    case "not_found":
      return "That Moment could not be found.";
    case "processing_not_available":
      return "Your photo is still being prepared.";
    case "shared visibility is not available yet":
    case "Shared visibility is not available yet":
      return "Shared Moments are not available yet.";
    default:
      return "Something didn't work just now. Please try again.";
  }
}
