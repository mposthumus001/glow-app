import { CloudRain, Moon, Waves, Wind } from "lucide-react";

import { GlowCard } from "@/components/ui";
import { GlowContainer } from "@/components/layout";
import { PageHeader } from "@/components/shell/PageHeader";
import { cn } from "@/lib/utils/cn";

const SOUND_CATEGORIES = [
  {
    id: "rain",
    title: "Rain",
    description: "Soft rainfall for settling nights.",
    icon: CloudRain,
  },
  {
    id: "white-noise",
    title: "White Noise",
    description: "Steady hush for focus and rest.",
    icon: Wind,
  },
  {
    id: "ocean",
    title: "Ocean",
    description: "Gentle waves, unhurried.",
    icon: Waves,
  },
  {
    id: "night",
    title: "Night Sounds",
    description: "Quiet evening atmosphere.",
    icon: Moon,
  },
] as const;

/**
 * Production-quality Calm foundation — no fake playback, no audio deps.
 */
export function CalmScreen() {
  return (
    <div className="overflow-y-auto pt-safe">
      <GlowContainer size="md" as="div" className="pb-10 pt-6">
        <PageHeader
          title="Calm"
          subtitle="A peaceful corner for soft sound and stillness — when you need a breath."
        />

        <GlowCard
          padding="md"
          className="mb-6 border-glow-secondary/15 bg-glow-secondary/[0.04]"
        >
          <p className="text-sm font-medium text-glow-secondary-light">
            Coming next
          </p>
          <p className="mt-2 text-base leading-relaxed text-glow-text-secondary">
            Soundscapes and a gentle player will arrive here. Nothing is playing
            yet — this space is ready, not pretending.
          </p>
        </GlowCard>

        <section aria-labelledby="calm-categories-heading">
          <h2
            id="calm-categories-heading"
            className="mb-3 text-sm font-medium text-glow-text-secondary"
          >
            Sound categories
          </h2>
          <ul className="grid gap-3 sm:grid-cols-2">
            {SOUND_CATEGORIES.map((category) => {
              const Icon = category.icon;
              return (
                <li key={category.id}>
                  <GlowCard
                    padding="md"
                    className="h-full border-white/[0.06]"
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={cn(
                          "flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl",
                          "bg-white/[0.05] text-glow-text-secondary",
                        )}
                        aria-hidden="true"
                      >
                        <Icon className="h-5 w-5" strokeWidth={1.75} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <h3 className="text-base font-semibold text-glow-text">
                            {category.title}
                          </h3>
                          <span className="shrink-0 text-[11px] text-glow-text-tertiary">
                            Soon
                          </span>
                        </div>
                        <p className="mt-1.5 text-sm leading-relaxed text-glow-text-secondary">
                          {category.description}
                        </p>
                      </div>
                    </div>
                  </GlowCard>
                </li>
              );
            })}
          </ul>
        </section>

        <section className="mt-8" aria-labelledby="calm-player-heading">
          <h2
            id="calm-player-heading"
            className="mb-3 text-sm font-medium text-glow-text-secondary"
          >
            Player preview
          </h2>
          <GlowCard
            padding="md"
            className="border-dashed border-white/[0.1] bg-white/[0.02]"
          >
            <div className="flex items-center gap-4">
              <div
                className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/[0.05] text-glow-text-tertiary"
                aria-hidden="true"
              >
                <Moon className="h-6 w-6" strokeWidth={1.5} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-base font-medium text-glow-text">
                  Nothing playing
                </p>
                <p className="mt-1 text-sm text-glow-text-tertiary">
                  Playback will be available in a later Calm sprint.
                </p>
                <div
                  className="mt-4 h-1.5 w-full rounded-full bg-white/[0.06]"
                  aria-hidden="true"
                />
                <button
                  type="button"
                  disabled
                  aria-disabled="true"
                  className="mt-4 text-sm text-glow-text-tertiary disabled:cursor-not-allowed"
                >
                  Unavailable
                </button>
              </div>
            </div>
          </GlowCard>
        </section>
      </GlowContainer>
    </div>
  );
}
