"use client";

import { motion } from "framer-motion";

import { useGlowReducedMotion } from "@/lib/hooks/useGlowReducedMotion";
import { cn } from "@/lib/utils/cn";

import type { MapClusterConnection } from "../hooks/useMapClusterPresence";

export type GlowAtlasLiveStatusProps = {
  connection: MapClusterConnection;
  lastUpdatedAt: number | null;
  className?: string;
};

function formatLastUpdated(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return "Last updated just now";
  if (seconds < 120) return "Last updated 1 minute ago";
  const minutes = Math.floor(seconds / 60);
  return `Last updated ${minutes} minutes ago`;
}

/**
 * Quiet realtime status — no technical jargon.
 */
export function GlowAtlasLiveStatus({
  connection,
  lastUpdatedAt,
  className,
}: GlowAtlasLiveStatusProps) {
  const reducedMotion = useGlowReducedMotion();

  if (connection === "live") {
    return (
      <p
        className={cn(
          "flex items-center justify-center gap-1.5 text-[11px] tracking-wide text-glow-text-tertiary",
          className,
        )}
        role="status"
        aria-live="polite"
      >
        <span className="relative flex h-2 w-2 shrink-0" aria-hidden="true">
          <motion.span
            className="absolute inset-0 rounded-full bg-emerald-400/70"
            animate={
              reducedMotion
                ? { opacity: 0.85 }
                : { opacity: [0.55, 0.95, 0.55] }
            }
            transition={
              reducedMotion
                ? { duration: 0 }
                : { duration: 2.8, repeat: Infinity, ease: "easeInOut" }
            }
          />
          <span className="absolute inset-[2px] rounded-full bg-emerald-300/90" />
        </span>
        <span className="text-glow-primary-light/80">Live now</span>
      </p>
    );
  }

  if (connection === "reconnecting") {
    return (
      <p
        className={cn(
          "text-center text-[11px] tracking-wide text-glow-text-tertiary",
          className,
        )}
        role="status"
        aria-live="polite"
      >
        Reconnecting…
      </p>
    );
  }

  if (lastUpdatedAt !== null) {
    return (
      <p
        className={cn(
          "text-center text-[11px] tracking-wide text-glow-text-tertiary",
          className,
        )}
        role="status"
        aria-live="polite"
      >
        {formatLastUpdated(lastUpdatedAt)}
      </p>
    );
  }

  return null;
}
