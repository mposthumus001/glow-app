"use client";

import { motion } from "framer-motion";
import { LogoutButton } from "@/components/auth/LogoutButton";
import { GlowButton, GlowCard } from "@/components/ui";
import { GlowPage, GlowContainer, BottomNavigation } from "@/components/layout";
import { GlowMapPlaceholder } from "./GlowMapPlaceholder";
import { tonightMock } from "@/lib/mock/tonight";
import { textStyles } from "@/lib/theme";

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.5, ease: "easeOut" as const },
  }),
};

export function TonightScreen({ displayName }: { displayName?: string }) {
  const { user, greeting, awakeCount, awakeTogether, circle, reminder } =
    tonightMock;
  const name = displayName?.trim() || user.name;

  return (
    <GlowPage withBottomNav>
      <main className="overflow-y-auto pt-safe">
        <GlowContainer size="md" as="div" className="pb-8">
          {/* ── Header ── */}
          <motion.header
            custom={0}
            initial="hidden"
            animate="visible"
            variants={fadeUp}
            className="flex items-center justify-between gap-3 pb-6 pt-8"
          >
            <span className="glow-gradient-text text-3xl font-bold tracking-tight">
              Glow
            </span>
            <LogoutButton />
          </motion.header>

          {/* ── Greeting ── */}
          <motion.section
            custom={1}
            initial="hidden"
            animate="visible"
            variants={fadeUp}
            className="mb-8"
          >
            <h1 className={textStyles.h1}>
              {greeting}, {name} 🌙
            </h1>
            <p className="mt-3 text-lg leading-relaxed text-glow-text-secondary">
              💜 {awakeCount.toLocaleString()} parents are awake with you
              tonight.
            </p>
          </motion.section>

          {/* ── Glow Map ── */}
          <motion.div
            custom={2}
            initial="hidden"
            animate="visible"
            variants={fadeUp}
            className="mb-8"
          >
            <GlowMapPlaceholder />
          </motion.div>

          {/* ── Awake Together ── */}
          <motion.section
            custom={3}
            initial="hidden"
            animate="visible"
            variants={fadeUp}
            className="mb-8 flex flex-col items-center gap-3"
          >
            <GlowButton variant="primary" size="lg" fullWidth>
              {awakeTogether.label}
            </GlowButton>
            <p className="text-sm text-glow-text-secondary">
              {awakeTogether.subtitle}
            </p>
          </motion.section>

          {/* ── Glow Circle ── */}
          <motion.div
            custom={4}
            initial="hidden"
            animate="visible"
            variants={fadeUp}
            className="mb-5"
          >
            <GlowCard padding="md">
              <p className="text-sm font-medium text-glow-text-secondary">
                {circle.title}
              </p>
              <h2 className="mt-2 text-xl font-semibold leading-snug">
                {circle.name}
              </h2>
              <p className="mt-3 text-base text-glow-text-secondary">
                {circle.awakeParents} parents are awake with you now
              </p>
              <p className="mt-1 text-sm text-glow-text-tertiary">
                Babies: {circle.babies} · {circle.location}
              </p>
              <GlowButton
                variant="ghost"
                size="md"
                fullWidth
                className="mt-5"
              >
                {circle.cta}
              </GlowButton>
            </GlowCard>
          </motion.div>

          {/* ── Tonight's Reminder ── */}
          <motion.div
            custom={5}
            initial="hidden"
            animate="visible"
            variants={fadeUp}
          >
            <GlowCard
              padding="md"
              className="border-glow-accent/20 bg-[rgba(255,216,122,0.06)]"
            >
              <p className="text-xs font-semibold uppercase tracking-wider text-glow-accent">
                {reminder.title}
              </p>
              <div className="mt-4 space-y-2">
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
      </main>

      <BottomNavigation activeId="tonight" />
    </GlowPage>
  );
}
