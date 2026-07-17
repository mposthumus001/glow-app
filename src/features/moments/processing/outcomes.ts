/** Sprint 9.2B UI contract — typed processing outcomes. */
export type MomentMediaOutcome =
  | "uploaded"
  | "processing"
  | "ready"
  | "unsupported_image"
  | "image_too_large"
  | "processing_failed"
  | "quota_exceeded"
  | "retry_available";

export const MOMENT_MEDIA_OUTCOME_MESSAGES: Record<MomentMediaOutcome, string> = {
  uploaded: "Your photo uploaded. Glow is preparing it now.",
  processing: "Your photo is being prepared.",
  ready: "Your photo is ready.",
  unsupported_image: "That file type is not supported. Please choose a JPEG, PNG, or WebP photo.",
  image_too_large: "That photo is too large. Please choose one under 8 MB.",
  processing_failed: "We couldn't prepare that photo. You can try again.",
  quota_exceeded:
    "Your Moments storage is full for now. Please remove some photos or try again later.",
  retry_available: "That photo didn't process. You can try again.",
};

export function mapProcessingErrorToOutcome(
  errorCode: string | null | undefined,
): MomentMediaOutcome {
  switch (errorCode) {
    case "unsupported_mime":
    case "unsupported_extension":
    case "unsupported_image":
    case "mime_mismatch":
      return "unsupported_image";
    case "invalid_size":
    case "image_too_large":
    case "pixel_limit_exceeded":
      return "image_too_large";
    case "quota_exceeded":
      return "quota_exceeded";
    case "invalid_status":
    case "processing":
      return "processing";
    case "ready":
      return "ready";
    case "failed":
    case "processing_failed":
    case "decode_failed":
    case "malformed_image":
      return "processing_failed";
    default:
      if (errorCode === "failed") return "retry_available";
      return "processing_failed";
  }
}

export function calmMessageForOutcome(outcome: MomentMediaOutcome): string {
  return MOMENT_MEDIA_OUTCOME_MESSAGES[outcome];
}

export function outcomeAllowsRetry(outcome: MomentMediaOutcome): boolean {
  return outcome === "processing_failed" || outcome === "retry_available";
}
