import { reportOperationalFailure } from "@/lib/monitoring/report-error";

import type { MomentProcessingDiagnostic } from "./momentProcessingDiagnostics.ts";

export function reportMomentProcessingDiagnostic(
  diagnostic: MomentProcessingDiagnostic,
): void {
  reportOperationalFailure(
    diagnostic.success
      ? "moments_processing_stage_ok"
      : "moments_processing_stage_failed",
    {
      featureArea: "moments",
      operation: diagnostic.stage,
      entityRef: diagnostic.mediaId,
      responseCategory: JSON.stringify({
        feature: diagnostic.feature,
        stage: diagnostic.stage,
        success: diagnostic.success,
        byteLength: diagnostic.byteLength,
        isBuffer: diagnostic.isBuffer,
        detectedFormat: diagnostic.detectedFormat,
        width: diagnostic.width,
        height: diagnostic.height,
        processingErrorCategory: diagnostic.processingErrorCategory,
        storageDataType: diagnostic.storageDataType ?? null,
      }),
    },
  );
}
