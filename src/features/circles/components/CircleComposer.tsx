"use client";

import { useId, useState } from "react";
import { Send } from "lucide-react";

import { GlowButton, GlowTextarea } from "@/components/ui";
import {
  MESSAGE_MAX_LENGTH,
  prepareMessageBody,
} from "@/features/circles/messaging/messageLogic";
import { cn } from "@/lib/utils/cn";

export interface CircleComposerProps {
  onSend: (body: string) => Promise<{ ok: boolean; reason?: string }>;
  disabled?: boolean;
  isSending?: boolean;
}

/**
 * Isolated composer state so keystrokes do not rerender the message list.
 */
export function CircleComposer({
  onSend,
  disabled = false,
  isSending = false,
}: CircleComposerProps) {
  const hintId = useId();
  const [draft, setDraft] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);

  const busy = disabled || isSending;
  const remaining = MESSAGE_MAX_LENGTH - draft.length;

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
    const result = await onSend(prepared.body);
    if (result.ok) {
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

    // Failed network send keeps draft; optimistic row owns retry.
    if (result.reason === "send_failed") {
      setDraft("");
    }
  }

  return (
    <section
      aria-labelledby="circle-composer-heading"
      className="sticky bottom-0 border-t border-white/[0.06] bg-glow-background/90 pb-2 pt-4 backdrop-blur-md"
    >
      <h2 id="circle-composer-heading" className="sr-only">
        Write a message
      </h2>

      <form
        className="flex flex-col gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
      >
        <GlowTextarea
          id="circle-message-draft"
          name="message"
          label="Message"
          placeholder="Share something gentle…"
          rows={2}
          value={draft}
          disabled={busy}
          maxLength={MESSAGE_MAX_LENGTH}
          aria-describedby={hintId}
          error={localError ?? undefined}
          onChange={(event) => {
            setDraft(event.target.value);
            if (localError) setLocalError(null);
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
            aria-label="Send message"
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
