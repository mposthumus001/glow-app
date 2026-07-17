import {
  MOMENTS_ALLOWED_MIME_TYPES,
  MOMENTS_EXTENSION_BY_MIME,
  type MomentsAllowedMimeType,
} from "../constants.ts";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type MomentMediaPaths = {
  originalPath: string;
  storagePath: string;
  thumbnailPath: string;
};

export function buildMomentMediaPaths(input: {
  ownerParentId: string;
  momentId: string;
  mediaId: string;
  mimeType: MomentsAllowedMimeType;
}): MomentMediaPaths {
  const ext = MOMENTS_EXTENSION_BY_MIME[input.mimeType];
  const base = `${input.ownerParentId}/${input.momentId}/${input.mediaId}`;
  return {
    originalPath: `${base}/original.${ext}`,
    storagePath: `${base}/display.webp`,
    thumbnailPath: `${base}/thumb.webp`,
  };
}

/** @deprecated Use buildMomentMediaPaths — Sprint 9.1 alias */
export function buildMomentStoragePaths(input: {
  ownerParentId: string;
  momentId: string;
  mediaId: string;
  mimeType: MomentsAllowedMimeType;
}): { storagePath: string; thumbnailPath: string } {
  const paths = buildMomentMediaPaths(input);
  return {
    storagePath: paths.originalPath,
    thumbnailPath: paths.thumbnailPath,
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

export function isValidOriginalPath(path: string): boolean {
  const parts = path.split("/");
  if (parts.length !== 4) return false;
  const [owner, moment, media, file] = parts;
  if (!UUID_PATTERN.test(owner)) return false;
  if (!UUID_PATTERN.test(moment)) return false;
  if (!UUID_PATTERN.test(media)) return false;
  return /^original\.(jpg|jpeg|png|webp)$/.test(file);
}

export function isValidDisplayPath(path: string): boolean {
  const parts = path.split("/");
  if (parts.length !== 4) return false;
  return parts[3] === "display.webp" && UUID_PATTERN.test(parts[0] ?? "");
}

export function pathsBelongToMedia(
  paths: MomentMediaPaths,
  ownerParentId: string,
  momentId: string,
  mediaId: string,
): boolean {
  const expectedBase = `${ownerParentId}/${momentId}/${mediaId}`;
  return (
    paths.originalPath.startsWith(expectedBase + "/") &&
    paths.storagePath === `${expectedBase}/display.webp` &&
    paths.thumbnailPath === `${expectedBase}/thumb.webp`
  );
}

export function extensionForMime(mime: string): string | null {
  if (!(MOMENTS_ALLOWED_MIME_TYPES as readonly string[]).includes(mime)) {
    return null;
  }
  return MOMENTS_EXTENSION_BY_MIME[mime as MomentsAllowedMimeType] === "jpg"
    ? "jpg"
    : MOMENTS_EXTENSION_BY_MIME[mime as MomentsAllowedMimeType];
}
