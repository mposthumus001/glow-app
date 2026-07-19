"use client";

import { useEffect, useRef, useState } from "react";
import { ImageIcon } from "lucide-react";

import { getMomentMediaSignedUrl } from "@/features/moments/actions";
import { cn } from "@/lib/utils/cn";

import {
  categorizeSignedUrlFailure,
  type MomentsMediaResponseCategory,
} from "../mediaUrl";
import { reportMomentsMediaIssue } from "../reportMomentsMediaIssue";

export type MomentSignedImageProps = {
  mediaId: string;
  preferThumbnail: boolean;
  /** Server-minted signed URL — rendered identically on server and client. */
  initialUrl?: string | null;
  processingStatus?: string;
  alt: string;
  className?: string;
  imgClassName?: string;
};

/**
 * Renders short-lived private signed URLs with a plain <img>.
 * When initialUrl is present, server and client both render the same <img src>
 * on first paint — no time-based freshness branching in render.
 * Refresh only runs after a real image error (post-hydration).
 */
export function MomentSignedImage({
  mediaId,
  preferThumbnail,
  initialUrl = null,
  processingStatus = "ready",
  alt,
  className,
  imgClassName,
}: MomentSignedImageProps) {
  const refreshAttempted = useRef(false);
  const [src, setSrc] = useState<string | null>(initialUrl);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (initialUrl) return;

    let cancelled = false;

    void getMomentMediaSignedUrl({
      mediaId,
      preferThumbnail,
    }).then((result) => {
      if (cancelled) return;
      if (!result.ok) {
        reportMomentsMediaIssue({
          mediaId,
          processingStatus,
          responseCategory: "sign_failed",
          operation: preferThumbnail
            ? "client_refresh_thumbnail"
            : "client_refresh_display",
        });
        setFailed(true);
        return;
      }
      setSrc(result.data.url);
      setFailed(false);
    });

    return () => {
      cancelled = true;
    };
  }, [mediaId, preferThumbnail, initialUrl, processingStatus]);

  async function handleImageError(failedUrl: string) {
    if (!refreshAttempted.current) {
      refreshAttempted.current = true;
      const result = await getMomentMediaSignedUrl({
        mediaId,
        preferThumbnail,
      });
      if (result.ok && result.data.url !== failedUrl) {
        setSrc(result.data.url);
        return;
      }
    }

    let responseCategory: MomentsMediaResponseCategory = "unknown";
    try {
      const res = await fetch(failedUrl, { method: "GET", cache: "no-store" });
      if (!res.ok) {
        let bodyText: string | null = null;
        try {
          bodyText = await res.text();
        } catch {
          bodyText = null;
        }
        responseCategory = categorizeSignedUrlFailure({
          status: res.status,
          bodyText,
        });
      }
    } catch {
      responseCategory = "network";
    }

    reportMomentsMediaIssue({
      mediaId,
      processingStatus,
      responseCategory:
        responseCategory === "unknown" ? "expired_token" : responseCategory,
      operation: preferThumbnail
        ? "client_image_error_thumbnail"
        : "client_image_error_display",
    });
    setFailed(true);
  }

  if (failed) {
    return (
      <div
        className={cn(
          "flex h-full w-full min-h-0 min-w-0 flex-col items-center justify-center bg-white/[0.03] p-3 text-center",
          className,
        )}
      >
        <ImageIcon className="h-5 w-5 text-glow-text-tertiary" aria-hidden="true" />
        <p className="mt-2 text-xs leading-relaxed text-glow-text-secondary">
          Photo unavailable
        </p>
      </div>
    );
  }

  if (!src) {
    return (
      <div
        className={cn(
          "h-full w-full min-h-0 min-w-0 animate-pulse bg-white/[0.04]",
          className,
        )}
        aria-busy="true"
        aria-label="Loading photo"
      />
    );
  }

  return (
    <div
      className={cn(
        "h-full w-full min-h-0 min-w-0 overflow-hidden bg-white/[0.03]",
        className,
      )}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- short-lived signed URLs must not go through the image optimiser */}
      <img
        src={src}
        alt={alt}
        width={512}
        height={512}
        className={cn("h-full w-full object-cover", imgClassName)}
        loading="lazy"
        decoding="async"
        onError={() => {
          void handleImageError(src);
        }}
      />
    </div>
  );
}
