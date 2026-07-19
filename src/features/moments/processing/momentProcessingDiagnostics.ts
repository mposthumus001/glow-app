export type MomentProcessingStage =
  | "original_download"
  | "original_decode"
  | "sharp_transform"
  | "pre_upload_webp_validation"
  | "storage_upload_display"
  | "post_upload_download_display"
  | "post_upload_webp_validation_display"
  | "storage_upload_thumbnail"
  | "post_upload_download_thumbnail"
  | "post_upload_webp_validation_thumbnail"
  | "complete_moment_media_processing"
  | "original_deletion";

export type MomentProcessingDiagnostic = {
  feature: "moments";
  mediaId: string;
  stage: MomentProcessingStage;
  success: boolean;
  byteLength: number | null;
  isBuffer: boolean | null;
  detectedFormat: string | null;
  width: number | null;
  height: number | null;
  processingErrorCategory: string | null;
  storageDataType?: string | null;
};

export function diagnosticFromValidation(input: {
  mediaId: string;
  stage: MomentProcessingStage;
  success: boolean;
  byteLength?: number | null;
  isBuffer?: boolean | null;
  format?: string | null;
  width?: number | null;
  height?: number | null;
  processingErrorCategory?: string | null;
  storageDataType?: string | null;
}): MomentProcessingDiagnostic {
  return {
    feature: "moments",
    mediaId: input.mediaId,
    stage: input.stage,
    success: input.success,
    byteLength: input.byteLength ?? null,
    isBuffer: input.isBuffer ?? null,
    detectedFormat: input.format ?? null,
    width: input.width ?? null,
    height: input.height ?? null,
    processingErrorCategory: input.processingErrorCategory ?? null,
    storageDataType: input.storageDataType ?? null,
  };
}
