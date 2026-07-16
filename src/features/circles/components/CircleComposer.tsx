"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Send } from "lucide-react";

import { CirclePromptComposerBanner } from "@/features/circles/components/CirclePromptComposerBanner";
import { GlowButton, GlowTextarea } from "@/components/ui";
import {
  MESSAGE_MAX_LENGTH,
  prepareMessageBody,
} from "@/features/circles/messaging/messageLogic";
import type { PromptComposerContext } from "@/features/circles/prompts/promptResponseLogic";
import {
  promptComposerAnnouncement,
  shouldClearComposerDraftAfterSend,
} from "@/features/circles/prompts/promptResponseLogic";
import { useGlowReducedMotion } from "@/lib/hooks/useGlowReducedMotion";
import { cn } from "@/lib/utils/cn";

export interface CircleComposerProps {
  onSend: (body: string) => Promise<{ ok: boolean; reason?: string }>;
  onTypingActivity?: () => void;
  onStopTyping?: () => void;
  disabled?: boolean;
  isSending?: boolean;
  textareaRef?: React.RefObject<HTMLTextAreaElement | null>;
  focusRequestToken?: number;
  promptContext?: PromptComposerContext | null;
  onCancelPrompt?: () => void;
  promptAnnounceToken?: number;
  stalePromptMessage?: string | null;
}

/**
 * Isolated composer state so keystrokes do not rerender the message list.
 */
export function CircleComposer({
  onSend,
  onTypingActivity,
  onStopTyping,
  disabled = false,
  isSending = false,
  textareaRef,
  focusRequestToken = 0,
  promptContext = null,
  onCancelPrompt,
  promptAnnounceToken = 0,
  stalePromptMessage = null,
}: CircleComposerProps) {
  const reduceMotion = useGlowReducedMotion();
  const hintId = useId();
  const liveRegionRef = useRef<HTMLDivElement>(null);
  const lastAnnouncedToken = useRef(0);
  const [draft, setDraft] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    if (focusRequestToken > 0) {
      textareaRef?.current?.scrollIntoView({
        behavior: reduceMotion ? "auto" : "smooth",
        block: "nearest",
      });
      requestAnimationFrame(() => {
        textareaRef?.current?.focus({ preventScroll: true });
      });
    }
  }, [focusRequestToken, textareaRef, reduceMotion]);

  useEffect(() => {
    if (
      promptAnnounceToken <= 0 ||
      promptAnnounceToken === lastAnnouncedToken.current ||
      !promptContext
    ) {
      return;
    }

    lastAnnouncedToken.current = promptAnnounceToken;
    const announcement = promptComposerAnnouncement(promptContext);
    if (!announcement || !liveRegionRef.current) return;

    liveRegionRef.current.textContent = "";
    requestAnimationFrame(() => {
      if (liveRegionRef.current) {
        liveRegionRef.current.textContent = announcement;
      }
    });
  }, [promptAnnounceToken, promptContext]);

  const busy = disabled || isSending;
  const remaining = MESSAGE_MAX_LENGTH - draft.length;
  const composerFieldId = "circle-message-draft";

  async function submit() {
    if (busy) return;

    const prepared = prepareMessageBody(draft);
    if (!prepared.ok) {
      setLocalError(
        prepared.reason === "too_long"
          ? "That message is a little long — try shortening it."
          : "Write a few words when you're ready.",
      );
      return;
    }

    setLocalError(null);
    onStopTyping?.();
    const result = await onSend(prepared.body);
    if (shouldClearComposerDraftAfterSend(result.ok)) {
      setDraft("");
      return;
    }

    if (result.reason === "empty" || result.reason === "too_long") {
      setLocalError(
        result.reason === "too_long"
          ? "That message is a little long — try shortening it."
          : "Write a few words when you're ready.",
      );
      return;
    }

    // send_failed: preserve draft and prompt context for retry
  }

  return (
    <section
      aria-labelledby="circle-composer-heading"
      className="sticky bottom-0 border-t border-white/[0.06] bg-glow-background/90 pb-2 pt-4 backdrop-blur-md"
    >
      <h2 id="circle-composer-heading" className="sr-only">
        Write a message
      </h2>

      <div
        ref={liveRegionRef}
        className="sr-only"
        aria-live="polite"
        aria-atomic="true"
      />

      <form
        className="flex flex-col gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
      >
        {promptContext ? (
          <CirclePromptComposerBanner
            promptText={promptContext.promptText}
            composerFieldId={composerFieldId}
            onRemove={() => onCancelPrompt?.()}
            staleMessage={stalePromptMessage}
          />
        ) : stalePromptMessage ? (
          <p
            className="text-xs leading-relaxed text-glow-text-tertiary"
            role="status"
          >
            {stalePromptMessage}
          </p>
        ) : null}

        <GlowTextarea
          id={composerFieldId}
          name="message"
          label="Message"
          placeholder={
            promptContext
              ? "Share your response…"
              : "Share something gentle…"
          }
          rows={2}
          value={draft}
          disabled={busy}
          maxLength={MESSAGE_MAX_LENGTH}
          aria-describedby={
            promptContext
              ? `circle-prompt-composer-text ${hintId}`
              : hintId
          }
          error={localError ?? undefined}
          ref={textareaRef}
          onChange={(event) => {
            setDraft(event.target.value);
            if (localError) setLocalError(null);
            if (event.target.value.trim()) {
              onTypingActivity?.();
            } else {
              onStopTyping?.();
            }
          }}
          onBlur={() => {
            onStopTyping?.();
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              void submit();
            }
          }}
          className="min-h-[3.25rem]"
        />

        <div className="flex items-center justify-between gap-3">
          <p
            id={hintId}
            className={cn(
              "text-xs text-glow-text-tertiary",
              remaining <= 100 && "text-glow-text-secondary",
            )}
          >
            Enter to send · Shift+Enter for a new line
            {draft.length > 0 ? ` · ${remaining}` : null}
          </p>

          <GlowButton
            type="submit"
            variant="primary"
            size="md"
            disabled={busy || prepareMessageBody(draft).ok === false}
            isLoading={isSending}
            aria-label={
              promptContext ? "Send prompt response" : "Send message"
            }
            className="min-w-[7.5rem] shrink-0"
            rightIcon={
              <Send className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
            }
          >
            Send
          </GlowButton>
        </div>
      </form>
    </section>
  );
}
