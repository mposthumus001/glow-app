import { Sparkles } from "lucide-react";

import { GlowCard } from "@/components/ui";
import { TONIGHT_PROMPT_PLACEHOLDER } from "@/features/circles/types";
import { textStyles } from "@/lib/theme";
import { cn } from "@/lib/utils/cn";

export interface TonightPromptCardProps {
  prompt?: string;
}

export function TonightPromptCard({
  prompt = TONIGHT_PROMPT_PLACEHOLDER,
}: TonightPromptCardProps) {
  return (
    <section aria-labelledby="tonight-prompt-heading" className="mb-6">
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
              id="tonight-prompt-heading"
              className={cn(textStyles.overline, "text-glow-accent/90")}
            >
              Tonight&apos;s Prompt
            </h2>
            <p className="mt-2 text-lg font-medium leading-relaxed text-glow-text">
              {prompt}
            </p>
            <p className="mt-2 text-xs text-glow-text-tertiary">
              A gentle invitation — share when you&apos;re ready.
            </p>
          </div>
        </div>
      </GlowCard>
    </section>
  );
}
