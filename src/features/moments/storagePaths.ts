import { MOMENTS_EXTENSION_BY_MIME, type MomentsAllowedMimeType } from "./constants.ts";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function buildMomentStoragePaths(input: {
  ownerParentId: string;
  momentId: string;
  mediaId: string;
  mimeType: MomentsAllowedMimeType;
}): { storagePath: string; thumbnailPath: string } {
  const ext = MOMENTS_EXTENSION_BY_MIME[input.mimeType];
  const base = `${input.ownerParentId}/${input.momentId}/${input.mediaId}`;
  return {
    storagePath: `${base}/original.${ext}`,
    thumbnailPath: `${base}/thumb.webp`,
  };
}

export function parseStoragePathOwnerId(path: string): string | null {
  const segment = path.split("/")[0]?.trim();
  if (!segment || !UUID_PATTERN.test(segment)) return null;
  return segment.toLowerCase();
}

export function isStoragePathOwnedBy(path: string, ownerParentId: string): boolean {
  const parsed = parseStoragePathOwnerId(path);
  return parsed === ownerParentId.toLowerCase();
}

export function isValidMomentStoragePath(path: string): boolean {
  const parts = path.split("/");
  if (parts.length !== 4) return false;
  const [owner, moment, media, file] = parts;
  if (!UUID_PATTERN.test(owner)) return false;
  if (!UUID_PATTERN.test(moment)) return false;
  if (!UUID_PATTERN.test(media)) return false;
  return /^original\.(jpg|jpeg|png|webp)$/.test(file);
}
