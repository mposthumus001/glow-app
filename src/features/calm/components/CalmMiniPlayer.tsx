"use client";

import Link from "next/link";
import { Pause, Play, Square } from "lucide-react";

import { cn } from "@/lib/utils/cn";

import { getSoundById } from "../catalogue";
import { useCalmPlayer } from "../hooks/useCalmPlayer";
import { getCalmPlayerService } from "../player/CalmPlayerService";
import { getCalmSoundsMode } from "../sounds/flags";

/**
 * Restrained shell strip when preview audio is active away from the full
 * Sounds player.
 * Not a music-app dock — just enough to pause or return.
 */
export function CalmMiniPlayer() {
  const snapshot = useCalmPlayer();
  const sound = getSoundById(snapshot.soundId, getCalmSoundsMode());
  const service = getCalmPlayerService();

  if (!sound) return null;

  const isPlaying = snapshot.status === "playing";
  const isLoading = snapshot.status === "loading";
  const hasError = snapshot.status === "error";
  const statusText = hasError
    ? "Playback unavailable"
    : isLoading
      ? "Preparing sound…"
      : isPlaying
        ? "Playing"
        : "Paused";

  return (
    <div
      className={cn(
        "sticky top-0 z-30 border-b border-white/[0.06]",
        "bg-glow-background-elevated/90 px-4 py-2 backdrop-blur-md",
      )}
      role="region"
      aria-label="Calm player"
    >
      <div className="mx-auto flex max-w-3xl items-center gap-3">
        <button
          type="button"
          className={cn(
            "inline-flex h-11 w-11 items-center justify-center rounded-glow-button",
            "bg-white/[0.06] text-glow-text",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-glow-primary/50",
          )}
          aria-label={isPlaying ? "Pause" : hasError ? "Retry sound" : "Play"}
          disabled={isLoading}
          onClick={() => {
            if (isPlaying) service.pause();
            else void service.play();
          }}
        >
          {isPlaying ? (
            <Pause className="h-4 w-4" aria-hidden="true" />
          ) : (
            <Play className="h-4 w-4" aria-hidden="true" />
          )}
        </button>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-glow-text">
            {sound.title}
          </p>
          <p className="truncate text-xs text-glow-text-tertiary">
            {statusText}
          </p>
        </div>
        <button
          type="button"
          className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-glow-button text-glow-text-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-glow-primary/50"
          aria-label="Stop sound"
          onClick={() => service.stop()}
        >
          <Square className="h-4 w-4" aria-hidden="true" />
        </button>
        <Link
          href="/calm/sounds"
          className="inline-flex min-h-11 shrink-0 items-center text-sm font-medium text-glow-primary-light underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-glow-primary/50"
        >
          Open Sounds
        </Link>
      </div>
    </div>
  );
}
