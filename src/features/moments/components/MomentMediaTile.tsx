import { ImageIcon, Loader2 } from "lucide-react";

import { cn } from "@/lib/utils/cn";

import type { MomentMediaView } from "../types";

export type MomentMediaTileProps = {
  media: MomentMediaView | null;
  title?: string | null;
  className?: string;
  aspect?: "square" | "wide";
};

export function MomentMediaTile({
  media,
  title,
  className,
  aspect = "square",
}: MomentMediaTileProps) {
  const alt = title?.trim()
    ? `Photo for ${title.trim()}`
    : "Private moment photo";

  if (!media || media.status === "failed") {
    return (
      <div
        className={cn(
          "flex flex-col items-center justify-center rounded-2xl border border-white/[0.08] bg-white/[0.03] p-3 text-center",
          aspect === "square" ? "aspect-square" : "aspect-[4/3]",
          className,
        )}
      >
        <ImageIcon className="h-5 w-5 text-glow-text-tertiary" aria-hidden="true" />
        <p className="mt-2 text-xs leading-relaxed text-glow-text-secondary">
          {media?.message ?? "Photo unavailable"}
        </p>
      </div>
    );
  }

  if (media.status === "processing" || media.status === "pending") {
    return (
      <div
        className={cn(
          "flex flex-col items-center justify-center rounded-2xl border border-glow-primary/15 bg-glow-primary/[0.05] p-3 text-center",
          aspect === "square" ? "aspect-square" : "aspect-[4/3]",
          className,
        )}
        aria-live="polite"
      >
        <Loader2
          className="h-5 w-5 animate-spin text-glow-primary"
          aria-hidden="true"
        />
        <p className="mt-2 text-xs leading-relaxed text-glow-text-secondary">
          {media.message ?? "Preparing your photo"}
        </p>
      </div>
    );
  }

  if (!media.thumbnailUrl) {
    return (
      <div
        className={cn(
          "flex items-center justify-center rounded-2xl border border-white/[0.08] bg-white/[0.03]",
          aspect === "square" ? "aspect-square" : "aspect-[4/3]",
          className,
        )}
      >
        <ImageIcon className="h-5 w-5 text-glow-text-tertiary" aria-hidden="true" />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.03]",
        aspect === "square" ? "aspect-square" : "aspect-[4/3]",
        className,
      )}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={media.thumbnailUrl}
        alt={alt}
        className="h-full w-full object-cover"
        loading="lazy"
        decoding="async"
      />
    </div>
  );
}
