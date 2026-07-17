import { MOMENTS_QUOTA_BYTES } from "./constants.ts";

export type QuotaStatus = {
  usedBytes: number;
  quotaBytes: number;
  remainingBytes: number;
  isNearLimit: boolean;
  isExceeded: boolean;
};

export type QuotaCheckResult =
  | { ok: true; status: QuotaStatus }
  | { ok: false; status: QuotaStatus; error: string };

const NEAR_LIMIT_RATIO = 0.9;

export function buildQuotaStatus(usedBytes: number): QuotaStatus {
  const used = Math.max(0, Math.floor(usedBytes));
  const remaining = Math.max(0, MOMENTS_QUOTA_BYTES - used);
  const ratio = used / MOMENTS_QUOTA_BYTES;

  return {
    usedBytes: used,
    quotaBytes: MOMENTS_QUOTA_BYTES,
    remainingBytes: remaining,
    isNearLimit: ratio >= NEAR_LIMIT_RATIO && ratio < 1,
    isExceeded: used >= MOMENTS_QUOTA_BYTES,
  };
}

export function checkQuotaForUpload(
  usedBytes: number,
  additionalBytes: number,
): QuotaCheckResult {
  const projected = usedBytes + additionalBytes;

  if (projected > MOMENTS_QUOTA_BYTES) {
    return {
      ok: false,
      status: buildQuotaStatus(projected),
      error:
        "Your Moments storage is full for now. Please remove some photos or try again later.",
    };
  }

  return { ok: true, status: buildQuotaStatus(projected) };
}

export function fileSizeCategory(bytes: number): "small" | "medium" | "large" {
  if (bytes <= 512 * 1024) return "small";
  if (bytes <= 2 * 1024 * 1024) return "medium";
  return "large";
}
