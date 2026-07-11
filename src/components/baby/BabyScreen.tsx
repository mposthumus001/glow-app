import { Baby, Moon, Ruler, Utensils } from "lucide-react";

import { GlowCard } from "@/components/ui";
import { GlowContainer } from "@/components/layout";
import { PageHeader } from "@/components/shell/PageHeader";
import { cn } from "@/lib/utils/cn";

const TRACK_CARDS = [
  {
    id: "feeding",
    title: "Feeding",
    description: "Gentle logs for feeds, when you’re ready.",
    icon: Utensils,
  },
  {
    id: "sleep",
    title: "Sleep",
    description: "Soft tracking for rests and nights.",
    icon: Moon,
  },
  {
    id: "nappies",
    title: "Nappies",
    description: "Simple notes without pressure.",
    icon: Baby,
  },
  {
    id: "growth",
    title: "Growth",
    description: "Milestones and measures, at your pace.",
    icon: Ruler,
  },
] as const;

export type BabyScreenProps = {
  babyName?: string | null;
  ageLine?: string | null;
};

/**
 * Production-quality Baby foundation — intentional placeholder, no fake data.
 */
export function BabyScreen({ babyName, ageLine }: BabyScreenProps) {
  const title = babyName?.trim() ? babyName.trim() : "Baby";
  const subtitle = ageLine
    ? ageLine
    : "A calm place for feeding, sleep, and growth — coming next.";

  return (
    <div className="overflow-y-auto pt-safe">
      <GlowContainer size="md" as="div" className="pb-10 pt-6">
        <PageHeader
          title={title}
          subtitle={
            ageLine
              ? "A gentle home for the rhythms that matter most."
              : subtitle
          }
        />

        {ageLine ? (
          <p className="mb-6 text-sm text-glow-text-tertiary">{ageLine}</p>
        ) : null}

        <GlowCard
          padding="md"
          className="mb-6 border-glow-primary/15 bg-glow-primary/[0.04]"
        >
          <p className="text-sm font-medium text-glow-primary">Coming next</p>
          <p className="mt-2 text-base leading-relaxed text-glow-text-secondary">
            Baby tracking will live here soon — private to your family, never
            noisy, never competitive. Nothing here is recording yet.
          </p>
        </GlowCard>

        <ul className="grid gap-3 sm:grid-cols-2">
          {TRACK_CARDS.map((card) => {
            const Icon = card.icon;
            return (
              <li key={card.id}>
                <GlowCard
                  padding="md"
                  className="h-full border-white/[0.06] opacity-90"
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
                        <h2 className="text-base font-semibold text-glow-text">
                          {card.title}
                        </h2>
                        <span className="shrink-0 text-[11px] text-glow-text-tertiary">
                          Soon
                        </span>
                      </div>
                      <p className="mt-1.5 text-sm leading-relaxed text-glow-text-secondary">
                        {card.description}
                      </p>
                      <button
                        type="button"
                        disabled
                        aria-disabled="true"
                        className="mt-4 text-sm text-glow-text-tertiary disabled:cursor-not-allowed"
                      >
                        Not available yet
                      </button>
                    </div>
                  </div>
                </GlowCard>
              </li>
            );
          })}
        </ul>
      </GlowContainer>
    </div>
  );
}
