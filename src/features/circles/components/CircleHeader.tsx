import { Shield } from "lucide-react";

import { GlowCard } from "@/components/ui";
import {
  isFormingCircle,
  isSmallCircle,
  type AssignedCircleView,
} from "@/features/circles/types";
import {
  formatOnlinePresenceCopy,
  type CircleConnectionState,
} from "@/features/circles/messaging/presenceLogic";
import { textStyles } from "@/lib/theme";
import { cn } from "@/lib/utils/cn";

export interface CircleHeaderProps {
  data: AssignedCircleView;
  onlineCount?: number;
  onlinePreviewNames?: string[];
  connection?: CircleConnectionState;
  unreadHint?: string | null;
}

export function CircleHeader({
  data,
  onlineCount = 0,
  onlinePreviewNames = [],
  connection = "idle",
  unreadHint = null,
}: CircleHeaderProps) {
  const { circle, memberCount } = data;
  const description =
    circle.description?.trim() ||
    "A small, trusted space for parents who understand.";

  const presenceLine = formatOnlinePresenceCopy({
    onlineCount,
    memberCount,
    previewNames: onlinePreviewNames,
  });

  const connectionLabel =
    connection === "reconnecting"
      ? "Reconnecting quietly…"
      : connection === "disconnected"
        ? "Connection paused — your words are still here"
        : null;

  return (
    <header className="mb-6">
      <p className={cn(textStyles.overline, "text-glow-primary/80")}>
        Your Circle
      </p>
      <h1 className={cn(textStyles.h1, "mt-2 text-[1.65rem] sm:text-3xl")}>
        {circle.name}
      </h1>
      <p className="mt-3 text-base leading-relaxed text-glow-text-secondary">
        {description}
      </p>

      <p className="mt-4 text-sm text-glow-text-tertiary">
        <span aria-live="off">{presenceLine}</span>
        {unreadHint ? ` · ${unreadHint}` : null}
        {isFormingCircle(circle.status) ? " · still gathering" : null}
        {isSmallCircle(memberCount)
          ? " · a small circle is still a strong one"
          : null}
      </p>

      {connectionLabel ? (
        <p
          className="mt-2 text-xs text-glow-text-tertiary"
          role="status"
          aria-live="polite"
        >
          {connectionLabel}
        </p>
      ) : null}

      <GlowCard
        padding="sm"
        variant="glass"
        className="mt-5 border-white/[0.06]"
      >
        <div className="flex items-start gap-3">
          <div
            className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-glow-primary/10 text-glow-primary"
            aria-hidden="true"
          >
            <Shield className="h-4 w-4" strokeWidth={1.75} />
          </div>
          <p className="text-sm leading-relaxed text-glow-text-secondary">
            Private to your Circle. Your words stay here — never shown on the
            map, never shared publicly.
          </p>
        </div>
      </GlowCard>
    </header>
  );
}
