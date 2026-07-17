/** Keep aligned with `DEFAULT_DISPLAY_NAME` in onboarding. */
const DEFAULT_DISPLAY_NAME = "New parent";

export const DISPLAY_NAME_MAX = 80;
export const SUBURB_AREA_MAX = 80;
export const FEEDBACK_MESSAGE_MAX = 2000;
export const BETA_FEEDBACK_SUMMARY_MAX = 200;
export const BETA_FEEDBACK_DETAILS_MAX = 2000;
export const BETA_FEEDBACK_DUPLICATE_WINDOW_MS = 30_000;
export const DELETION_REASON_MAX = 500;

type AuState =
  | "NSW"
  | "VIC"
  | "QLD"
  | "WA"
  | "SA"
  | "TAS"
  | "ACT"
  | "NT";

type FeedingMethod =
  | "breastfeeding"
  | "bottle"
  | "mixed"
  | "solids"
  | "other";

type MapVisibility = "hidden" | "state_only" | "suburb_area";

export type ParentProfileInput = {
  displayName: string;
  state: string;
  feedingMethod: string;
  firstChild: string;
};

export type BabyProfileInput = {
  babyId: string;
  name: string;
  dateOfBirth: string;
  dueDate: string;
  feedingMethod: string;
};

export type AtlasPrivacyInput = {
  mapVisibility: string;
  suburbArea: string;
};

export type FeedbackInput = {
  category: string;
  message: string;
  routeContext?: string;
};

export type BetaFeedbackInput = {
  category: string;
  summary: string;
  details?: string;
  route?: string;
  appVersion?: string;
  userAgent?: string;
  viewport?: string;
  contactAllowed: boolean;
};

export type ValidationResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: string };

const AU_STATES = new Set([
  "NSW",
  "VIC",
  "QLD",
  "WA",
  "SA",
  "TAS",
  "ACT",
  "NT",
]);

const FEEDING = new Set([
  "breastfeeding",
  "bottle",
  "mixed",
  "solids",
  "other",
]);

const MAP_VIS = new Set(["hidden", "state_only", "suburb_area"]);

const FEEDBACK_CATEGORIES = new Set([
  "feedback",
  "technical",
  "safety",
  "other",
]);

const BETA_FEEDBACK_CATEGORIES = new Set([
  "bug",
  "confusing",
  "suggestion",
  "other",
]);

export function validateParentProfile(
  input: ParentProfileInput,
): ValidationResult<{
  displayName: string;
  state: AuState;
  feedingMethod: FeedingMethod;
  firstChild: boolean;
}> {
  const displayName = input.displayName.trim();
  if (!displayName || displayName.length > DISPLAY_NAME_MAX) {
    return {
      ok: false,
      error: "Please enter a display name (1–80 characters).",
    };
  }
  if (displayName.toLowerCase() === DEFAULT_DISPLAY_NAME.toLowerCase()) {
    return { ok: false, error: "Please choose a name that feels like you." };
  }
  if (!AU_STATES.has(input.state)) {
    return { ok: false, error: "Please select your state." };
  }
  if (!FEEDING.has(input.feedingMethod)) {
    return { ok: false, error: "Please select a feeding method." };
  }
  if (input.firstChild !== "true" && input.firstChild !== "false") {
    return {
      ok: false,
      error: "Please tell us if this is your first child.",
    };
  }

  return {
    ok: true,
    value: {
      displayName,
      state: input.state as AuState,
      feedingMethod: input.feedingMethod as FeedingMethod,
      firstChild: input.firstChild === "true",
    },
  };
}

export function validateBabyProfile(
  input: BabyProfileInput,
): ValidationResult<{
  babyId: string;
  name: string;
  dateOfBirth: string | null;
  dueDate: string | null;
  feedingMethod: FeedingMethod | null;
}> {
  const babyId = input.babyId.trim();
  if (!babyId) {
    return { ok: false, error: "Please choose a baby to update." };
  }

  const name = input.name.trim();
  if (!name || name.length > 80) {
    return {
      ok: false,
      error: "Please enter a baby name (1–80 characters).",
    };
  }

  const dateOfBirth = input.dateOfBirth.trim() || null;
  const dueDate = input.dueDate.trim() || null;

  if (!dateOfBirth && !dueDate) {
    return {
      ok: false,
      error: "Add a date of birth or due date.",
    };
  }

  if (dateOfBirth && !isIsoDate(dateOfBirth)) {
    return { ok: false, error: "Date of birth looks invalid." };
  }
  if (dueDate && !isIsoDate(dueDate)) {
    return { ok: false, error: "Due date looks invalid." };
  }

  let feedingMethod: FeedingMethod | null = null;
  if (input.feedingMethod.trim()) {
    if (!FEEDING.has(input.feedingMethod)) {
      return { ok: false, error: "Please select a feeding method." };
    }
    feedingMethod = input.feedingMethod as FeedingMethod;
  }

  return {
    ok: true,
    value: { babyId, name, dateOfBirth, dueDate, feedingMethod },
  };
}

export function validateAtlasPrivacy(
  input: AtlasPrivacyInput,
): ValidationResult<{
  mapVisibility: MapVisibility;
  suburbArea: string | null;
}> {
  if (!MAP_VIS.has(input.mapVisibility)) {
    return { ok: false, error: "That privacy level isn’t available." };
  }

  const mapVisibility = input.mapVisibility as MapVisibility;
  const suburbRaw = input.suburbArea.trim().slice(0, SUBURB_AREA_MAX);

  if (mapVisibility === "suburb_area") {
    if (!suburbRaw) {
      return {
        ok: false,
        error: "Add a suburb area label, or choose State only / Hidden.",
      };
    }
    return { ok: true, value: { mapVisibility, suburbArea: suburbRaw } };
  }

  return { ok: true, value: { mapVisibility, suburbArea: null } };
}

export function validateBetaFeedback(
  input: BetaFeedbackInput,
): ValidationResult<{
  category: "bug" | "confusing" | "suggestion" | "other";
  summary: string;
  details: string | null;
  route: string | null;
  appVersion: string | null;
  userAgent: string | null;
  viewport: string | null;
  contactAllowed: boolean;
}> {
  if (!BETA_FEEDBACK_CATEGORIES.has(input.category)) {
    return { ok: false, error: "Please choose a feedback category." };
  }

  const summary = input.summary.trim();
  if (!summary || summary.length > BETA_FEEDBACK_SUMMARY_MAX) {
    return {
      ok: false,
      error: `Please add a short summary (1–${BETA_FEEDBACK_SUMMARY_MAX} characters).`,
    };
  }

  const detailsRaw = input.details?.trim() ?? "";
  const details = detailsRaw ? detailsRaw.slice(0, BETA_FEEDBACK_DETAILS_MAX) : null;
  if (detailsRaw && detailsRaw.length > BETA_FEEDBACK_DETAILS_MAX) {
    return {
      ok: false,
      error: `Details can be up to ${BETA_FEEDBACK_DETAILS_MAX} characters.`,
    };
  }

  const route = input.route?.trim().slice(0, 200) || null;
  const appVersion = input.appVersion?.trim().slice(0, 40) || null;
  const userAgent = input.userAgent?.trim().slice(0, 512) || null;
  const viewport = input.viewport?.trim().slice(0, 32) || null;

  return {
    ok: true,
    value: {
      category: input.category as
        | "bug"
        | "confusing"
        | "suggestion"
        | "other",
      summary,
      details,
      route,
      appVersion,
      userAgent,
      viewport,
      contactAllowed: input.contactAllowed,
    },
  };
}

/** @deprecated Legacy app_feedback — use validateBetaFeedback for new submissions. */
export function validateFeedback(
  input: FeedbackInput,
): ValidationResult<{
  category: "feedback" | "technical" | "safety" | "other";
  message: string;
  routeContext: string | null;
}> {
  if (!FEEDBACK_CATEGORIES.has(input.category)) {
    return { ok: false, error: "Please choose a feedback category." };
  }

  const message = input.message.trim();
  if (!message || message.length > FEEDBACK_MESSAGE_MAX) {
    return {
      ok: false,
      error: `Please write a message (1–${FEEDBACK_MESSAGE_MAX} characters).`,
    };
  }

  const routeContext = input.routeContext?.trim().slice(0, 200) || null;

  return {
    ok: true,
    value: {
      category: input.category as
        | "feedback"
        | "technical"
        | "safety"
        | "other",
      message,
      routeContext,
    },
  };
}

export function validateDeletionReason(
  reason: string,
): ValidationResult<string | null> {
  const trimmed = reason.trim();
  if (!trimmed) return { ok: true, value: null };
  if (trimmed.length > DELETION_REASON_MAX) {
    return {
      ok: false,
      error: `Reason must be ${DELETION_REASON_MAX} characters or fewer.`,
    };
  }
  return { ok: true, value: trimmed };
}

export function displayNameInitials(displayName: string): string {
  const parts = displayName
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);
  if (parts.length === 0) return "?";
  return parts.map((p) => p[0]!.toUpperCase()).join("");
}

function isIsoDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}
