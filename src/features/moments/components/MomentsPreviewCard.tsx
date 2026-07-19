"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";

import { GlowButton, GlowCard } from "@/components/ui";
import { fetchMomentsPreviewForBaby } from "@/features/moments/actions";
import { cn } from "@/lib/utils/cn";

import { formatMomentPhotoCount } from "../momentPhotoCount";
import { formatOccurredOnShort } from "../formatOccurredOn";
import { MomentMediaTile } from "./MomentMediaTile";
import type { MomentPreviewItem } from "../types";

export type MomentsPreviewCardProps = {
  babyId: string | null;
  momentsEnabled: boolean;
  className?: string;
};

const THUMB_WIDTH_CLASS = "w-24 shrink-0 sm:w-28";
const PORTRAIT_IMG_CLASS = "object-cover object-[center_25%]";

function previewPrimaryText(item: MomentPreviewItem): string {
  if (item.caption?.trim()) return item.caption.trim();
  if (item.title?.trim()) return item.title.trim();
  return formatOccurredOnShort(item.occurredOn);
}

function previewMetaLine(item: MomentPreviewItem): string {
  return [formatOccurredOnShort(item.occurredOn), item.ageLabel]
    .filter(Boolean)
    .join(" · ");
}

function PreviewHeader({
  babyId,
  photoCount,
}: {
  babyId: string;
  photoCount: number;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <h2 className="text-base font-semibold text-glow-text">Moments</h2>
        <p className="mt-1 text-xs text-glow-text-tertiary">
          {formatMomentPhotoCount(photoCount)} · Private to you.
        </p>
      </div>
      <Link
        href={`/baby/${babyId}/moments`}
        className="shrink-0 text-sm font-medium text-glow-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-glow-primary/40"
      >
        View all
      </Link>
    </div>
  );
}

function AddMomentButton({ babyId }: { babyId: string }) {
  return (
    <Link href={`/baby/${babyId}/moments/new`} className="inline-flex max-w-full">
      <GlowButton
        type="button"
        variant="secondary"
        size="sm"
        className="min-h-11 w-auto max-w-full justify-center px-4"
      >
        Add a moment
      </GlowButton>
    </Link>
  );
}

function FeaturedPreviewRow({
  item,
  babyId,
}: {
  item: MomentPreviewItem;
  babyId: string;
}) {
  const detailHref = `/baby/${babyId}/moments/${item.id}`;

  return (
    <div className="mt-3 flex min-w-0 flex-col gap-3 min-[340px]:flex-row min-[340px]:items-start">
      <Link
        href={detailHref}
        className={cn(
          "block min-w-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-glow-primary/40 rounded-2xl",
          THUMB_WIDTH_CLASS,
        )}
      >
        <MomentMediaTile
          media={item.primaryMedia}
          title={item.title ?? item.caption}
          aspect="portrait"
          className="w-full overflow-hidden"
          imgClassName={PORTRAIT_IMG_CLASS}
        />
      </Link>

      <div className="flex min-w-0 flex-1 flex-col">
        <Link
          href={detailHref}
          className="min-w-0 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-glow-primary/40"
        >
          <p className="line-clamp-2 text-sm leading-snug text-glow-text">
            {previewPrimaryText(item)}
          </p>
          <p className="mt-1.5 text-xs text-glow-text-tertiary">
            {previewMetaLine(item)}
          </p>
        </Link>

        <div className="mt-3 border-t border-white/[0.06] pt-3">
          <AddMomentButton babyId={babyId} />
        </div>
      </div>
    </div>
  );
}

function CompactPreviewThumb({
  item,
  babyId,
}: {
  item: MomentPreviewItem;
  babyId: string;
}) {
  return (
    <Link
      href={`/baby/${babyId}/moments/${item.id}`}
      className="block min-w-0 flex-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-glow-primary/40 rounded-2xl"
    >
      <MomentMediaTile
        media={item.primaryMedia}
        title={item.title ?? item.caption}
        aspect="portrait"
        className="w-full overflow-hidden"
        imgClassName={PORTRAIT_IMG_CLASS}
      />
      <p className="mt-1.5 line-clamp-1 text-xs text-glow-text-secondary">
        {previewPrimaryText(item)}
      </p>
    </Link>
  );
}

function MultiPreviewRow({
  items,
  photoCount,
  babyId,
}: {
  items: MomentPreviewItem[];
  photoCount: number;
  babyId: string;
}) {
  const visible = items.slice(0, 2);
  const remaining = photoCount - visible.length;

  return (
    <div className="mt-3 min-w-0">
      <div className="flex min-w-0 flex-col gap-2.5 min-[340px]:flex-row">
        {visible.map((item) => (
          <CompactPreviewThumb key={item.id} item={item} babyId={babyId} />
        ))}
      </div>
      {remaining > 0 ? (
        <p className="mt-2 text-xs text-glow-text-tertiary">
          +{remaining} more in album
        </p>
      ) : null}
      <div className="mt-3 border-t border-white/[0.06] pt-3">
        <AddMomentButton babyId={babyId} />
      </div>
    </div>
  );
}

function PreviewEmptyBody({ babyId }: { babyId: string }) {
  return (
    <div className="mt-3 min-w-0">
      <p className="text-sm leading-relaxed text-glow-text-secondary">
        The little things worth keeping.
      </p>
      <div className="mt-3">
        <Link href={`/baby/${babyId}/moments/new`} className="inline-flex max-w-full">
          <GlowButton
            type="button"
            variant="primary"
            size="sm"
            className="min-h-11 w-auto max-w-full justify-center px-4"
          >
            Add a moment
          </GlowButton>
        </Link>
      </div>
    </div>
  );
}

export function MomentsPreviewCard({
  babyId,
  momentsEnabled,
  className,
}: MomentsPreviewCardProps) {
  const [items, setItems] = useState<MomentPreviewItem[]>([]);
  const [photoCount, setPhotoCount] = useState(0);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!momentsEnabled || !babyId) {
      return;
    }

    startTransition(() => {
      void fetchMomentsPreviewForBaby(babyId).then((result) => {
        if (result.ok) {
          setItems(result.data.items);
          setPhotoCount(result.data.photoCount);
        } else {
          setItems([]);
          setPhotoCount(0);
        }
      });
    });
  }, [babyId, momentsEnabled]);

  if (!momentsEnabled || !babyId) {
    return null;
  }

  if (pending && items.length === 0 && photoCount === 0) {
    return (
      <GlowCard
        padding="md"
        className={cn("mb-5 border-white/[0.06] animate-pulse", className)}
        aria-busy="true"
        aria-label="Loading Moments"
      >
        <div className="h-20 rounded-2xl bg-white/[0.04]" />
      </GlowCard>
    );
  }

  if (photoCount === 0) {
    return (
      <GlowCard
        padding="md"
        className={cn("mb-5 min-w-0 overflow-hidden border-white/[0.06]", className)}
      >
        <PreviewHeader babyId={babyId} photoCount={0} />
        <PreviewEmptyBody babyId={babyId} />
      </GlowCard>
    );
  }

  const showFeatured = photoCount === 1 && items.length >= 1;

  return (
    <GlowCard
      padding="md"
      className={cn("mb-5 min-w-0 overflow-hidden border-white/[0.06]", className)}
    >
      <PreviewHeader babyId={babyId} photoCount={photoCount} />

      {showFeatured ? (
        <FeaturedPreviewRow item={items[0]!} babyId={babyId} />
      ) : (
        <MultiPreviewRow items={items} photoCount={photoCount} babyId={babyId} />
      )}
    </GlowCard>
  );
}
