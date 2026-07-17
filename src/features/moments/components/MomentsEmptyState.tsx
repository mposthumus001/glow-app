import Link from "next/link";
import { Camera } from "lucide-react";

import { GlowButton, GlowCard } from "@/components/ui";
import { cn } from "@/lib/utils/cn";

export type MomentsEmptyStateProps = {
  babyId: string;
  compact?: boolean;
  className?: string;
};

export function MomentsEmptyState({
  babyId,
  compact = false,
  className,
}: MomentsEmptyStateProps) {
  return (
    <GlowCard
      padding="md"
      className={cn("border-glow-primary/15 bg-glow-primary/[0.03]", className)}
    >
      <div className={cn("flex gap-4", compact ? "items-center" : "flex-col")}>
        <div
          className={cn(
            "flex shrink-0 items-center justify-center rounded-2xl border border-white/[0.08] bg-white/[0.04]",
            compact ? "h-16 w-16" : "mx-auto h-24 w-24",
          )}
          aria-hidden="true"
        >
          <Camera className="h-8 w-8 text-glow-primary/70" strokeWidth={1.5} />
        </div>
        <div className={cn(compact ? "min-w-0 flex-1" : "text-center")}>
          <h2 className="text-base font-semibold text-glow-text">Moments</h2>
          <p className="mt-1 text-sm leading-relaxed text-glow-text-secondary">
            The little things worth keeping.
          </p>
          {!compact ? (
            <p className="mt-2 text-xs text-glow-text-tertiary">Private to you.</p>
          ) : null}
          <div className={cn("mt-4", !compact && "flex justify-center")}>
            <Link href={`/baby/${babyId}/moments/new`}>
              <GlowButton type="button" variant="primary" size="md">
                Add a moment
              </GlowButton>
            </Link>
          </div>
          {compact ? (
            <p className="mt-2 text-xs text-glow-text-tertiary">Private to you.</p>
          ) : null}
        </div>
      </div>
    </GlowCard>
  );
}
