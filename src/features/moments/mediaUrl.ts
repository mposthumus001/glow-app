import { MOMENTS_SIGNED_URL_TTL_SECONDS } from "./constants.ts";

/** Refresh slightly before TTL so the browser never races expiry. */
export const MOMENTS_SIGNED_URL_REFRESH_SKEW_MS = 15_000;

export type MomentsMediaResponseCategory =
  | "ok"
  | "expired_token"
  | "auth"
  | "not_found"
  | "bad_request"
  | "missing_object"
  | "sign_failed"
  | "network"
  | "unknown";

export type SignedMediaUrl = {
  url: string;
  expiresAt: number;
  expiresIn: number;
};

export function signedUrlExpiresAt(
  nowMs = Date.now(),
  ttlSeconds = MOMENTS_SIGNED_URL_TTL_SECONDS,
): number {
  return nowMs + ttlSeconds * 1000;
}

export function isSignedUrlFresh(
  expiresAt: number | null | undefined,
  nowMs = Date.now(),
  skewMs = MOMENTS_SIGNED_URL_REFRESH_SKEW_MS,
): boolean {
  if (!expiresAt || !Number.isFinite(expiresAt)) return false;
  return expiresAt - skewMs > nowMs;
}

export function categorizeSignedUrlFailure(input: {
  status?: number | null;
  bodyText?: string | null;
}): MomentsMediaResponseCategory {
  const status = input.status ?? null;
  const body = (input.bodyText ?? "").toLowerCase();

  if (body.includes("expired") || body.includes("token has expired")) {
    return "expired_token";
  }
  if (status === 401 || status === 403) return "auth";
  if (status === 404) return "not_found";
  if (status === 400) {
    if (body.includes("jwt") || body.includes("token") || body.includes("signature")) {
      return "expired_token";
    }
    return "bad_request";
  }
  if (status != null && status >= 500) return "unknown";
  return "unknown";
}
