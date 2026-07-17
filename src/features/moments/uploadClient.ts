import { MOMENTS_ALLOWED_MIME_TYPES, MOMENTS_MAX_UPLOAD_BYTES } from "./constants.ts";

export type ClientUploadValidation =
  | { ok: true; mimeType: string; sizeBytes: number }
  | { ok: false; error: string; outcome: "unsupported_image" | "image_too_large" };

export function validateClientUploadFile(file: File): ClientUploadValidation {
  const mime = file.type?.trim().toLowerCase();
  if (!mime || !(MOMENTS_ALLOWED_MIME_TYPES as readonly string[]).includes(mime)) {
    return {
      ok: false,
      error: "Please choose a JPEG, PNG, or WebP photo.",
      outcome: "unsupported_image",
    };
  }

  if (!Number.isFinite(file.size) || file.size <= 0 || file.size > MOMENTS_MAX_UPLOAD_BYTES) {
    return {
      ok: false,
      error: "Photos must be 8 MB or smaller.",
      outcome: "image_too_large",
    };
  }

  return { ok: true, mimeType: mime, sizeBytes: file.size };
}

export function shouldExposeSignedUrlInMarkup(value: string): boolean {
  const lower = value.toLowerCase();
  return (
    lower.includes("token=") ||
    lower.includes("supabase.co/storage") ||
    lower.includes("/object/sign/")
  );
}
