/**
 * Family Album feature flag (Sprint 9.4A).
 * Build-time inlined on Vercel — set NEXT_PUBLIC_FAMILY_ALBUM_ENABLED=true to expose UI.
 * Schema/RPCs may exist while this remains false.
 */
export function isFamilyAlbumEnabled(
  env: Record<string, string | undefined> = process.env,
): boolean {
  return env.NEXT_PUBLIC_FAMILY_ALBUM_ENABLED?.trim() === "true";
}

export const FAMILY_NAME_MAX = 80;

/** Hex length for invite raw tokens (32 bytes → 64 hex chars). */
export const FAMILY_INVITE_TOKEN_HEX_LENGTH = 64;
