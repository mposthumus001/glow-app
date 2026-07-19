import { reportOperationalFailure } from "@/lib/monitoring/report-error";

import type { MomentsMediaResponseCategory } from "./mediaUrl.ts";

/**
 * Privacy-safe Moments media diagnostics.
 * Allowed: media ID, processing status, response category, feature_area.
 * Never: signed URL, storage path, filename, caption, child name.
 */
export function reportMomentsMediaIssue(input: {
  mediaId: string;
  processingStatus: string;
  responseCategory: MomentsMediaResponseCategory;
  operation: string;
}): void {
  reportOperationalFailure(`moments_media_${input.responseCategory}`, {
    featureArea: "moments",
    operation: input.operation,
    entityRef: input.mediaId,
    responseCategory: input.responseCategory,
    processingStatus: input.processingStatus,
  });
}
