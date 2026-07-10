import type { CircleMessagePreview, MessageAreaStatus } from "@/features/circles/types";
import { textStyles } from "@/lib/theme";
import { cn } from "@/lib/utils/cn";

export interface CircleMessageAreaProps {
  status: MessageAreaStatus;
  messages?: CircleMessagePreview[];
  errorMessage?: string;
}

export function CircleMessageArea({
  status,
  messages = [],
  errorMessage,
}: CircleMessageAreaProps) {
  return (
    <section
      aria-labelledby="circle-messages-heading"
      aria-busy={status === "loading"}
      className="mb-6 flex min-h-[12rem] flex-1 flex-col"
    >
      <h2 id="circle-messages-heading" className={cn(textStyles.overline, "mb-4")}>
        Conversation
      </h2>

      <div
        className={cn(
          "flex flex-1 flex-col rounded-glow-card border border-white/[0.06]",
          "bg-glow-card/40 px-4 py-5",
        )}
        role="region"
        aria-label="Circle messages"
      >
        {status === "loading" ? (
          <p
            className="m-auto text-center text-sm text-glow-text-tertiary"
            role="status"
          >
            Settling into your Circle…
          </p>
        ) : null}

        {status === "error" ? (
          <p
            className="m-auto max-w-xs text-center text-sm leading-relaxed text-red-300/90"
            role="alert"
          >
            {errorMessage ??
              "We couldn't load messages just now. Your Circle is still here."}
          </p>
        ) : null}

        {status === "empty" ? (
          <div className="m-auto max-w-sm text-center">
            <p className="text-base font-medium text-glow-text">
              The space is quiet for now.
            </p>
            <p className="mt-2 text-sm leading-relaxed text-glow-text-secondary">
              When someone shares, their words will appear here — gently, without
              noise.
            </p>
          </div>
        ) : null}

        {status === "ready" ? (
          <ul className="flex flex-col gap-5" aria-label="Recent messages">
            {messages.map((message) => (
              <li key={message.id} className="min-w-0">
                <p className="text-xs font-medium tracking-wide text-glow-text-tertiary">
                  {message.authorName}
                </p>
                <p className="mt-1.5 text-base leading-relaxed text-glow-text-secondary">
                  {message.body}
                </p>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </section>
  );
}
