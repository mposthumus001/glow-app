"use client";

import { useEffect, useState } from "react";
import { Heart } from "lucide-react";

import { GlowCard } from "@/components/ui";
import { GlowContainer } from "@/components/layout";
import { PageHeader } from "@/components/shell/PageHeader";
import { useGlowReducedMotion } from "@/lib/hooks/useGlowReducedMotion";
import { cn } from "@/lib/utils/cn";

import {
  CALM_CATEGORIES,
  getActiveSounds,
  getSoundById,
  getSoundsByCategory,
} from "../catalogue";
import { useCalmPlayer } from "../hooks/useCalmPlayer";
import { getCalmPlayerService } from "../player/CalmPlayerService";
import type { CalmCategoryId, CalmSoundId } from "../types";
import { CalmPlayerPanel } from "./CalmPlayerPanel";
import { SoundCard } from "./SoundCard";

/**
 * Glow Calm home — curated sounds, shared player, sleep timer, favourite.
 */
export function CalmScreen() {
  const snapshot = useCalmPlayer();
  const reducedMotion = useGlowReducedMotion();
  const service = getCalmPlayerService();
  const sounds = getActiveSounds();
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [filter, setFilter] = useState<CalmCategoryId | "all">("all");

  useEffect(() => {
    if (snapshot.sleepTimerEndsAt == null) return;
    const id = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [snapshot.sleepTimerEndsAt]);

  const visibleSounds =
    filter === "all" ? sounds : getSoundsByCategory(filter);

  const favourite = getSoundById(snapshot.favouriteSoundId);
  const recent = getSoundById(snapshot.recentSoundId);

  function handlePlayToggle(soundId: CalmSoundId) {
    if (snapshot.soundId === soundId && snapshot.status === "playing") {
      service.pause();
      return;
    }
    if (snapshot.soundId === soundId && snapshot.status === "paused") {
      void service.play();
      return;
    }
    service.selectSound(soundId, { autoplay: true });
  }

  return (
    <div className="overflow-y-auto pt-safe">
      <GlowContainer size="md" as="div" className="pb-10 pt-6">
        <PageHeader
          title="Calm"
          subtitle="A quiet corner for soft sound — when you need a breath, not a feed."
        />

        <p className="mb-6 max-w-prose text-sm leading-relaxed text-glow-text-secondary">
          Choose one gentle soundscape. Nothing autoplays. Nothing competes for
          your attention.
        </p>

        {(favourite || recent) && (
          <section
            className="mb-6"
            aria-labelledby="calm-return-heading"
          >
            <h2
              id="calm-return-heading"
              className="mb-3 text-sm font-medium text-glow-text-secondary"
            >
              {favourite ? "Your favourite" : "Recently played"}
            </h2>
            <GlowCard padding="md" className="border-white/[0.06]">
              <div className="flex items-center gap-3">
                <div
                  className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/[0.05] text-glow-primary-light"
                  aria-hidden="true"
                >
                  <Heart
                    className="h-4 w-4"
                    fill={favourite ? "currentColor" : "none"}
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-glow-text">
                    {(favourite ?? recent)?.title}
                  </p>
                  <p className="text-sm text-glow-text-secondary">
                    {(favourite ?? recent)?.categoryLabel}
                  </p>
                </div>
                <button
                  type="button"
                  className={cn(
                    "inline-flex h-11 items-center justify-center rounded-glow-button px-4",
                    "bg-glow-primary/15 text-sm font-medium text-glow-primary-light",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-glow-primary/50",
                  )}
                  aria-label={`Play ${(favourite ?? recent)?.title}`}
                  onClick={() => {
                    const id = (favourite ?? recent)?.id;
                    if (id) handlePlayToggle(id);
                  }}
                >
                  Play
                </button>
              </div>
            </GlowCard>
          </section>
        )}

        <section className="mb-8" aria-labelledby="calm-player-heading">
          <h2
            id="calm-player-heading"
            className="mb-3 text-sm font-medium text-glow-text-secondary"
          >
            Player
          </h2>
          <CalmPlayerPanel
            snapshot={snapshot}
            reducedMotion={reducedMotion}
            nowMs={nowMs}
          />
        </section>

        <section aria-labelledby="calm-library-heading">
          <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
            <h2
              id="calm-library-heading"
              className="text-sm font-medium text-glow-text-secondary"
            >
              Sound library
            </h2>
            <div
              className="flex flex-wrap gap-2"
              role="group"
              aria-label="Filter by category"
            >
              <FilterChip
                active={filter === "all"}
                onClick={() => setFilter("all")}
                label="All"
              />
              {CALM_CATEGORIES.map((category) => (
                <FilterChip
                  key={category.id}
                  active={filter === category.id}
                  onClick={() => setFilter(category.id)}
                  label={category.title}
                />
              ))}
            </div>
          </div>

          {sounds.length === 0 ? (
            <EmptyLibrary />
          ) : visibleSounds.length === 0 ? (
            <GlowCard padding="md" className="border-white/[0.06]">
              <p className="text-sm text-glow-text-secondary">
                No sounds in this category yet.
              </p>
            </GlowCard>
          ) : (
            <ul className="grid gap-3">
              {visibleSounds.map((sound) => (
                <li key={sound.id}>
                  <SoundCard
                    sound={sound}
                    selected={snapshot.soundId === sound.id}
                    playing={
                      snapshot.soundId === sound.id &&
                      snapshot.status === "playing"
                    }
                    onPlay={handlePlayToggle}
                  />
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="mt-8" aria-labelledby="calm-categories-heading">
          <h2
            id="calm-categories-heading"
            className="mb-3 text-sm font-medium text-glow-text-secondary"
          >
            Categories
          </h2>
          <ul className="grid gap-3 sm:grid-cols-2">
            {CALM_CATEGORIES.map((category) => (
              <li key={category.id}>
                <button
                  type="button"
                  onClick={() => setFilter(category.id)}
                  className={cn(
                    "w-full rounded-glow-card border p-4 text-left transition-colors",
                    "border-glow-card-border bg-glow-card hover:bg-glow-card-elevated",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-glow-primary/50",
                    filter === category.id && "border-glow-primary/40",
                  )}
                >
                  <p className="font-semibold text-glow-text">{category.title}</p>
                  <p className="mt-1.5 text-sm text-glow-text-secondary">
                    {category.description}
                  </p>
                </button>
              </li>
            ))}
          </ul>
        </section>
      </GlowContainer>
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "h-9 rounded-glow-button px-3 text-xs font-medium transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-glow-primary/50",
        active
          ? "bg-glow-primary/20 text-glow-primary-light"
          : "bg-white/[0.04] text-glow-text-secondary hover:bg-white/[0.08]",
      )}
    >
      {label}
    </button>
  );
}

function EmptyLibrary() {
  return (
    <GlowCard padding="md" className="border-dashed border-white/[0.1]">
      <p className="text-base font-medium text-glow-text">No sounds yet</p>
      <p className="mt-2 text-sm leading-relaxed text-glow-text-secondary">
        The Calm library is empty right now. Check back soon — nothing is
        broken on your side.
      </p>
    </GlowCard>
  );
}
