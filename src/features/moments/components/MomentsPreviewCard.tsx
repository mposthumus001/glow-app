"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";

import { GlowButton, GlowCard } from "@/components/ui";
import { fetchMomentsPreviewForBaby } from "@/features/moments/actions";
import { cn } from "@/lib/utils/cn";

import { MomentMediaTile } from "./MomentMediaTile";
import { MomentsEmptyState } from "./MomentsEmptyState";
import type { MomentPreviewItem } from "../types";

export type MomentsPreviewCardProps = {
  babyId: string | null;
  momentsEnabled: boolean;
  className?: string;
};

function formatOccurredOn(value: string): string {
  const [y, m, d] = value.split("-").map(Number);
  if (!y || !m || !d) return value;
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function MomentsPreviewCard({
  babyId,
  momentsEnabled,
  className,
}: MomentsPreviewCardProps) {
  const [items, setItems] = useState<MomentPreviewItem[]>([]);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!momentsEnabled || !babyId) {
      return;
    }

    startTransition(() => {
      void fetchMomentsPreviewForBaby(babyId).then((result) => {
        setItems(result.ok ? result.data.items : []);
      });
    });
  }, [babyId, momentsEnabled]);

  if (!momentsEnabled || !babyId) {
    return null;
  }

  if (pending && items.length === 0) {
    return (
      <GlowCard
        padding="md"
        className={cn("mb-5 border-white/[0.06] animate-pulse", className)}
        aria-busy="true"
        aria-label="Loading Moments"
      >
        <div className="h-24 rounded-2xl bg-white/[0.04]" />
      </GlowCard>
    );
  }

  if (items.length === 0) {
    return <MomentsEmptyState babyId={babyId} compact className={cn("mb-5", className)} />;
  }

  return (
    <GlowCard padding="md" className={cn("mb-5 border-white/[0.06]", className)}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-glow-text">Moments</h2>
          <p className="mt-1 text-xs text-glow-text-tertiary">Private to you.</p>
        </div>
        <Link
          href={`/baby/${babyId}/moments`}
          className="text-sm font-medium text-glow-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-glow-primary/40"
        >
          View all
        </Link>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2">
        {items.map((item) => (
          <Link
            key={item.id}
            href={`/baby/${babyId}/moments/${item.id}`}
            className="group block min-w-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-glow-primary/40 rounded-2xl"
          >
            <MomentMediaTile
              media={item.primaryMedia}
              title={item.title ?? item.caption}
            />
            <p className="mt-1 truncate text-xs text-glow-text-secondary group-hover:text-glow-text">
              {item.title?.trim() || item.caption?.trim() || formatOccurredOn(item.occurredOn)}
            </p>
            {item.ageLabel ? (
              <p className="truncate text-[11px] text-glow-text-tertiary">{item.ageLabel}</p>
            ) : null}
          </Link>
        ))}
      </div>

      <div className="mt-4">
        <Link href={`/baby/${babyId}/moments/new`}>
          <GlowButton type="button" variant="secondary" size="sm">
            Add a moment
          </GlowButton>
        </Link>
      </div>
    </GlowCard>
  );
}
