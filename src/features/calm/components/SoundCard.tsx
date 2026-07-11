"use client";

import { CloudRain, Moon, Waves, Wind } from "lucide-react";

import { cn } from "@/lib/utils/cn";

import type { CalmSound } from "../types";

const VISUAL: Record<
  CalmSound["visual"],
  { icon: typeof CloudRain; wash: string }
> = {
  rain: {
    icon: CloudRain,
    wash: "from-[#6c7bff]/25 to-transparent",
  },
  hush: {
    icon: Wind,
    wash: "from-[#b694ff]/20 to-transparent",
  },
  ocean: {
    icon: Waves,
    wash: "from-[#6c9bff]/25 to-transparent",
  },
  night: {
    icon: Moon,
    wash: "from-[#8e7ab8]/25 to-transparent",
  },
};

export type SoundCardProps = {
  sound: CalmSound;
  selected: boolean;
  playing: boolean;
  onPlay: (soundId: CalmSound["id"]) => void;
};

export function SoundCard({
  sound,
  selected,
  playing,
  onPlay,
}: SoundCardProps) {
  const visual = VISUAL[sound.visual];
  const Icon = visual.icon;
  const label = playing
    ? `Pause ${sound.title}`
    : selected
      ? `Resume ${sound.title}`
      : `Play ${sound.title}`;

  return (
    <article
      className={cn(
        "relative overflow-hidden rounded-glow-card border p-4 sm:p-5",
        "bg-glow-card transition-colors duration-300",
        selected
          ? "border-glow-primary/45 bg-glow-primary/[0.07]"
          : "border-glow-card-border",
      )}
      aria-current={selected ? "true" : undefined}
    >
      <div
        className={cn(
          "pointer-events-none absolute inset-0 bg-gradient-to-br opacity-80",
          visual.wash,
        )}
        aria-hidden="true"
      />

      <div className="relative flex items-start gap-3">
        <div
          className={cn(
            "flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl",
            "bg-white/[0.06] text-glow-text-secondary",
            selected && "text-glow-primary-light",
          )}
          aria-hidden="true"
        >
          <Icon className="h-5 w-5" strokeWidth={1.75} />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <h3 className="text-base font-semibold text-glow-text">
              {sound.title}
            </h3>
            <span className="text-xs text-glow-text-tertiary">
              {sound.categoryLabel}
            </span>
          </div>
          <p className="mt-1.5 text-sm leading-relaxed text-glow-text-secondary">
            {sound.description}
          </p>
          {sound.isPlaceholderAsset ? (
            <p className="mt-2 text-[11px] text-glow-text-tertiary">
              Placeholder audio — replace before production
            </p>
          ) : null}
          {selected ? (
            <p className="mt-2 text-xs font-medium text-glow-primary-light">
              {playing ? "Playing now" : "Selected"}
            </p>
          ) : null}
        </div>

        <button
          type="button"
          onClick={() => onPlay(sound.id)}
          aria-label={label}
          aria-pressed={playing}
          className={cn(
            "relative z-[1] inline-flex h-11 min-w-11 shrink-0 items-center justify-center rounded-glow-button px-3",
            "text-sm font-medium transition-colors duration-200",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-glow-primary/50",
            "focus-visible:ring-offset-2 focus-visible:ring-offset-glow-background",
            playing
              ? "bg-glow-primary/20 text-glow-primary-light"
              : "bg-white/[0.06] text-glow-text hover:bg-white/[0.1]",
          )}
        >
          {playing ? "Pause" : "Play"}
        </button>
      </div>
    </article>
  );
}
