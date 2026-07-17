"use client";

import { useId, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Heart, Trash2 } from "lucide-react";

import { GlowButton, GlowCard } from "@/components/ui";
import { GlowContainer } from "@/components/layout";
import { PageHeader } from "@/components/shell/PageHeader";
import {
  deletePrivateMoment,
  retryMomentMediaProcessing,
  toggleMomentFavourite,
} from "@/features/moments/actions";
import { outcomeAllowsRetry } from "@/features/moments/processing/outcomes";
import { cn } from "@/lib/utils/cn";

import { MomentMediaTile } from "./MomentMediaTile";
import { useMomentProcessingPoll } from "../hooks/useMomentProcessingPoll";
import type { MomentDetailView } from "../types";

export type MomentDetailScreenProps = {
  babyId: string;
  babyName: string;
  moment: MomentDetailView;
};

function formatOccurredOn(value: string): string {
  const [y, m, d] = value.split("-").map(Number);
  if (!y || !m || !d) return value;
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString(undefined, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function MomentDetailScreen({
  babyId,
  babyName,
  moment: initialMoment,
}: MomentDetailScreenProps) {
  const router = useRouter();
  const deleteTitleId = useId();
  const [moment] = useState(initialMoment);
  const [isFavourite, setIsFavourite] = useState(initialMoment.isFavourite);
  const [busy, setBusy] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const primaryMedia = moment.media[0] ?? null;
  const pollingEnabled =
    primaryMedia?.status === "processing" || primaryMedia?.status === "pending";

  useMomentProcessingPoll({
    mediaId: primaryMedia?.id ?? null,
    enabled: pollingEnabled,
    onUpdate: (_outcome, message) => setStatusMessage(message),
    onSettled: () => router.refresh(),
  });

  async function handleFavourite() {
    setBusy(true);
    const next = !isFavourite;
    const result = await toggleMomentFavourite({
      babyId,
      momentId: moment.id,
      isFavourite: next,
    });
    setBusy(false);
    if (result.ok) {
      setIsFavourite(next);
    }
  }

  async function handleRetry() {
    if (!primaryMedia) return;
    setBusy(true);
    setStatusMessage(null);
    const result = await retryMomentMediaProcessing(primaryMedia.id);
    setBusy(false);
    if (result.ok) {
      setStatusMessage(result.data.message);
      router.refresh();
    } else {
      setStatusMessage(result.error);
    }
  }

  async function handleDelete() {
    setBusy(true);
    const result = await deletePrivateMoment({ babyId, momentId: moment.id });
    setBusy(false);
    if (result.ok) {
      router.push(`/baby/${babyId}/moments`);
      router.refresh();
    }
  }

  const canRetry =
    primaryMedia &&
    (primaryMedia.canRetry ||
      outcomeAllowsRetry("retry_available"));

  return (
    <div className="overflow-y-auto pt-safe">
      <GlowContainer size="md" as="div" className="pb-10 pt-6">
        <Link
          href={`/baby/${babyId}/moments`}
          className="mb-4 inline-flex min-h-11 items-center gap-2 text-sm text-glow-text-secondary hover:text-glow-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-glow-primary/40"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to Moments
        </Link>

        <PageHeader
          title={moment.title?.trim() || "Moment"}
          subtitle={babyName}
        />

        <GlowCard padding="md" className="mb-5 border-white/[0.06]">
          {moment.displayUrl ? (
            <div className="overflow-hidden rounded-2xl border border-white/[0.08]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={moment.displayUrl}
                alt={moment.title?.trim() ? `Photo: ${moment.title.trim()}` : "Private moment photo"}
                className="w-full object-cover"
              />
            </div>
          ) : (
            <MomentMediaTile
              media={primaryMedia}
              title={moment.title}
              aspect="wide"
            />
          )}

          {statusMessage ? (
            <p className="mt-3 text-sm text-glow-text-secondary" role="status">
              {statusMessage}
            </p>
          ) : null}

          {canRetry ? (
            <div className="mt-4">
              <GlowButton
                type="button"
                variant="secondary"
                size="sm"
                isLoading={busy}
                onClick={() => void handleRetry()}
              >
                Try again
              </GlowButton>
            </div>
          ) : null}
        </GlowCard>

        <GlowCard padding="md" className="mb-5 border-white/[0.06]">
          <dl className="space-y-3 text-sm">
            <div>
              <dt className="text-glow-text-tertiary">Date</dt>
              <dd className="mt-0.5 text-glow-text">{formatOccurredOn(moment.occurredOn)}</dd>
            </div>
            {moment.ageLabel ? (
              <div>
                <dt className="text-glow-text-tertiary">Age then</dt>
                <dd className="mt-0.5 text-glow-text">{moment.ageLabel}</dd>
              </div>
            ) : null}
            {moment.caption?.trim() ? (
              <div>
                <dt className="text-glow-text-tertiary">Caption</dt>
                <dd className="mt-0.5 whitespace-pre-wrap text-glow-text">
                  {moment.caption.trim()}
                </dd>
              </div>
            ) : null}
            {moment.tags.length > 0 ? (
              <div>
                <dt className="text-glow-text-tertiary">Tags</dt>
                <dd className="mt-2 flex flex-wrap gap-2">
                  {moment.tags.map((tag) => (
                    <span
                      key={tag.id}
                      className="rounded-full border border-white/[0.08] bg-white/[0.04] px-3 py-1 text-xs text-glow-text-secondary"
                    >
                      {tag.label}
                    </span>
                  ))}
                </dd>
              </div>
            ) : null}
          </dl>

          <p className="mt-4 text-xs text-glow-text-tertiary">Only you can see this.</p>
        </GlowCard>

        <div className="flex flex-wrap gap-2">
          <GlowButton
            type="button"
            variant="ghost"
            size="sm"
            leftIcon={
              <Heart
                className={cn("h-4 w-4", isFavourite && "fill-glow-primary text-glow-primary")}
                aria-hidden="true"
              />
            }
            isLoading={busy}
            onClick={() => void handleFavourite()}
          >
            {isFavourite ? "Favourited" : "Favourite"}
          </GlowButton>

          <GlowButton
            type="button"
            variant="ghost"
            size="sm"
            leftIcon={<Trash2 className="h-4 w-4" aria-hidden="true" />}
            onClick={() => setDeleteOpen(true)}
          >
            Delete
          </GlowButton>
        </div>
      </GlowContainer>

      {deleteOpen ? (
        <div
          className="fixed inset-0 z-[70] flex items-end justify-center bg-black/50 p-4 sm:items-center"
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget && !busy) setDeleteOpen(false);
          }}
        >
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby={deleteTitleId}
            className="w-full max-w-sm rounded-[1.75rem] border border-white/[0.08] bg-[rgba(12,16,30,0.97)] p-5 shadow-xl"
          >
            <h2 id={deleteTitleId} className="text-lg font-semibold text-glow-text">
              Delete this moment?
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-glow-text-secondary">
              This removes the photo and details from your album. This cannot be undone.
            </p>
            <div className="mt-5 flex gap-2">
              <GlowButton
                type="button"
                variant="ghost"
                size="md"
                fullWidth
                disabled={busy}
                onClick={() => setDeleteOpen(false)}
              >
                Keep
              </GlowButton>
              <GlowButton
                type="button"
                variant="secondary"
                size="md"
                fullWidth
                isLoading={busy}
                onClick={() => void handleDelete()}
              >
                Delete
              </GlowButton>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
