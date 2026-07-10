/**
 * Curated daily prompt library (beta-safe).
 * Keep selection logic in sync with migration 0006 `prompt_library` seed order.
 */

export type PromptLibraryEntry = {
  title: string | null;
  promptText: string;
};

export const PROMPT_LIBRARY: readonly PromptLibraryEntry[] = [
  { title: "Tiny win", promptText: "What's one tiny win from today?" },
  { title: "Check-in", promptText: "What's been on your mind lately?" },
  {
    title: "Human moment",
    promptText: "What helped you feel a little more human today?",
  },
  {
    title: "Gentle reflection",
    promptText: "What would you tell yourself from last week?",
  },
  {
    title: "Gratitude",
    promptText: "What's something small you're grateful for right now?",
  },
  {
    title: "A smile",
    promptText: "What's one thing that made you smile recently?",
  },
  {
    title: "This week",
    promptText: "What do you need a little more of this week?",
  },
  {
    title: "Keeping going",
    promptText: "What's keeping you going right now?",
  },
  {
    title: "Surprise",
    promptText: "What surprised you about parenting lately?",
  },
  {
    title: "Tonight",
    promptText: "What would make tonight a little easier?",
  },
] as const;

/** Australian timezone for daily prompt calendar dates. */
export const PROMPT_TIMEZONE = "Australia/Sydney";

export type CircleDailyPrompt = {
  id: string;
  title: string | null;
  promptText: string;
  promptDate: string;
};

export function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

/**
 * Deterministic library index for a circle + calendar date.
 * Matches SQL: abs(hashtext(circle_id || date)) % count
 */
export function selectLibraryIndex(
  circleId: string,
  promptDate: string,
  librarySize: number,
): number {
  if (librarySize <= 0) return 0;
  const key = `${circleId}${promptDate}`;
  return hashString(key) % librarySize;
}

export function selectPromptFromLibrary(
  circleId: string,
  promptDate: string,
  library: readonly PromptLibraryEntry[] = PROMPT_LIBRARY,
): PromptLibraryEntry | null {
  const active = library.filter((entry) => entry.promptText.trim().length > 0);
  if (active.length === 0) return null;
  const index = selectLibraryIndex(circleId, promptDate, active.length);
  return active[index] ?? active[0];
}

/**
 * Resolve Australian calendar date string (YYYY-MM-DD) from a UTC instant.
 * Uses Intl for DST-aware Australia/Sydney boundaries.
 */
export function australianPromptDateString(
  at: Date = new Date(),
): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: PROMPT_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(at);

  const year = parts.find((p) => p.type === "year")?.value;
  const month = parts.find((p) => p.type === "month")?.value;
  const day = parts.find((p) => p.type === "day")?.value;

  if (!year || !month || !day) {
    return at.toISOString().slice(0, 10);
  }

  return `${year}-${month}-${day}`;
}

export function fallbackPromptText(): string {
  return "What's one tiny win from today?";
}

export function normalizeDailyPrompt(
  payload: {
    id?: string | null;
    title?: string | null;
    prompt_text?: string | null;
    prompt_date?: string | null;
  } | null,
  promptDate: string,
): CircleDailyPrompt | null {
  if (!payload?.id || !payload.prompt_text) return null;
  return {
    id: payload.id,
    title: payload.title ?? null,
    promptText: payload.prompt_text,
    promptDate: payload.prompt_date ?? promptDate,
  };
}
