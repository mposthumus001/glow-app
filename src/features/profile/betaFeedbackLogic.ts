import { BETA_FEEDBACK_DUPLICATE_WINDOW_MS } from "./validation.ts";

export function isDuplicateBetaFeedbackSubmission(
  lastCreatedAtIso: string | null | undefined,
  nowMs: number = Date.now(),
  windowMs: number = BETA_FEEDBACK_DUPLICATE_WINDOW_MS,
): boolean {
  if (!lastCreatedAtIso) return false;

  const lastMs = Date.parse(lastCreatedAtIso);
  if (Number.isNaN(lastMs)) return false;

  return nowMs - lastMs < windowMs;
}
