"use client";

import Link from "next/link";

import { GlowButton, GlowCard } from "@/components/ui";
import { GlowContainer } from "@/components/layout";
import { PageHeader } from "@/components/shell/PageHeader";

export type ShellErrorProps = {
  title?: string;
  message?: string;
  reset?: () => void;
};

/**
 * Graceful route error — keeps shell navigation usable.
 */
export function ShellError({
  title = "Something didn't load",
  message = "Please try again in a moment. Your place in Glow is still here.",
  reset,
}: ShellErrorProps) {
  return (
    <div className="overflow-y-auto pt-safe">
      <GlowContainer size="md" as="div" className="pb-10 pt-6">
        <PageHeader title={title} subtitle={message} />

        <GlowCard padding="md" className="border-white/[0.08]">
          <div className="flex flex-col gap-3 sm:flex-row">
            {reset ? (
              <GlowButton
                type="button"
                variant="primary"
                size="md"
                onClick={reset}
              >
                Try again
              </GlowButton>
            ) : null}
            <Link
              href="/"
              className="inline-flex h-12 items-center justify-center rounded-glow-button border border-white/[0.1] px-5 text-sm font-medium text-glow-text transition-colors hover:bg-glow-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-glow-primary/50"
            >
              Back to Tonight
            </Link>
          </div>
        </GlowCard>
      </GlowContainer>
    </div>
  );
}
