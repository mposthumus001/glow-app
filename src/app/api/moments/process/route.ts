import { NextResponse } from "next/server";

import { isMomentsEnabled } from "@/features/moments/config";
import { processMomentMedia } from "@/features/moments/processing/processMomentMedia";

export const runtime = "nodejs";
export const maxDuration = 60;

type ProcessRequestBody = {
  mediaId?: string;
};

export async function POST(request: Request) {
  if (!isMomentsEnabled()) {
    return NextResponse.json(
      { ok: false, error: "Moments are not available yet." },
      { status: 403 },
    );
  }

  let body: ProcessRequestBody;
  try {
    body = (await request.json()) as ProcessRequestBody;
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid request." },
      { status: 400 },
    );
  }

  const mediaId = body.mediaId?.trim();
  if (!mediaId) {
    return NextResponse.json(
      { ok: false, error: "mediaId is required." },
      { status: 400 },
    );
  }

  const result = await processMomentMedia(mediaId);

  return NextResponse.json({
    ok: true,
    outcome: result.outcome,
    message: result.message,
    mediaId: result.mediaId,
  });
}
