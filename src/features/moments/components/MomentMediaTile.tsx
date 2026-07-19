"use client";

import { ImageIcon, Loader2 } from "lucide-react";

import { cn } from "@/lib/utils/cn";

import { MomentSignedImage } from "./MomentSignedImage";
import type { MomentMediaView } from "../types";

export type MomentMediaTileProps = {
  media: MomentMediaView | null;
  title?: string | null;
  className?: string;
  imgClassName?: string;
  aspect?: "square" | "wide" | "portrait";
};

export function MomentMediaTile({
  media,
  title,
  className,
  imgClassName,
  aspect = "square",
}: MomentMediaTileProps) {
  const alt = title?.trim()
    ? `Photo for ${title.trim()}`
    : "Private moment photo";

  const frameClass = cn(
    "rounded-2xl border border-white/[0.08]",
    aspect === "square"
      ? "aspect-square"
      : aspect === "portrait"
        ? "aspect-[3/4]"
        : "aspect-[4/3]",
    className,
  );

  if (!media || media.status === "failed") {
    return (
      <div
        className={cn(
          "flex flex-col items-center justify-center bg-white/[0.03] p-3 text-center",
          frameClass,
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
          "flex flex-col items-center justify-center border-glow-primary/15 bg-glow-primary/[0.05] p-3 text-center",
          frameClass,
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

  if (media.status === "ready" && media.message === "Photo unavailable") {
    return (
      <div
        className={cn(
          "flex flex-col items-center justify-center bg-white/[0.03] p-3 text-center",
          frameClass,
        )}
      >
        <ImageIcon className="h-5 w-5 text-glow-text-tertiary" aria-hidden="true" />
        <p className="mt-2 text-xs leading-relaxed text-glow-text-secondary">
          Photo unavailable
        </p>
      </div>
    );
  }

  return (
    <MomentSignedImage
      key={media.id}
      mediaId={media.id}
      preferThumbnail
      initialUrl={media.thumbnailUrl}
      processingStatus={media.status}
      alt={alt}
      className={frameClass}
      imgClassName={imgClassName}
    />
  );
}
