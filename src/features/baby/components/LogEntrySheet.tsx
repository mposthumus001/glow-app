"use client";

import { useEffect, useId, useRef, useState } from "react";

import {
  GlowButton,
  GlowInput,
  GlowSelect,
  GlowTextarea,
} from "@/components/ui";
import type { FeedSide, NappyType } from "@/lib/supabase/database.types";
import { cn } from "@/lib/utils/cn";

import type { BabyActivityItem, FeedingKind } from "../types";
import {
  FEED_SIDE_OPTIONS,
  FEEDING_KIND_OPTIONS,
  NAPPY_TYPE_OPTIONS,
  NOTE_MAX_LENGTH,
  showsAmountField,
  showsSideField,
  toDatetimeLocalValue,
} from "../tracking/eventLogic";

export type LogMode = "feeding" | "sleep" | "nappy";

export type LogEntrySheetProps = {
  open: boolean;
  mode: LogMode | null;
  editing: BabyActivityItem | null;
  submitting: boolean;
  onClose: () => void;
  onSubmitFeeding: (input: {
    kind: FeedingKind | null;
    startedAt: string;
    amountMl?: string;
    side?: FeedSide | null;
    notes?: string;
  }) => Promise<{ ok: boolean; field?: string; message?: string }>;
  onSubmitSleep: (input: {
    startedAt: string;
    endedAt: string;
    notes?: string;
  }) => Promise<{ ok: boolean; field?: string; message?: string }>;
  onSubmitNappy: (input: {
    nappyType: NappyType | null;
    startedAt: string;
    notes?: string;
  }) => Promise<{ ok: boolean; field?: string; message?: string }>;
};

export function LogEntrySheet(props: LogEntrySheetProps) {
  if (!props.open || !props.mode) return null;

  return (
    <LogEntrySheetForm
      key={`${props.mode}-${props.editing?.id ?? "new"}`}
      {...props}
      mode={props.mode}
    />
  );
}

type FormProps = LogEntrySheetProps & { mode: LogMode };

function LogEntrySheetForm({
  mode,
  editing,
  submitting,
  onClose,
  onSubmitFeeding,
  onSubmitSleep,
  onSubmitNappy,
}: FormProps) {
  const titleId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  const initial = buildInitialFormState(editing);

  const [feedingKind, setFeedingKind] = useState<FeedingKind | "">(
    initial.feedingKind,
  );
  const [nappyType, setNappyType] = useState<NappyType | "">(initial.nappyType);
  const [side, setSide] = useState<FeedSide | "">(initial.side);
  const [startedAt, setStartedAt] = useState(initial.startedAt);
  const [endedAt, setEndedAt] = useState(initial.endedAt);
  const [amountMl, setAmountMl] = useState(initial.amountMl);
  const [notes, setNotes] = useState(initial.notes);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    previouslyFocused.current = document.activeElement as HTMLElement | null;
    const t = window.setTimeout(() => closeRef.current?.focus(), 50);

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        handleClose();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener("keydown", onKey);
    };
    // Mount-only focus + escape for this sheet instance
    // eslint-disable-next-line react-hooks/exhaustive-deps -- remounted via key
  }, []);

  const title = editing
    ? mode === "feeding"
      ? "Edit feed"
      : mode === "sleep"
        ? "Edit sleep"
        : "Edit nappy"
    : mode === "feeding"
      ? "Log a feed"
      : mode === "sleep"
        ? "Log sleep"
        : "Log a nappy";

  function handleClose() {
    onClose();
    window.setTimeout(() => {
      previouslyFocused.current?.focus?.();
    }, 0);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;

    setFieldErrors({});
    setFormError(null);

    let result: { ok: boolean; field?: string; message?: string };

    if (mode === "feeding") {
      result = await onSubmitFeeding({
        kind: feedingKind || null,
        startedAt,
        amountMl,
        side: side || null,
        notes,
      });
    } else if (mode === "sleep") {
      result = await onSubmitSleep({ startedAt, endedAt, notes });
    } else {
      result = await onSubmitNappy({
        nappyType: nappyType || null,
        startedAt,
        notes,
      });
    }

    if (!result.ok) {
      if (result.field && result.message) {
        setFieldErrors({ [result.field]: result.message });
      } else {
        setFormError(result.message ?? "Something went wrong. Please try again.");
      }
      return;
    }

    handleClose();
  }

  const showAmount = feedingKind ? showsAmountField(feedingKind) : false;
  const showSide = feedingKind ? showsSideField(feedingKind) : false;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-black/50 p-4 sm:items-center"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={cn(
          "max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-[1.75rem]",
          "border border-white/[0.08] bg-[rgba(12,16,30,0.97)] p-5 shadow-xl",
          "backdrop-blur-xl",
        )}
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <h2 id={titleId} className="text-lg font-semibold text-glow-text">
            {title}
          </h2>
          <button
            ref={closeRef}
            type="button"
            onClick={handleClose}
            className="min-h-10 min-w-10 rounded-xl text-sm text-glow-text-tertiary hover:text-glow-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-glow-primary/40"
          >
            Close
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          {mode === "feeding" ? (
            <>
              <GlowSelect
                label="Feeding type"
                name="feeding_kind"
                value={feedingKind}
                onChange={(e) =>
                  setFeedingKind(e.target.value as FeedingKind | "")
                }
                options={FEEDING_KIND_OPTIONS}
                placeholder="Choose type"
                error={fieldErrors.kind}
                required
              />
              <GlowInput
                label="Time"
                name="started_at"
                type="datetime-local"
                value={startedAt}
                onChange={(e) => setStartedAt(e.target.value)}
                error={fieldErrors.startedAt}
                required
              />
              {showAmount ? (
                <GlowInput
                  label="Amount (ml)"
                  name="amount_ml"
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={2000}
                  step={1}
                  value={amountMl}
                  onChange={(e) => setAmountMl(e.target.value)}
                  error={fieldErrors.amountMl}
                  hint="Optional"
                />
              ) : null}
              {showSide ? (
                <GlowSelect
                  label="Side"
                  name="side"
                  value={side}
                  onChange={(e) => setSide(e.target.value as FeedSide | "")}
                  options={FEED_SIDE_OPTIONS}
                  placeholder="Optional"
                />
              ) : null}
            </>
          ) : null}

          {mode === "sleep" ? (
            <>
              <GlowInput
                label="Started"
                name="sleep_started"
                type="datetime-local"
                value={startedAt}
                onChange={(e) => setStartedAt(e.target.value)}
                error={fieldErrors.startedAt}
                required
              />
              <GlowInput
                label="Ended"
                name="sleep_ended"
                type="datetime-local"
                value={endedAt}
                onChange={(e) => setEndedAt(e.target.value)}
                error={fieldErrors.endedAt}
                hint="Completed sleeps only for now"
                required
              />
            </>
          ) : null}

          {mode === "nappy" ? (
            <>
              <fieldset>
                <legend className="mb-1.5 text-sm font-medium text-glow-text-secondary">
                  Type
                </legend>
                <div className="flex flex-wrap gap-2" role="group">
                  {NAPPY_TYPE_OPTIONS.map((option) => {
                    const active = nappyType === option.value;
                    return (
                      <button
                        key={option.value}
                        type="button"
                        aria-pressed={active}
                        onClick={() => setNappyType(option.value)}
                        className={cn(
                          "min-h-11 rounded-2xl px-4 text-sm font-medium transition-colors",
                          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-glow-primary/40",
                          active
                            ? "bg-glow-primary/15 text-glow-primary"
                            : "bg-white/[0.04] text-glow-text-secondary",
                          fieldErrors.nappyType && !nappyType
                            ? "ring-1 ring-red-400/40"
                            : "",
                        )}
                      >
                        {option.label}
                      </button>
                    );
                  })}
                </div>
                {fieldErrors.nappyType ? (
                  <p className="mt-1.5 text-xs text-red-300" role="alert">
                    {fieldErrors.nappyType}
                  </p>
                ) : null}
              </fieldset>
              <GlowInput
                label="Time"
                name="nappy_at"
                type="datetime-local"
                value={startedAt}
                onChange={(e) => setStartedAt(e.target.value)}
                error={fieldErrors.startedAt}
                required
              />
            </>
          ) : null}

          <GlowTextarea
            label="Note"
            name="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            maxLength={NOTE_MAX_LENGTH + 20}
            error={fieldErrors.notes}
            hint={`Optional · up to ${NOTE_MAX_LENGTH} characters`}
            rows={2}
          />

          {formError ? (
            <p className="text-sm text-red-300" role="alert">
              {formError}
            </p>
          ) : null}

          <div className="flex gap-2 pt-1">
            <GlowButton
              type="button"
              variant="ghost"
              size="md"
              fullWidth
              onClick={handleClose}
              disabled={submitting}
            >
              Cancel
            </GlowButton>
            <GlowButton
              type="submit"
              variant="primary"
              size="md"
              fullWidth
              isLoading={submitting}
            >
              {editing ? "Save" : "Save entry"}
            </GlowButton>
          </div>
        </form>
      </div>
    </div>
  );
}

function buildInitialFormState(editing: BabyActivityItem | null) {
  if (editing) {
    return {
      startedAt: toDatetimeLocalValue(new Date(editing.startedAt)),
      endedAt: editing.endedAt
        ? toDatetimeLocalValue(new Date(editing.endedAt))
        : toDatetimeLocalValue(),
      amountMl: editing.amountMl != null ? String(editing.amountMl) : "",
      notes: editing.notes ?? "",
      side: (editing.side && editing.side !== "none" ? editing.side : "") as
        | FeedSide
        | "",
      feedingKind: (editing.feedingKind ?? "") as FeedingKind | "",
      nappyType: (editing.nappyType ?? "") as NappyType | "",
    };
  }

  const now = toDatetimeLocalValue();
  return {
    startedAt: now,
    endedAt: now,
    amountMl: "",
    notes: "",
    side: "" as FeedSide | "",
    feedingKind: "" as FeedingKind | "",
    nappyType: "" as NappyType | "",
  };
}
