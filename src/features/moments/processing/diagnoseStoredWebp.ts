import sharp from "sharp";

import {
  classifyStoredSignature,
  type StoredSignatureClass,
  validateWebpBuffer,
} from "./webpBuffer.ts";

export type StoredWebpDiagnostic = {
  label: string;
  byteLength: number;
  first12Hex: string;
  signature: StoredSignatureClass;
  sharpOk: boolean;
  sharpFormat: string | null;
  sharpWidth: number | null;
  sharpHeight: number | null;
  sharpError: string | null;
};

export async function analyzeStoredWebpBuffer(
  label: string,
  buffer: Buffer,
): Promise<StoredWebpDiagnostic> {
  const signature = classifyStoredSignature(buffer);
  const validation = await validateWebpBuffer(buffer);

  let sharpFormat: string | null = null;
  let sharpWidth: number | null = null;
  let sharpHeight: number | null = null;
  let sharpError: string | null = null;

  if (!validation.ok) {
    try {
      const metadata = await sharp(buffer).metadata();
      sharpFormat = metadata.format ?? null;
      sharpWidth = metadata.width ?? null;
      sharpHeight = metadata.height ?? null;
    } catch (error) {
      sharpError =
        error instanceof Error ? error.message.slice(0, 80) : "unknown";
    }
  } else {
    sharpFormat = validation.format;
    sharpWidth = validation.width;
    sharpHeight = validation.height;
  }

  return {
    label,
    byteLength: buffer.length,
    first12Hex: buffer.subarray(0, Math.min(12, buffer.length)).toString("hex"),
    signature,
    sharpOk: validation.ok,
    sharpFormat,
    sharpWidth,
    sharpHeight,
    sharpError,
  };
}

export async function bufferFromStorageDownload(
  download: Blob,
): Promise<Buffer> {
  return Buffer.from(await download.arrayBuffer());
}
