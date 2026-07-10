"use client";

import { Sparkles } from "lucide-react";

import type { CircleDailyPrompt } from "@/features/circles/prompts/promptLibrary";
import { GlowButton, GlowCard } from "@/components/ui";
import { textStyles } from "@/lib/theme";
import { cn } from "@/lib/utils/cn";
import { useGlowReducedMotion } from "@/lib/hooks/useGlowReducedMotion";

export type CirclePromptCardProps = {
  prompt: CircleDailyPrompt | null;
  status?: "loading" | "ready" | "unavailable";
  onShare?: () => void;
};

export function CirclePromptCard({
  prompt,
  status = "ready",
  onShare,
}: CirclePromptCardProps) {
  const reduceMotion = useGlowReducedMotion();

  const promptText = prompt?.promptText;
  const title = prompt?.title ?? "Today's prompt";

  return (
    <section aria-labelledby="circle-prompt-heading" className="mb-6">
      <GlowCard
        padding="md"
        className="border-glow-accent/10 bg-[rgba(255,216,122,0.04)] shadow-[0_4px_24px_rgba(0,0,0,0.15)]"
      >
        <div className="flex items-start gap-3">
          <div
            className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-glow-accent/15 text-glow-accent"
            aria-hidden="true"
          >
            <Sparkles className="h-4 w-4" strokeWidth={1.75} />
          </div>
          <div className="min-w-0 flex-1">
            <h2
              id="circle-prompt-heading"
              className={cn(textStyles.overline, "text-glow-accent/90")}
            >
              {title}
            </h2>

            {status === "loading" ? (
              <p className="mt-2 text-sm text-glow-text-tertiary" role="status">
                Finding today&apos;s gentle invitation…
              </p>
            ) : null}

            {status === "ready" && promptText ? (
              <p className="mt-2 text-lg font-medium leading-relaxed text-glow-text">
                {promptText}
              </p>
            ) : null}

            {status === "unavailable" || (status === "ready" && !promptText) ? (
              <p className="mt-2 text-sm leading-relaxed text-glow-text-secondary">
                No prompt today — share whatever feels right when you&apos;re
                ready.
              </p>
            ) : null}

            <p className="mt-2 text-xs text-glow-text-tertiary">
              Optional · A gentle invitation, not a task
            </p>

            {status === "ready" && promptText && onShare ? (
              <GlowButton
                type="button"
                variant="secondary"
                size="sm"
                className={cn(
                  "mt-4",
                  !reduceMotion && "transition-colors duration-200",
                )}
                onClick={onShare}
              >
                Share something
              </GlowButton>
            ) : null}
          </div>
        </div>
      </GlowCard>
    </section>
  );
}
