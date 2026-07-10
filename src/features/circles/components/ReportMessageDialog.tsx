"use client";

import { useId, useState } from "react";

import { GlowButton, GlowTextarea } from "@/components/ui";
import {
  CRISIS_DISCLAIMER_COPY,
  REPORT_CONFIRMATION_COPY,
  REPORT_REASON_OPTIONS,
  validateReportNote,
  type ReportReason,
} from "@/features/circles/safety/reportLogic";
import { cn } from "@/lib/utils/cn";

export type ReportMessageDialogProps = {
  open: boolean;
  onClose: () => void;
  onSubmit: (input: {
    reasonCode: ReportReason;
    notes: string | null;
  }) => Promise<{ ok: boolean; duplicate?: boolean }>;
};

export function ReportMessageDialog({
  open,
  onClose,
  onSubmit,
}: ReportMessageDialogProps) {
  const titleId = useId();
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  if (!open) return null;

  async function handleSubmit() {
    if (!reason || submitting) return;

    const validated = validateReportNote(notes);
    if (!validated.ok) {
      setError("Please keep your note shorter.");
      return;
    }

    setSubmitting(true);
    setError(null);

    const result = await onSubmit({
      reasonCode: reason,
      notes: validated.note,
    });

    setSubmitting(false);

    if (result.duplicate) {
      setSubmitted(true);
      return;
    }

    if (!result.ok) {
      setError("We couldn't save that just now. You can try again.");
      return;
    }

    setSubmitted(true);
  }

  function handleClose() {
    setReason(null);
    setNotes("");
    setError(null);
    setSubmitted(false);
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-black/50 p-4 sm:items-center"
      role="presentation"
      onClick={handleClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={cn(
          "w-full max-w-md rounded-2xl border border-white/[0.08]",
          "bg-glow-background p-5 shadow-2xl",
        )}
        onClick={(event) => event.stopPropagation()}
      >
        {submitted ? (
          <>
            <h2 id={titleId} className="text-lg font-medium text-glow-text">
              Report received
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-glow-text-secondary">
              {REPORT_CONFIRMATION_COPY}
            </p>
            <GlowButton
              type="button"
              variant="primary"
              size="md"
              className="mt-5 w-full"
              onClick={handleClose}
            >
              Close
            </GlowButton>
          </>
        ) : (
          <>
            <h2 id={titleId} className="text-lg font-medium text-glow-text">
              Report message
            </h2>
            <p className="mt-2 text-sm text-glow-text-secondary">
              This stays private. Only you and our review team can see it.
            </p>

            <fieldset className="mt-4 space-y-2">
              <legend className="sr-only">Reason for report</legend>
              {REPORT_REASON_OPTIONS.map((option) => (
                <label
                  key={option.code}
                  className={cn(
                    "flex cursor-pointer items-start gap-3 rounded-xl border px-3 py-2.5",
                    "border-white/[0.08] hover:bg-white/[0.03]",
                    reason === option.code &&
                      "border-glow-primary/35 bg-glow-primary/10",
                  )}
                >
                  <input
                    type="radio"
                    name="report-reason"
                    value={option.code}
                    checked={reason === option.code}
                    onChange={() => setReason(option.code)}
                    className="mt-1"
                  />
                  <span>
                    <span className="block text-sm font-medium text-glow-text">
                      {option.label}
                    </span>
                    <span className="block text-xs text-glow-text-tertiary">
                      {option.description}
                    </span>
                  </span>
                </label>
              ))}
            </fieldset>

            <GlowTextarea
              id="report-notes"
              name="notes"
              label="Optional note"
              rows={2}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="A few words if helpful (optional)"
              className="mt-4"
            />

            {error ? (
              <p className="mt-2 text-sm text-glow-text-secondary" role="alert">
                {error}
              </p>
            ) : null}

            <p className="mt-4 text-xs leading-relaxed text-glow-text-tertiary">
              {CRISIS_DISCLAIMER_COPY}
            </p>

            <div className="mt-5 flex gap-3">
              <GlowButton
                type="button"
                variant="ghost"
                size="md"
                className="flex-1"
                onClick={handleClose}
              >
                Cancel
              </GlowButton>
              <GlowButton
                type="button"
                variant="primary"
                size="md"
                className="flex-1"
                disabled={!reason || submitting}
                isLoading={submitting}
                onClick={() => {
                  void handleSubmit();
                }}
              >
                Submit
              </GlowButton>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
