"use client";

import { Heart, Pause, Play, Square } from "lucide-react";

import { GlowCard, GlowSelect } from "@/components/ui";
import { cn } from "@/lib/utils/cn";

import { getSoundById } from "../catalogue";
import { getCalmPlayerService } from "../player/CalmPlayerService";
import {
  formatRemainingTimer,
  formatSleepTimerLabel,
  SLEEP_TIMER_OPTIONS,
  sleepTimerRemainingMs,
} from "../player/playerLogic";
import type { CalmPlayerSnapshot, SleepTimerMinutes } from "../types";

export type CalmPlayerPanelProps = {
  snapshot: CalmPlayerSnapshot;
  reducedMotion: boolean;
  nowMs: number;
};

export function CalmPlayerPanel({
  snapshot,
  reducedMotion,
  nowMs,
}: CalmPlayerPanelProps) {
  const sound = getSoundById(snapshot.soundId);
  const service = getCalmPlayerService();
  const isPlaying = snapshot.status === "playing";
  const isLoading = snapshot.status === "loading";
  const remaining = sleepTimerRemainingMs(snapshot.sleepTimerEndsAt, nowMs);
  const favouriteActive =
    snapshot.favouriteSoundId != null &&
    snapshot.favouriteSoundId === snapshot.soundId;

  const statusLabel = (() => {
    if (snapshot.status === "error") return snapshot.errorMessage ?? "Unavailable";
    if (isLoading) return "Preparing sound…";
    if (isPlaying) return "Playing";
    if (snapshot.status === "paused" && sound) return "Paused";
    return "Nothing playing";
  })();

  return (
    <GlowCard
      padding="md"
      className="border-glow-secondary/20 bg-glow-secondary/[0.05]"
      aria-labelledby="calm-player-heading"
    >
      <div className="flex items-start gap-4">
        <div
          className={cn(
            "flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl",
            "bg-gradient-to-br from-glow-secondary/30 to-glow-primary/10",
            "text-glow-text-secondary",
            isPlaying && !reducedMotion && "shadow-[0_0_24px_rgba(108,123,255,0.18)]",
          )}
          aria-hidden="true"
        >
          {isPlaying ? (
            <Pause className="h-6 w-6" strokeWidth={1.5} />
          ) : (
            <Play className="h-6 w-6" strokeWidth={1.5} />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <p
            id="calm-now-playing"
            className="text-base font-semibold text-glow-text"
            aria-live="polite"
            aria-atomic="true"
          >
            {sound?.title ?? "Choose a sound"}
          </p>
          <p className="mt-1 text-sm text-glow-text-secondary">{statusLabel}</p>
          {sound ? (
            <p className="mt-0.5 text-xs text-glow-text-tertiary">
              {sound.categoryLabel}
              {sound.continuous ? " · Continuous" : null}
            </p>
          ) : null}
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-2">
        <button
          type="button"
          className={controlButtonClass}
          aria-label={isPlaying ? "Pause" : "Play"}
          aria-pressed={isPlaying}
          disabled={!sound && !snapshot.recentSoundId && !snapshot.favouriteSoundId}
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
          <span>{isPlaying ? "Pause" : "Play"}</span>
        </button>

        <button
          type="button"
          className={controlButtonClass}
          aria-label="Stop"
          disabled={snapshot.status === "idle" && !snapshot.soundId}
          onClick={() => service.stop()}
        >
          <Square className="h-4 w-4" aria-hidden="true" />
          <span>Stop</span>
        </button>

        <button
          type="button"
          className={cn(
            controlButtonClass,
            favouriteActive && "border-glow-primary/40 text-glow-primary-light",
          )}
          aria-label={
            favouriteActive ? "Remove favourite sound" : "Save as favourite sound"
          }
          aria-pressed={favouriteActive}
          disabled={!snapshot.soundId && !snapshot.recentSoundId}
          onClick={() => service.toggleFavourite()}
        >
          <Heart
            className="h-4 w-4"
            aria-hidden="true"
            fill={favouriteActive ? "currentColor" : "none"}
          />
          <span>{favouriteActive ? "Favourited" : "Favourite"}</span>
        </button>
      </div>

      <div className="mt-5">
        <label
          htmlFor="calm-volume"
          className="text-sm font-medium text-glow-text-secondary"
        >
          Volume
        </label>
        <input
          id="calm-volume"
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={snapshot.volume}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(snapshot.volume * 100)}
          aria-valuetext={`${Math.round(snapshot.volume * 100)} percent`}
          onChange={(event) => {
            service.setVolume(Number(event.target.value));
          }}
          className="mt-2 h-2 w-full cursor-pointer appearance-none rounded-full bg-white/[0.1] accent-glow-primary"
        />
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
        <GlowSelect
          id="calm-sleep-timer"
          label="Sleep timer"
          value={String(snapshot.sleepTimerMinutes)}
          options={SLEEP_TIMER_OPTIONS.map((minutes) => ({
            value: String(minutes),
            label: formatSleepTimerLabel(minutes),
          }))}
          onChange={(event) => {
            const minutes = Number(event.target.value) as SleepTimerMinutes;
            service.setSleepTimer(minutes);
          }}
        />
        {snapshot.sleepTimerEndsAt != null ? (
          <div className="flex items-center gap-2 pb-1">
            <p
              className="text-sm text-glow-text-secondary"
              aria-live="polite"
            >
              Stops in {formatRemainingTimer(remaining)}
            </p>
            <button
              type="button"
              className="text-sm font-medium text-glow-primary-light underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-glow-primary/50"
              onClick={() => service.clearSleepTimer()}
            >
              Cancel timer
            </button>
          </div>
        ) : null}
      </div>

      {snapshot.errorMessage ? (
        <p
          role="alert"
          className="mt-4 text-sm leading-relaxed text-glow-error"
        >
          {snapshot.errorMessage}
        </p>
      ) : null}
    </GlowCard>
  );
}

const controlButtonClass = cn(
  "inline-flex h-11 min-w-11 items-center justify-center gap-2 rounded-glow-button px-4",
  "border border-glow-card-border bg-white/[0.04] text-sm font-medium text-glow-text",
  "transition-colors duration-200 hover:bg-white/[0.08]",
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-glow-primary/50",
  "disabled:cursor-not-allowed disabled:opacity-50",
);
