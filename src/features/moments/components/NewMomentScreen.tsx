"use client";

import { useId, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ImagePlus } from "lucide-react";

import { GlowButton, GlowCard, GlowInput, GlowTextarea } from "@/components/ui";
import { GlowContainer } from "@/components/layout";
import { PageHeader } from "@/components/shell/PageHeader";
import {
  createPrivateMoment,
  finalizeMomentMediaUpload,
  requestMomentUploadSlot,
} from "@/features/moments/actions";
import { calmMessageForOutcome } from "@/features/moments/processing/outcomes";
import { validateClientUploadFile } from "@/features/moments/uploadClient";
import { cn } from "@/lib/utils/cn";

import { useMomentProcessingPoll } from "../hooks/useMomentProcessingPoll";
import type { SystemTagOption } from "../types";

export type NewMomentScreenProps = {
  babyId: string;
  babyName: string;
  systemTags: SystemTagOption[];
};

function todayIsoDate(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function NewMomentScreen({
  babyId,
  babyName,
  systemTags,
}: NewMomentScreenProps) {
  const router = useRouter();
  const fileInputId = useId();
  const submittingRef = useRef(false);

  const [title, setTitle] = useState("");
  const [caption, setCaption] = useState("");
  const [occurredOn, setOccurredOn] = useState(todayIsoDate());
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [customTag, setCustomTag] = useState("");
  const [customTags, setCustomTags] = useState<string[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [phase, setPhase] = useState<
    "idle" | "creating" | "uploading" | "processing" | "done" | "error"
  >("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [mediaId, setMediaId] = useState<string | null>(null);
  const [targetMomentId, setTargetMomentId] = useState<string | null>(null);

  useMomentProcessingPoll({
    mediaId,
    enabled: phase === "processing" && Boolean(mediaId),
    onUpdate: (_outcome, msg) => setMessage(msg),
    onSettled: (outcome) => {
      if (outcome === "ready" && targetMomentId) {
        setPhase("done");
        router.push(`/baby/${babyId}/moments/${targetMomentId}`);
        router.refresh();
      } else if (outcome !== "processing" && outcome !== "uploaded") {
        setPhase("error");
      }
    },
  });

  function toggleTag(tagId: string) {
    setSelectedTagIds((current) =>
      current.includes(tagId)
        ? current.filter((id) => id !== tagId)
        : [...current, tagId],
    );
  }

  function addCustomTag() {
    const trimmed = customTag.trim();
    if (!trimmed) return;
    setCustomTags((current) =>
      current.some((tag) => tag.toLowerCase() === trimmed.toLowerCase())
        ? current
        : [...current, trimmed],
    );
    setCustomTag("");
  }

  function handleFileChange(next: File | null) {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(next);
    setPreviewUrl(next ? URL.createObjectURL(next) : null);
    setMessage(null);
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (submittingRef.current) return;

    if (!file) {
      setMessage("Please choose a photo to continue.");
      setPhase("error");
      return;
    }

    const validated = validateClientUploadFile(file);
    if (!validated.ok) {
      setMessage(validated.error);
      setPhase("error");
      return;
    }

    submittingRef.current = true;
    setPhase("creating");
    setMessage(null);

    const created = await createPrivateMoment({
      title: title.trim() || null,
      caption: caption.trim() || null,
      occurredOn,
      babyIds: [babyId],
      tagIds: selectedTagIds,
      customTagLabels: customTags,
    });

    if (!created.ok) {
      submittingRef.current = false;
      setPhase("error");
      setMessage(created.error);
      return;
    }

    setTargetMomentId(created.data.momentId);
    setPhase("uploading");

    const slot = await requestMomentUploadSlot({
      momentId: created.data.momentId,
      mimeType: validated.mimeType,
      originalFilename: file.name,
      sizeBytes: validated.sizeBytes,
    });

    if (!slot.ok) {
      submittingRef.current = false;
      setPhase("error");
      setMessage(slot.error);
      return;
    }

    const uploadResponse = await fetch(slot.data.signedUploadUrl, {
      method: "PUT",
      headers: { "Content-Type": validated.mimeType },
      body: file,
    });

    if (!uploadResponse.ok) {
      submittingRef.current = false;
      setPhase("error");
      setMessage("We couldn't upload that photo just now. Please try again.");
      return;
    }

    setMediaId(slot.data.mediaId);
    setPhase("processing");
    setMessage(calmMessageForOutcome("processing"));

    const finalized = await finalizeMomentMediaUpload({
      mediaId: slot.data.mediaId,
      sizeBytes: validated.sizeBytes,
    });

    submittingRef.current = false;

    if (!finalized.ok) {
      setPhase("error");
      setMessage(finalized.error);
      return;
    }

    setMessage(finalized.data.message);

    if (finalized.data.outcome === "ready" && created.data.momentId) {
      setPhase("done");
      router.push(`/baby/${babyId}/moments/${created.data.momentId}`);
      router.refresh();
      return;
    }

    if (
      finalized.data.outcome !== "processing" &&
      finalized.data.outcome !== "uploaded"
    ) {
      setPhase("error");
    }
  }

  const busy = phase === "creating" || phase === "uploading" || phase === "processing";

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
          title="Add a moment"
          subtitle={`For ${babyName}. Only you can see this.`}
        />

        <form onSubmit={(event) => void handleSubmit(event)} className="space-y-5">
          <GlowCard padding="md" className="border-white/[0.06]">
            <label htmlFor={fileInputId} className="block text-sm font-medium text-glow-text">
              Photo
            </label>
            <div className="mt-3">
              <input
                id={fileInputId}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="sr-only"
                onChange={(event) =>
                  handleFileChange(event.target.files?.[0] ?? null)
                }
              />
              <label
                htmlFor={fileInputId}
                className={cn(
                  "flex min-h-32 cursor-pointer flex-col items-center justify-center rounded-2xl",
                  "border border-dashed border-white/[0.12] bg-white/[0.03] px-4 py-6",
                  "hover:border-glow-primary/30 hover:bg-glow-primary/[0.04]",
                  "focus-within:outline-none focus-within:ring-2 focus-within:ring-glow-primary/40",
                )}
              >
                {previewUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={previewUrl}
                    alt="Selected photo preview"
                    className="max-h-48 w-full rounded-xl object-cover"
                  />
                ) : (
                  <>
                    <ImagePlus className="h-8 w-8 text-glow-primary/80" aria-hidden="true" />
                    <span className="mt-2 text-sm text-glow-text-secondary">
                      Choose a JPEG, PNG, or WebP photo (up to 8 MB)
                    </span>
                  </>
                )}
              </label>
            </div>
          </GlowCard>

          <GlowCard padding="md" className="space-y-4 border-white/[0.06]">
            <GlowInput
              label="Title (optional)"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              maxLength={120}
              disabled={busy}
            />
            <GlowTextarea
              label="Caption (optional)"
              value={caption}
              onChange={(event) => setCaption(event.target.value)}
              maxLength={500}
              rows={3}
              disabled={busy}
            />
            <GlowInput
              label="When did this happen?"
              type="date"
              value={occurredOn}
              onChange={(event) => setOccurredOn(event.target.value)}
              required
              disabled={busy}
            />

            {systemTags.length > 0 ? (
              <div>
                <p className="mb-2 text-sm font-medium text-glow-text">Tags</p>
                <div className="flex flex-wrap gap-2">
                  {systemTags.map((tag) => {
                    const selected = selectedTagIds.includes(tag.id);
                    return (
                      <button
                        key={tag.id}
                        type="button"
                        aria-pressed={selected}
                        disabled={busy}
                        onClick={() => toggleTag(tag.id)}
                        className={cn(
                          "min-h-10 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-glow-primary/40",
                          selected
                            ? "border-glow-primary/40 bg-glow-primary/15 text-glow-primary"
                            : "border-white/[0.08] bg-white/[0.04] text-glow-text-secondary hover:text-glow-text",
                        )}
                      >
                        {tag.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : null}

            <div>
              <GlowInput
                label="Custom tag (optional)"
                value={customTag}
                onChange={(event) => setCustomTag(event.target.value)}
                disabled={busy}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    addCustomTag();
                  }
                }}
              />
              {customTags.length > 0 ? (
                <div className="mt-2 flex flex-wrap gap-2">
                  {customTags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full border border-white/[0.08] bg-white/[0.04] px-3 py-1 text-xs text-glow-text-secondary"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>

            <p className="text-xs text-glow-text-tertiary">
              Linked to {babyName}. Only you can see this.
            </p>
          </GlowCard>

          {message ? (
            <p
              className={cn(
                "text-sm",
                phase === "error" ? "text-red-300/90" : "text-glow-text-secondary",
              )}
              role="status"
            >
              {message}
            </p>
          ) : null}

          <GlowButton
            type="submit"
            variant="primary"
            size="md"
            fullWidth
            isLoading={busy}
            disabled={busy}
          >
            {phase === "processing"
              ? "Preparing photo…"
              : phase === "uploading"
                ? "Uploading…"
                : "Save moment"}
          </GlowButton>
        </form>
      </GlowContainer>
    </div>
  );
}
