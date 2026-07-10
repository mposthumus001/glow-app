"use client";

import {
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
} from "react";

import type { CircleFeedMessage } from "@/features/circles/messaging/messageLogic";
import { shouldAutoScrollForIncoming } from "@/features/circles/messaging/messageLogic";
import { textStyles } from "@/lib/theme";
import { cn } from "@/lib/utils/cn";
import { useGlowReducedMotion } from "@/lib/hooks/useGlowReducedMotion";

const NEAR_BOTTOM_PX = 96;

export interface CircleMessageFeedProps {
  messages: CircleFeedMessage[];
  status: "loading" | "ready" | "error";
  errorMessage?: string | null;
  hasEarlier: boolean;
  loadingEarlier: boolean;
  onLoadEarlier: () => void;
  onRetry: (clientKey: string) => void;
  sendingClientKey: string | null;
  viewerParentId: string;
}

function formatSubtleTime(iso: string): string {
  try {
    const date = new Date(iso);
    return new Intl.DateTimeFormat(undefined, {
      hour: "numeric",
      minute: "2-digit",
    }).format(date);
  } catch {
    return "";
  }
}

function firstName(displayName: string): string {
  const trimmed = displayName.trim();
  if (!trimmed) return "A parent";
  return trimmed.split(/\s+/)[0] ?? trimmed;
}

export function CircleMessageFeed({
  messages,
  status,
  errorMessage,
  hasEarlier,
  loadingEarlier,
  onLoadEarlier,
  onRetry,
  sendingClientKey,
  viewerParentId,
}: CircleMessageFeedProps) {
  const reduceMotion = useGlowReducedMotion();
  const scrollerRef = useRef<HTMLDivElement>(null);
  const liveRegionRef = useRef<HTMLDivElement>(null);
  const nearBottomRef = useRef(true);
  const didInitialScroll = useRef(false);
  const prevMessageIdsRef = useRef<string>("");
  const pendingRestoreRef = useRef<{ height: number; top: number } | null>(
    null,
  );
  const [showNewAffordance, setShowNewAffordance] = useState(false);

  const isNearBottom = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return true;
    return el.scrollHeight - el.scrollTop - el.clientHeight <= NEAR_BOTTOM_PX;
  }, []);

  const scrollToLatest = useCallback(
    (behavior: ScrollBehavior = "smooth") => {
      const el = scrollerRef.current;
      if (!el) return;
      el.scrollTo({
        top: el.scrollHeight,
        behavior: reduceMotion ? "auto" : behavior,
      });
      nearBottomRef.current = true;
      setShowNewAffordance(false);
    },
    [reduceMotion],
  );

  const announce = useCallback((text: string) => {
    const node = liveRegionRef.current;
    if (!node) return;
    node.textContent = "";
    requestAnimationFrame(() => {
      if (liveRegionRef.current) {
        liveRegionRef.current.textContent = text;
      }
    });
  }, []);

  const onScroll = () => {
    nearBottomRef.current = isNearBottom();
    if (nearBottomRef.current && showNewAffordance) {
      setShowNewAffordance(false);
    }
  };

  useLayoutEffect(() => {
    if (loadingEarlier) return;
    const pending = pendingRestoreRef.current;
    const node = scrollerRef.current;
    if (!pending || !node) return;
    node.scrollTop = pending.top + (node.scrollHeight - pending.height);
    pendingRestoreRef.current = null;
  }, [loadingEarlier, messages]);

  useLayoutEffect(() => {
    if (status !== "ready" || messages.length === 0) return;

    const el = scrollerRef.current;

    if (!didInitialScroll.current) {
      if (el) {
        el.scrollTop = el.scrollHeight;
      }
      nearBottomRef.current = true;
      didInitialScroll.current = true;
      prevMessageIdsRef.current = messages.map((m) => m.clientKey).join("|");
      return;
    }

    const signature = messages.map((m) => m.clientKey).join("|");
    if (signature === prevMessageIdsRef.current) return;

    const prevKeys = new Set(
      prevMessageIdsRef.current.split("|").filter(Boolean),
    );
    const newest = messages[messages.length - 1];
    const isNewAtEnd = newest && !prevKeys.has(newest.clientKey);
    const olderAdded =
      messages.length > prevKeys.size &&
      messages[0] &&
      !prevKeys.has(messages[0].clientKey);

    prevMessageIdsRef.current = signature;

    if (olderAdded && !isNewAtEnd) {
      return;
    }

    if (!isNewAtEnd || !newest) return;

    const auto = shouldAutoScrollForIncoming({
      isOwn: newest.isOwn || newest.parentId === viewerParentId,
      isNearBottom: nearBottomRef.current,
    });

    if (auto) {
      if (el) {
        el.scrollTo({
          top: el.scrollHeight,
          behavior: reduceMotion ? "auto" : "smooth",
        });
      }
      nearBottomRef.current = true;
      queueMicrotask(() => setShowNewAffordance(false));
      if (!newest.isOwn) {
        announce(`New message from ${firstName(newest.authorName)}`);
      }
    } else if (!newest.isOwn) {
      queueMicrotask(() => setShowNewAffordance(true));
      announce("New messages in your Circle");
    }
  }, [messages, status, viewerParentId, reduceMotion, announce]);

  const handleLoadEarlier = () => {
    const el = scrollerRef.current;
    if (el) {
      pendingRestoreRef.current = {
        height: el.scrollHeight,
        top: el.scrollTop,
      };
    }
    onLoadEarlier();
  };

  return (
    <section
      aria-labelledby="circle-messages-heading"
      aria-busy={status === "loading"}
      className="mb-4 flex min-h-[14rem] flex-1 flex-col"
    >
      <h2 id="circle-messages-heading" className={cn(textStyles.overline, "mb-3")}>
        Conversation
      </h2>

      <div className="relative flex min-h-[14rem] flex-1 flex-col">
        <div
          ref={scrollerRef}
          onScroll={onScroll}
          className={cn(
            "flex max-h-[min(52vh,28rem)] min-h-[14rem] flex-1 flex-col overflow-y-auto",
            "rounded-glow-card border border-white/[0.06] bg-glow-card/40 px-4 py-4",
            "overscroll-contain",
          )}
          role="log"
          aria-relevant="additions"
          aria-label="Circle messages"
          tabIndex={0}
        >
          {hasEarlier ? (
            <div className="mb-4 flex justify-center">
              <button
                type="button"
                onClick={handleLoadEarlier}
                disabled={loadingEarlier}
                className={cn(
                  "min-h-11 rounded-glow-button px-4 text-sm text-glow-text-secondary",
                  "border border-white/[0.08] bg-white/[0.03]",
                  "transition-colors hover:bg-white/[0.06] hover:text-glow-text",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-glow-primary/50",
                  "disabled:opacity-50",
                )}
              >
                {loadingEarlier ? "Loading…" : "Earlier messages"}
              </button>
            </div>
          ) : null}

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
              className="m-auto max-w-xs text-center text-sm leading-relaxed text-glow-text-secondary"
              role="alert"
            >
              {errorMessage ??
                "We couldn't load messages just now. Your Circle is still here."}
            </p>
          ) : null}

          {status === "ready" && messages.length === 0 ? (
            <div className="m-auto max-w-sm text-center">
              <p className="text-base font-medium text-glow-text">
                The space is quiet for now.
              </p>
              <p className="mt-2 text-sm leading-relaxed text-glow-text-secondary">
                When someone shares, their words will appear here — gently,
                without noise.
              </p>
            </div>
          ) : null}

          {status === "ready" && messages.length > 0 ? (
            <ul className="flex flex-col gap-1" aria-label="Messages">
              {messages.map((message, index) => {
                const prev = messages[index - 1];
                const grouped =
                  prev &&
                  prev.parentId === message.parentId &&
                  prev.status === message.status;

                return (
                  <MessageRow
                    key={message.clientKey}
                    message={message}
                    grouped={Boolean(grouped)}
                    onRetry={onRetry}
                    isRetrying={sendingClientKey === message.clientKey}
                  />
                );
              })}
            </ul>
          ) : null}
        </div>

        {showNewAffordance ? (
          <button
            type="button"
            onClick={() => scrollToLatest("smooth")}
            className={cn(
              "absolute bottom-3 left-1/2 z-10 -translate-x-1/2",
              "min-h-10 rounded-glow-button px-4 text-sm font-medium",
              "bg-glow-primary/90 text-glow-text-inverse shadow-glow-primary",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-glow-primary/50",
            )}
          >
            New messages
          </button>
        ) : null}
      </div>

      <div
        ref={liveRegionRef}
        className="sr-only"
        aria-live="polite"
        aria-atomic="true"
      />
    </section>
  );
}

function MessageRow({
  message,
  grouped,
  onRetry,
  isRetrying,
}: {
  message: CircleFeedMessage;
  grouped: boolean;
  onRetry: (clientKey: string) => void;
  isRetrying: boolean;
}) {
  const own = message.isOwn;
  const name = own ? "You" : firstName(message.authorName);
  const time = formatSubtleTime(message.createdAt);

  return (
    <li
      className={cn(
        "min-w-0",
        grouped ? "mt-1" : "mt-4 first:mt-0",
        own && "pl-6",
        !own && "pr-4",
      )}
    >
      {!grouped ? (
        <div className="mb-1 flex items-baseline justify-between gap-3">
          <p
            className={cn(
              "text-xs font-medium tracking-wide",
              own ? "text-glow-primary/80" : "text-glow-text-tertiary",
            )}
          >
            {name}
          </p>
          {time ? (
            <time
              dateTime={message.createdAt}
              className="text-[11px] text-glow-text-tertiary/80"
            >
              {time}
            </time>
          ) : null}
        </div>
      ) : null}

      <div
        className={cn(
          "rounded-2xl px-3.5 py-2.5 text-base leading-relaxed",
          own
            ? "bg-glow-primary/12 text-glow-text"
            : "bg-transparent text-glow-text-secondary",
          message.status === "optimistic" && "opacity-70",
          message.status === "failed" && "bg-white/[0.04] ring-1 ring-white/10",
        )}
      >
        <p className="whitespace-pre-wrap break-words">{message.body}</p>

        {message.status === "optimistic" ? (
          <p className="mt-1.5 text-xs text-glow-text-tertiary" role="status">
            Sending…
          </p>
        ) : null}

        {message.status === "failed" ? (
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <p className="text-xs text-glow-text-tertiary">
              Couldn&apos;t send. Still here when you&apos;re ready.
            </p>
            <button
              type="button"
              onClick={() => onRetry(message.clientKey)}
              disabled={isRetrying}
              className={cn(
                "min-h-10 min-w-10 text-sm font-medium text-glow-primary",
                "underline-offset-2 hover:underline",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-glow-primary/50 rounded",
                "disabled:opacity-50",
              )}
            >
              {isRetrying ? "Retrying…" : "Try again"}
            </button>
          </div>
        ) : null}
      </div>
    </li>
  );
}
