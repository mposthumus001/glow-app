import { Shield } from "lucide-react";

import { GlowCard } from "@/components/ui";
import {
  isFormingCircle,
  isSmallCircle,
  type AssignedCircleView,
} from "@/features/circles/types";
import { textStyles } from "@/lib/theme";
import { cn } from "@/lib/utils/cn";

export interface CircleHeaderProps {
  data: AssignedCircleView;
}

function memberSummary(data: AssignedCircleView): string {
  const { memberCount, onlineCount } = data;
  const memberLabel =
    memberCount === 1 ? "1 parent" : `${memberCount} parents`;

  if (onlineCount == null) {
    return memberLabel;
  }

  if (onlineCount === 0) {
    return `${memberLabel} · quiet right now`;
  }

  const onlineLabel =
    onlineCount === 1 ? "1 here now" : `${onlineCount} here now`;

  return `${memberLabel} · ${onlineLabel}`;
}

export function CircleHeader({ data }: CircleHeaderProps) {
  const { circle, memberCount } = data;
  const description =
    circle.description?.trim() ||
    "A small, trusted space for parents who understand.";

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

      <p
        className="mt-4 text-sm text-glow-text-tertiary"
        aria-live="polite"
      >
        {memberSummary(data)}
        {isFormingCircle(circle.status) ? " · still gathering" : null}
        {isSmallCircle(memberCount)
          ? " · a small circle is still a strong one"
          : null}
      </p>

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
