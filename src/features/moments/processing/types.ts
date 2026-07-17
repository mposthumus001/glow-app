/**
 * Sprint 9.2A — trusted image processing types.
 */

export type MomentProcessingStatus =
  | "pending"
  | "processing"
  | "ready"
  | "failed";

export type MomentMediaProcessingInput = {
  mediaId: string;
  originalPath: string;
  displayPath: string;
  thumbnailPath: string;
  ownerParentId: string;
  momentId: string;
};

export type MomentMediaProcessingResult = {
  status: MomentProcessingStatus;
  width: number | null;
  height: number | null;
  processedSizeBytes: number | null;
  thumbnailSizeBytes: number | null;
  errorCode?: string;
  originalCleanupRequired?: boolean;
};

export type { MomentMediaOutcome } from "./outcomes.ts";
export {
  calmMessageForOutcome,
  mapProcessingErrorToOutcome,
  MOMENT_MEDIA_OUTCOME_MESSAGES,
  outcomeAllowsRetry,
} from "./outcomes.ts";

export type { ProcessMomentMediaResult } from "./processMomentMedia.ts";
export { processMomentMedia } from "./processMomentMedia.ts";

export {
  MOMENTS_DISPLAY_MAX_EDGE,
  MOMENTS_MAX_INPUT_PIXELS,
  MOMENTS_THUMB_MAX_EDGE,
  processImageBuffer,
} from "./processImageBuffer.ts";

export { sniffImageMime } from "./sniffMime.ts";
