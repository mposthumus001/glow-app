"use client";

import { Send } from "lucide-react";

import { GlowButton, GlowTextarea } from "@/components/ui";

/**
 * Composer shell only — sending arrives in Sprint 4.2.
 */
export function CircleComposer() {
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
        }}
      >
        <GlowTextarea
          id="circle-message-draft"
          name="message"
          label="Message"
          placeholder="Messaging opens soon"
          rows={2}
          disabled
          hint="Sending arrives in the next update. Your Circle is already here."
          className="min-h-[3.25rem] pb-safe"
        />

        <GlowButton
          type="submit"
          variant="primary"
          size="md"
          fullWidth
          disabled
          aria-label="Send message (coming soon)"
          rightIcon={<Send className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />}
        >
          Send soon
        </GlowButton>
      </form>
    </section>
  );
}
