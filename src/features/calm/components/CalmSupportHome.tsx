import { ArrowRight, Headphones, Sparkles } from "lucide-react";
import Link from "next/link";

import { GlowContainer } from "@/components/layout";
import { PageHeader } from "@/components/shell/PageHeader";
import { GlowCard } from "@/components/ui";

import { CALM_SUPPORT_CATEGORIES } from "../content/categories";
import { getCalmExercise } from "../content/exercises";

export function CalmSupportHome() {
  const featured = getCalmExercise("one-minute-breathing-reset");

  if (!featured) return null;

  return (
    <div className="overflow-y-auto">
      <GlowContainer size="md" as="div" className="pb-10 pt-6">
        <PageHeader
          title="Support"
          subtitle="Choose what feels useful right now. There is nothing you have to finish."
        />

        <section aria-labelledby="calm-featured-heading" className="mb-8">
          <GlowCard
            padding="lg"
            className="border-glow-primary/20 bg-gradient-to-br from-glow-primary/[0.12] to-glow-secondary/[0.04]"
          >
            <div className="flex items-start gap-4">
              <span
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/[0.06] text-glow-primary-light"
                aria-hidden="true"
              >
                <Sparkles className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold uppercase tracking-wider text-glow-primary-light">
                  A gentle place to start
                </p>
                <h2 id="calm-featured-heading" className="mt-2 text-xl font-semibold text-glow-text">
                  {featured.title}
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-glow-text-secondary">
                  {featured.summary}
                </p>
                <p className="mt-3 text-xs text-glow-text-tertiary">
                  {featured.durationLabel}
                </p>
                <Link
                  href={`/calm/support/${featured.slug}`}
                  className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-glow-button bg-glow-primary/20 px-4 text-sm font-semibold text-glow-primary-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-glow-primary/50"
                >
                  Begin this reset
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </div>
            </div>
          </GlowCard>
        </section>

        <section aria-labelledby="calm-needs-heading">
          <h2 id="calm-needs-heading" className="mb-3 text-base font-semibold text-glow-text">
            What would help right now?
          </h2>
          <ul className="grid gap-3 sm:grid-cols-2">
            {CALM_SUPPORT_CATEGORIES.map((category) => {
              const exercise = getCalmExercise(category.exerciseSlug);
              return (
                <li key={category.id}>
                  <Link
                    href={`/calm/support/${category.exerciseSlug}`}
                    className="group flex min-h-28 h-full items-center justify-between gap-4 rounded-glow-card border border-glow-card-border bg-glow-card p-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-glow-primary/50"
                  >
                    <span>
                      <span className="block font-semibold text-glow-text">
                        {category.title}
                      </span>
                      <span className="mt-1.5 block text-sm leading-relaxed text-glow-text-secondary">
                        {category.description}
                      </span>
                      {exercise ? (
                        <span className="mt-2 block text-xs text-glow-text-tertiary">
                          {exercise.durationLabel}
                        </span>
                      ) : null}
                    </span>
                    <ArrowRight
                      className="h-4 w-4 shrink-0 text-glow-text-tertiary transition-transform group-hover:translate-x-0.5"
                      aria-hidden="true"
                    />
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>

        <section className="mt-8" aria-labelledby="calm-sounds-heading">
          <GlowCard padding="md">
            <div className="flex items-center gap-4">
              <Headphones className="h-5 w-5 shrink-0 text-glow-text-secondary" aria-hidden="true" />
              <div className="min-w-0 flex-1">
                <h2 id="calm-sounds-heading" className="font-semibold text-glow-text">
                  Looking for Sounds?
                </h2>
                <p className="mt-1 text-sm text-glow-text-secondary">
                  See what is being prepared for the Glow beta.
                </p>
              </div>
              <Link
                href="/calm/sounds"
                className="inline-flex min-h-11 shrink-0 items-center px-2 text-sm font-semibold text-glow-primary-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-glow-primary/50"
              >
                Sounds
              </Link>
            </div>
          </GlowCard>
        </section>

        <p className="mt-8 max-w-prose text-xs leading-relaxed text-glow-text-tertiary">
          Glow offers general wellbeing support and is not a substitute for
          professional or emergency care.{" "}
          <Link
            href="/profile/safety"
            className="font-medium text-glow-text-secondary underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-glow-primary/50"
          >
            View safety information
          </Link>
          .
        </p>
      </GlowContainer>
    </div>
  );
}
