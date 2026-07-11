"use client";

import type { PresenceConnectionState } from "@/features/presence";
import { cn } from "@/lib/utils/cn";

export type ReconnectBannerProps = {
  connectionState: PresenceConnectionState;
  className?: string;
};

/**
 * Global reconnect treatment — quiet, non-blocking, not colour-only.
 * Feature-specific Circle reconnect stays in CircleHeader.
 */
export function ReconnectBanner({
  connectionState,
  className,
}: ReconnectBannerProps) {
  const visible =
    connectionState === "reconnecting" || connectionState === "disconnected";

  if (!visible) return null;

  const message =
    connectionState === "reconnecting"
      ? "Reconnecting quietly…"
      : "Connection paused — we'll reconnect when you're back online.";

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "sticky top-0 z-30 border-b border-white/[0.06] bg-[rgba(12,16,32,0.92)] px-4 py-2.5",
        "backdrop-blur-md pt-[max(0.5rem,env(safe-area-inset-top,0px))]",
        className,
      )}
    >
      <p className="mx-auto flex max-w-lg items-center gap-2 text-center text-sm text-glow-text-secondary lg:max-w-3xl">
        <span
          className="inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-glow-accent motion-safe:animate-pulse"
          aria-hidden="true"
        />
        <span className="min-w-0 flex-1">{message}</span>
      </p>
    </div>
  );
}
