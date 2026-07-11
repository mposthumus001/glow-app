"use client";

import { Heart } from "lucide-react";
import { motion } from "framer-motion";
import Link from "next/link";

import { AnimatedCount } from "@/components/ui/AnimatedCount";
import { GlowButton, GlowCard } from "@/components/ui";
import { GlowContainer } from "@/components/layout";
import { GlowAtlas, useMapClusterPresence } from "@/features/glow-atlas";
import { tonightMock } from "@/lib/mock/tonight";
import { getTimeOfDayGreeting } from "@/lib/utils/greeting";
import { textStyles } from "@/lib/theme";
import { cn } from "@/lib/utils/cn";

const fadeUp = {
  hidden: { opacity: 0, y: 14 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: i * 0.07,
      duration: 0.55,
      ease: [0.22, 1, 0.36, 1] as const,
    },
  }),
};

function AwakeHeadline({ count }: { count: number }) {
  if (count === 0) {
    return <span>You&apos;re the first light here right now.</span>;
  }

  if (count === 1) {
    return (
      <span>
        You&apos;re not alone in Glow, even when the map is quiet.
      </span>
    );
  }

  const noun = count === 1 ? "parent" : "parents";

  return (
    <span>
      <AnimatedCount
        value={count}
        duration={650}
        aria-label={`${count} ${noun} awake`}
      />{" "}
      {noun} are awake with you tonight.
    </span>
  );
}

/**
 * Tonight — default authenticated landing.
 * Presence lifecycle is owned by AppShell; Atlas clusters stay here.
 */
export function TonightScreen({ displayName }: { displayName?: string }) {
  const { user, awakeTogether, circle, reminder } = tonightMock;
  const {
    presence,
    countryCount,
    connection,
    lastUpdatedAt,
    status: clusterStatus,
  } = useMapClusterPresence();

  const name = displayName?.trim() || user.name;
  const greeting = getTimeOfDayGreeting();
  const awakeCount = clusterStatus === "live" ? countryCount : 0;

  return (
    <div className="overflow-y-auto pt-safe">
      <GlowContainer size="md" as="div" className="pb-10">
        <motion.header
          custom={0}
          initial="hidden"
          animate="visible"
          variants={fadeUp}
          className="flex items-center justify-between gap-3 pb-6 pt-8 lg:pt-6"
        >
          <span className="glow-gradient-text text-[1.75rem] font-bold tracking-tight lg:sr-only">
            Glow
          </span>
        </motion.header>

        <motion.section
          custom={1}
          initial="hidden"
          animate="visible"
          variants={fadeUp}
          className="mb-7"
        >
          <h1 className={cn(textStyles.h1, "text-[1.65rem] sm:text-3xl")}>
            {greeting}, {name}{" "}
            <span aria-hidden="true">🌙</span>
          </h1>
          <p
            className="mt-3 text-[1.05rem] leading-relaxed text-glow-text-secondary"
            aria-live="polite"
          >
            <span aria-hidden="true">💜 </span>
            <AwakeHeadline count={awakeCount} />
          </p>
        </motion.section>

        <motion.div
          custom={2}
          initial="hidden"
          animate="visible"
          variants={fadeUp}
          className="mb-8"
        >
          <GlowAtlas
            presence={presence}
            countryCount={countryCount}
            connection={connection}
            lastUpdatedAt={lastUpdatedAt}
          />
        </motion.div>

        <motion.section
          custom={3}
          initial="hidden"
          animate="visible"
          variants={fadeUp}
          className="mb-9"
        >
          <GlowButton
            variant="primary"
            size="lg"
            fullWidth
            className="h-[3.75rem] rounded-[1.75rem] text-[1.05rem] font-semibold shadow-[0_8px_32px_rgba(182,148,255,0.35)]"
          >
            {awakeTogether.label}
          </GlowButton>
        </motion.section>

        <motion.div
          custom={4}
          initial="hidden"
          animate="visible"
          variants={fadeUp}
          className="mb-5"
        >
          <GlowCard padding="md" className="border-white/[0.08]">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-glow-primary/15 text-glow-primary">
                <Heart
                  className="h-5 w-5"
                  strokeWidth={1.75}
                  aria-hidden="true"
                />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-glow-text-secondary">
                  {circle.title}
                </p>
                <h2 className="mt-1.5 text-xl font-semibold leading-snug tracking-tight">
                  {circle.name}{" "}
                  <span aria-hidden="true">🌙</span>
                </h2>
              </div>
            </div>

            <p className="mt-5 text-base leading-relaxed text-glow-text-secondary">
              {circle.awakeParents} parents are awake with you now
            </p>
            <p className="mt-1.5 text-sm text-glow-text-tertiary">
              Babies: {circle.babies} · {circle.location}
            </p>

            <Link
              href="/circle"
              className={cn(
                "mt-6 inline-flex h-12 w-full items-center justify-center rounded-glow-button",
                "border border-white/[0.1] bg-transparent text-base font-medium text-glow-text",
                "transition-colors duration-200 hover:bg-glow-card hover:border-glow-card-border-hover",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-glow-primary/50",
                "focus-visible:ring-offset-2 focus-visible:ring-offset-glow-background",
              )}
            >
              {circle.cta}
            </Link>
          </GlowCard>
        </motion.div>

        <motion.div
          custom={5}
          initial="hidden"
          animate="visible"
          variants={fadeUp}
        >
          <GlowCard
            padding="md"
            className="border-glow-accent/10 bg-[rgba(255,216,122,0.04)] shadow-[0_4px_24px_rgba(0,0,0,0.15)]"
          >
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-glow-accent/90">
              {reminder.title}
            </p>
            <div className="mt-4 space-y-2.5">
              {reminder.lines.map((line) => (
                <p
                  key={line}
                  className="text-lg font-medium leading-relaxed text-glow-text"
                >
                  {line}
                </p>
              ))}
            </div>
          </GlowCard>
        </motion.div>
      </GlowContainer>
    </div>
  );
}
