"use client";

import { PROMPT_RESPONSE_LABEL } from "@/features/circles/prompts/promptResponseLogic";
import { cn } from "@/lib/utils/cn";

export type CirclePromptComposerBannerProps = {
  promptText: string;
  composerFieldId: string;
  onRemove: () => void;
  staleMessage?: string | null;
};

export function CirclePromptComposerBanner({
  promptText,
  composerFieldId,
  onRemove,
  staleMessage = null,
}: CirclePromptComposerBannerProps) {
  return (
    <div
      className={cn(
        "rounded-xl border border-glow-accent/15 bg-glow-accent/[0.06] px-3.5 py-3",
        "text-sm leading-relaxed text-glow-text-secondary",
      )}
      role="group"
      aria-labelledby="circle-prompt-composer-label"
      aria-describedby="circle-prompt-composer-text"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p
            id="circle-prompt-composer-label"
            className="text-xs font-medium tracking-wide text-glow-accent/90"
          >
            {PROMPT_RESPONSE_LABEL}
          </p>
          <p
            id="circle-prompt-composer-text"
            className="mt-1 break-words text-sm text-glow-text"
          >
            {promptText}
          </p>
          {staleMessage ? (
            <p className="mt-2 text-xs text-glow-text-tertiary" role="status">
              {staleMessage}
            </p>
          ) : null}
        </div>

        <button
          type="button"
          onClick={onRemove}
          className={cn(
            "shrink-0 rounded-md px-2 py-1 text-xs font-medium",
            "text-glow-text-tertiary hover:bg-white/[0.06] hover:text-glow-text-secondary",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-glow-primary/50",
          )}
        >
          Remove
        </button>
      </div>

      <p className="sr-only">
        Your message below will be linked to this prompt. Field id:{" "}
        {composerFieldId}
      </p>
    </div>
  );
}
