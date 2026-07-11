"use client";

import { GlowCard } from "@/components/ui";
import { GlowContainer } from "@/components/layout";

/**
 * Circle route loading — content only; AppShell owns navigation.
 */
export function CircleLoadingState() {
  return (
    <div className="overflow-y-auto pt-safe" aria-busy="true">
      <GlowContainer size="md" as="div" className="pb-10 pt-6">
        <p className="sr-only" role="status">
          Settling into your Circle…
        </p>
        <div
          className="h-8 w-40 animate-pulse rounded-xl bg-white/[0.06] motion-reduce:animate-none"
          aria-hidden="true"
        />
        <div
          className="mt-3 h-4 w-64 max-w-full animate-pulse rounded-lg bg-white/[0.04] motion-reduce:animate-none"
          aria-hidden="true"
        />

        <GlowCard padding="md" className="mt-8 border-white/[0.06]">
          <div
            className="h-7 w-2/3 animate-pulse rounded-xl bg-white/[0.06] motion-reduce:animate-none"
            aria-hidden="true"
          />
          <div
            className="mt-3 h-4 w-full animate-pulse rounded-lg bg-white/[0.04] motion-reduce:animate-none"
            aria-hidden="true"
          />
          <div
            className="mt-2 h-4 w-4/5 animate-pulse rounded-lg bg-white/[0.04] motion-reduce:animate-none"
            aria-hidden="true"
          />
        </GlowCard>

        <GlowCard padding="md" className="mt-5 border-white/[0.06]">
          <div
            className="h-4 w-1/3 animate-pulse rounded-lg bg-white/[0.05] motion-reduce:animate-none"
            aria-hidden="true"
          />
          <div
            className="mt-4 h-6 w-3/4 animate-pulse rounded-lg bg-white/[0.06] motion-reduce:animate-none"
            aria-hidden="true"
          />
        </GlowCard>

        <div
          className="mt-5 min-h-[12rem] rounded-glow-card border border-white/[0.06] bg-glow-card/40 px-4 py-5"
          aria-hidden="true"
        >
          <div className="h-4 w-1/4 animate-pulse rounded-lg bg-white/[0.05] motion-reduce:animate-none" />
          <div className="mt-6 space-y-4">
            <div className="h-3 w-full animate-pulse rounded-lg bg-white/[0.04] motion-reduce:animate-none" />
            <div className="h-3 w-5/6 animate-pulse rounded-lg bg-white/[0.04] motion-reduce:animate-none" />
          </div>
        </div>
      </GlowContainer>
    </div>
  );
}
