/**
 * Image processing boundary — Sprint 9.1.
 * No sharp/native image library in project yet; media stays pending until
 * a trusted worker implements this interface (Sprint 9.2+).
 */

export type MomentMediaProcessingInput = {
  mediaId: string;
  storagePath: string;
  mimeType: string;
};

export type MomentMediaProcessingResult = {
  status: "pending" | "ready" | "failed";
  width: number | null;
  height: number | null;
  sizeBytes: number | null;
  errorCode?: string;
};

export interface MomentMediaProcessor {
  process(input: MomentMediaProcessingInput): Promise<MomentMediaProcessingResult>;
}

/** No-op processor — leaves media pending (not visible in album UI). */
export const pendingOnlyProcessor: MomentMediaProcessor = {
  async process() {
    return {
      status: "pending",
      width: null,
      height: null,
      sizeBytes: null,
      errorCode: "processing_not_implemented",
    };
  },
};

/**
 * Planned processing steps (not implemented in 9.1):
 * - EXIF orientation correction
 * - EXIF/GPS removal
 * - Resize original max 2048px
 * - WebP thumbnail ~400px
 * - Extract width/height
 */
