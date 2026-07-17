"use client";

import { useEffect, useRef, useState } from "react";

import { getMomentMediaStatus } from "@/features/moments/actions";
import type { MomentMediaOutcome } from "@/features/moments/processing/outcomes";

const POLL_INTERVAL_MS = 3000;

export function useMomentProcessingPoll(input: {
  mediaId: string | null;
  enabled: boolean;
  onUpdate?: (outcome: MomentMediaOutcome, message: string) => void;
  onSettled?: (outcome: MomentMediaOutcome) => void;
}) {
  const { mediaId, enabled, onUpdate, onSettled } = input;
  const [outcome, setOutcome] = useState<MomentMediaOutcome | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [polling, setPolling] = useState(false);
  const settledRef = useRef(false);

  useEffect(() => {
    if (!enabled || !mediaId) {
      return;
    }

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    settledRef.current = false;
    const activeMediaId = mediaId;

    async function poll() {
      if (cancelled || settledRef.current) return;
      setPolling(true);

      const result = await getMomentMediaStatus(activeMediaId);
      if (cancelled) return;

      if (!result.ok) {
        setPolling(false);
        timer = setTimeout(poll, POLL_INTERVAL_MS);
        return;
      }

      const nextOutcome = result.data.outcome;
      setOutcome(nextOutcome);
      setMessage(result.data.message);
      onUpdate?.(nextOutcome, result.data.message);

      if (
        nextOutcome === "ready" ||
        nextOutcome === "processing_failed" ||
        nextOutcome === "retry_available" ||
        nextOutcome === "unsupported_image" ||
        nextOutcome === "image_too_large" ||
        nextOutcome === "quota_exceeded"
      ) {
        settledRef.current = true;
        setPolling(false);
        onSettled?.(nextOutcome);
        return;
      }

      setPolling(false);
      timer = setTimeout(poll, POLL_INTERVAL_MS);
    }

    void poll();

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [enabled, mediaId, onSettled, onUpdate]);

  return { outcome, message, polling };
}
