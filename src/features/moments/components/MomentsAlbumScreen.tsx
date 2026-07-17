"use client";

import Link from "next/link";
import { ArrowLeft, Plus } from "lucide-react";

import { GlowButton, GlowCard } from "@/components/ui";
import { GlowContainer } from "@/components/layout";
import { PageHeader } from "@/components/shell/PageHeader";

import { MomentMediaTile } from "./MomentMediaTile";
import { MomentsEmptyState } from "./MomentsEmptyState";
import type { MomentListItem } from "../types";

export type MomentsAlbumScreenProps = {
  babyId: string;
  babyName: string;
  items: MomentListItem[];
  error?: string | null;
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

export function MomentsAlbumScreen({
  babyId,
  babyName,
  items,
  error,
}: MomentsAlbumScreenProps) {
  return (
    <div className="overflow-y-auto pt-safe">
      <GlowContainer size="md" as="div" className="pb-10 pt-6">
        <Link
          href="/baby"
          className="mb-4 inline-flex min-h-11 items-center gap-2 text-sm text-glow-text-secondary hover:text-glow-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-glow-primary/40"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to {babyName}
        </Link>

        <PageHeader
          title="Moments"
          subtitle={`Private memories for ${babyName}.`}
        />

        <div className="mb-5">
          <Link href={`/baby/${babyId}/moments/new`}>
            <GlowButton type="button" variant="primary" size="md" leftIcon={<Plus className="h-4 w-4" />}>
              Add a moment
            </GlowButton>
          </Link>
        </div>

        {error ? (
          <GlowCard
            padding="md"
            className="mb-5 border-red-400/20 bg-red-400/[0.05]"
            role="alert"
          >
            <p className="text-sm text-glow-text-secondary">{error}</p>
          </GlowCard>
        ) : null}

        {items.length === 0 ? (
          <MomentsEmptyState babyId={babyId} />
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {items.map((item) => (
              <Link
                key={item.id}
                href={`/baby/${babyId}/moments/${item.id}`}
                className="group block min-w-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-glow-primary/40 rounded-2xl"
              >
                <GlowCard padding="sm" className="border-white/[0.06]">
                  <MomentMediaTile
                    media={item.primaryMedia}
                    title={item.title ?? item.caption}
                  />
                  <div className="mt-2 min-w-0">
                    <p className="truncate text-sm font-medium text-glow-text">
                      {item.title?.trim() || formatOccurredOn(item.occurredOn)}
                    </p>
                    {item.caption?.trim() && item.title?.trim() ? (
                      <p className="truncate text-xs text-glow-text-secondary">
                        {item.caption.trim()}
                      </p>
                    ) : null}
                    <p className="mt-1 text-[11px] text-glow-text-tertiary">
                      {[formatOccurredOn(item.occurredOn), item.ageLabel]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  </div>
                </GlowCard>
              </Link>
            ))}
          </div>
        )}
      </GlowContainer>
    </div>
  );
}
