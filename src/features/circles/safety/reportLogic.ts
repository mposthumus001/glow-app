import type { ReportReason } from "@/lib/supabase/database.types";

export type { ReportReason };

export const REPORT_NOTE_MAX_LENGTH = 500;

export type ReportReasonOption = {
  code: ReportReason;
  label: string;
  description: string;
};

export const REPORT_REASON_OPTIONS: readonly ReportReasonOption[] = [
  {
    code: "harmful",
    label: "Harmful or unsafe",
    description: "Content that feels unsafe or could cause harm",
  },
  {
    code: "harassment",
    label: "Harassment or bullying",
    description: "Targeting, intimidation, or repeated unwanted contact",
  },
  {
    code: "misinformation",
    label: "Misinformation",
    description: "Medical or safety information that seems misleading",
  },
  {
    code: "privacy",
    label: "Privacy concern",
    description: "Personal details shared without consent",
  },
  {
    code: "spam",
    label: "Spam",
    description: "Unwanted repetitive or promotional content",
  },
  {
    code: "other",
    label: "Something else",
    description: "Another concern not listed here",
  },
] as const;

export const REPORT_CONFIRMATION_COPY =
  "Thanks for letting us know. We'll keep this report on record for review.";

export const CRISIS_DISCLAIMER_COPY =
  "Glow is peer support — not emergency, medical, or crisis care. If you or someone else is in immediate danger, call 000. For mental health support, contact Lifeline on 13 11 14.";

export function isReportReason(value: string): value is ReportReason {
  return REPORT_REASON_OPTIONS.some((option) => option.code === value);
}

export function validateReportNote(note: string): {
  ok: true;
  note: string | null;
} | {
  ok: false;
  reason: "too_long";
} {
  const trimmed = note.trim();
  if (!trimmed) return { ok: true, note: null };
  if (trimmed.length > REPORT_NOTE_MAX_LENGTH) {
    return { ok: false, reason: "too_long" };
  }
  return { ok: true, note: trimmed };
}

export function canReportMessage(input: {
  messageId: string;
  circleId: string;
  activeCircleId: string;
  status: "confirmed" | "optimistic" | "failed";
  isOwn: boolean;
}): boolean {
  if (input.circleId !== input.activeCircleId) return false;
  if (input.status !== "confirmed") return false;
  if (input.messageId.startsWith("optimistic:")) return false;
  if (input.isOwn) return false;
  return true;
}
