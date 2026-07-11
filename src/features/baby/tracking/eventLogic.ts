import type {
  BabyEventRow,
  BabyEventType,
  FeedSide,
  Json,
  NappyType,
} from "@/lib/supabase/database.types";

import type {
  BabyActivityItem,
  FeedingKind,
  TodaySummary,
  TrackingActivityKind,
} from "../types";

/** Soft UX note cap — database allows up to 2000. */
export const NOTE_MAX_LENGTH = 280;

export const ACTIVITY_PAGE_SIZE = 20;

export const FEEDING_KIND_OPTIONS: {
  value: FeedingKind;
  label: string;
}[] = [
  { value: "breast", label: "Breast" },
  { value: "bottle", label: "Bottle" },
  { value: "formula", label: "Formula" },
  { value: "expressed_milk", label: "Expressed milk" },
  { value: "solids", label: "Solids" },
  { value: "other", label: "Other" },
];

export const NAPPY_TYPE_OPTIONS: {
  value: NappyType;
  label: string;
}[] = [
  { value: "wet", label: "Wet" },
  { value: "dirty", label: "Dirty" },
  { value: "both", label: "Both" },
];

export const FEED_SIDE_OPTIONS: {
  value: FeedSide;
  label: string;
}[] = [
  { value: "left", label: "Left" },
  { value: "right", label: "Right" },
  { value: "both", label: "Both" },
];

const FEEDING_EVENT_TYPES = new Set<BabyEventType>([
  "breastfeed",
  "bottle_feed",
  "pump",
  "formula",
  "expressed_milk",
  "solids",
]);

export function feedingKindToEventType(kind: FeedingKind): BabyEventType {
  switch (kind) {
    case "breast":
      return "breastfeed";
    case "bottle":
      return "bottle_feed";
    case "formula":
      return "formula";
    case "expressed_milk":
      return "expressed_milk";
    case "solids":
      return "solids";
    case "other":
      return "note";
  }
}

export function eventTypeToFeedingKind(
  eventType: BabyEventType,
  metadata: Json | null | undefined,
): FeedingKind | null {
  switch (eventType) {
    case "breastfeed":
      return "breast";
    case "bottle_feed":
      return "bottle";
    case "formula":
      return "formula";
    case "expressed_milk":
      return "expressed_milk";
    case "solids":
      return "solids";
    case "pump":
      return "expressed_milk";
    case "note":
      if (isRecord(metadata) && metadata.tracking === "feeding_other") {
        return "other";
      }
      return null;
    default:
      return null;
  }
}

export function isFeedingEventType(eventType: BabyEventType): boolean {
  return FEEDING_EVENT_TYPES.has(eventType);
}

export function activityKindFromEvent(
  eventType: BabyEventType,
  metadata: Json | null | undefined,
): TrackingActivityKind | null {
  if (eventType === "sleep") return "sleep";
  if (eventType === "nappy") return "nappy";
  if (isFeedingEventType(eventType)) return "feeding";
  if (eventType === "note" && isRecord(metadata) && metadata.tracking === "feeding_other") {
    return "feeding";
  }
  return null;
}

export function showsAmountField(kind: FeedingKind): boolean {
  return kind === "bottle" || kind === "formula" || kind === "expressed_milk";
}

export function showsSideField(kind: FeedingKind): boolean {
  return kind === "breast";
}

export function prepareNote(
  raw: string | null | undefined,
):
  | { ok: true; notes: string | null }
  | { ok: false; reason: "too_long" } {
  if (raw == null) return { ok: true, notes: null };
  const notes = raw.trim();
  if (!notes) return { ok: true, notes: null };
  if (notes.length > NOTE_MAX_LENGTH) {
    return { ok: false, reason: "too_long" };
  }
  return { ok: true, notes };
}

export function validateFeedingInput(input: {
  kind: FeedingKind | null;
  startedAt: string;
  amountMl?: string | number | null;
  side?: FeedSide | null;
  notes?: string | null;
}):
  | {
      ok: true;
      eventType: BabyEventType;
      startedAt: string;
      amountMl: number | null;
      side: FeedSide | null;
      notes: string | null;
      metadata: Json;
    }
  | {
      ok: false;
      field: "kind" | "startedAt" | "amountMl" | "notes";
      message: string;
    } {
  if (!input.kind) {
    return { ok: false, field: "kind", message: "Choose a feeding type." };
  }

  const startedAt = parseInstant(input.startedAt);
  if (!startedAt) {
    return {
      ok: false,
      field: "startedAt",
      message: "Choose a valid time.",
    };
  }

  let amountMl: number | null = null;
  if (showsAmountField(input.kind)) {
    const raw = input.amountMl;
    if (raw !== null && raw !== undefined && String(raw).trim() !== "") {
      const n = typeof raw === "number" ? raw : Number(raw);
      if (!Number.isFinite(n) || n <= 0 || !Number.isInteger(n)) {
        return {
          ok: false,
          field: "amountMl",
          message: "Amount must be a whole number of ml greater than zero.",
        };
      }
      if (n > 2000) {
        return {
          ok: false,
          field: "amountMl",
          message: "Amount looks too high — please check.",
        };
      }
      amountMl = n;
    }
  }

  const noteResult = prepareNote(input.notes);
  if (!noteResult.ok) {
    return {
      ok: false,
      field: "notes",
      message: `Keep notes under ${NOTE_MAX_LENGTH} characters.`,
    };
  }

  const side =
    showsSideField(input.kind) && input.side && input.side !== "none"
      ? input.side
      : null;

  const eventType = feedingKindToEventType(input.kind);
  const metadata: Json =
    input.kind === "other" ? { tracking: "feeding_other" } : {};

  return {
    ok: true,
    eventType,
    startedAt,
    amountMl,
    side,
    notes: noteResult.notes,
    metadata,
  };
}

export function validateSleepInput(input: {
  startedAt: string;
  endedAt: string;
  notes?: string | null;
}):
  | {
      ok: true;
      startedAt: string;
      endedAt: string;
      durationMs: number;
      notes: string | null;
    }
  | {
      ok: false;
      field: "startedAt" | "endedAt" | "notes";
      message: string;
    } {
  const startedAt = parseInstant(input.startedAt);
  if (!startedAt) {
    return {
      ok: false,
      field: "startedAt",
      message: "Choose a valid start time.",
    };
  }

  const endedAt = parseInstant(input.endedAt);
  if (!endedAt) {
    return {
      ok: false,
      field: "endedAt",
      message: "Choose a valid end time.",
    };
  }

  const startMs = new Date(startedAt).getTime();
  const endMs = new Date(endedAt).getTime();
  if (endMs < startMs) {
    return {
      ok: false,
      field: "endedAt",
      message: "End time can’t be before the start.",
    };
  }

  const durationMs = endMs - startMs;
  if (durationMs === 0) {
    return {
      ok: false,
      field: "endedAt",
      message: "Sleep needs a little duration — adjust the times.",
    };
  }

  if (durationMs > 24 * 60 * 60 * 1000) {
    return {
      ok: false,
      field: "endedAt",
      message: "That sleep looks longer than a day — please check the times.",
    };
  }

  const noteResult = prepareNote(input.notes);
  if (!noteResult.ok) {
    return {
      ok: false,
      field: "notes",
      message: `Keep notes under ${NOTE_MAX_LENGTH} characters.`,
    };
  }

  return {
    ok: true,
    startedAt,
    endedAt,
    durationMs,
    notes: noteResult.notes,
  };
}

export function validateNappyInput(input: {
  nappyType: NappyType | null;
  startedAt: string;
  notes?: string | null;
}):
  | {
      ok: true;
      startedAt: string;
      nappyType: NappyType;
      notes: string | null;
      metadata: Json;
    }
  | {
      ok: false;
      field: "nappyType" | "startedAt" | "notes";
      message: string;
    } {
  if (!input.nappyType) {
    return {
      ok: false,
      field: "nappyType",
      message: "Choose wet, dirty, or both.",
    };
  }

  if (!["wet", "dirty", "both"].includes(input.nappyType)) {
    return {
      ok: false,
      field: "nappyType",
      message: "Choose wet, dirty, or both.",
    };
  }

  const startedAt = parseInstant(input.startedAt);
  if (!startedAt) {
    return {
      ok: false,
      field: "startedAt",
      message: "Choose a valid time.",
    };
  }

  const noteResult = prepareNote(input.notes);
  if (!noteResult.ok) {
    return {
      ok: false,
      field: "notes",
      message: `Keep notes under ${NOTE_MAX_LENGTH} characters.`,
    };
  }

  return {
    ok: true,
    startedAt,
    nappyType: input.nappyType,
    notes: noteResult.notes,
    metadata: { nappy_type: input.nappyType },
  };
}

export function sleepDurationMs(
  startedAt: string,
  endedAt: string | null,
): number | null {
  if (!endedAt) return null;
  const start = new Date(startedAt).getTime();
  const end = new Date(endedAt).getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) {
    return null;
  }
  return end - start;
}

export function formatDuration(ms: number): string {
  if (ms < 0 || !Number.isFinite(ms)) return "—";
  const totalMinutes = Math.round(ms / 60000);
  if (totalMinutes < 1) return "under a minute";
  if (totalMinutes < 60) {
    return totalMinutes === 1 ? "1 min" : `${totalMinutes} min`;
  }
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (minutes === 0) {
    return hours === 1 ? "1 hr" : `${hours} hr`;
  }
  return `${hours} hr ${minutes} min`;
}

export function readNappyType(metadata: Json | null | undefined): NappyType | null {
  if (!isRecord(metadata)) return null;
  const value = metadata.nappy_type;
  if (value === "wet" || value === "dirty" || value === "both") {
    return value;
  }
  return null;
}

export function rowToActivityItem(
  row: Pick<
    BabyEventRow,
    | "id"
    | "baby_id"
    | "parent_id"
    | "event_type"
    | "started_at"
    | "ended_at"
    | "amount_ml"
    | "side"
    | "notes"
    | "metadata"
  >,
): BabyActivityItem | null {
  const kind = activityKindFromEvent(row.event_type, row.metadata);
  if (!kind) return null;

  return {
    id: row.id,
    babyId: row.baby_id,
    parentId: row.parent_id,
    kind,
    eventType: row.event_type,
    startedAt: row.started_at,
    endedAt: row.ended_at,
    amountMl: row.amount_ml,
    side: row.side,
    notes: row.notes,
    nappyType: kind === "nappy" ? readNappyType(row.metadata) : null,
    feedingKind:
      kind === "feeding"
        ? eventTypeToFeedingKind(row.event_type, row.metadata)
        : null,
    status: "confirmed",
    clientKey: row.id,
  };
}

/**
 * Compute today’s calm summary from a set of activity items.
 * Sleep overlapping the Australian day is clipped to day bounds.
 */
export function computeTodaySummary(
  items: BabyActivityItem[],
  at: Date = new Date(),
): TodaySummary {
  const { date, startIso, endIso } = australianDayBounds(at);
  const startMs = new Date(startIso).getTime();
  const endMs = new Date(endIso).getTime();

  let feedCount = 0;
  let sleepMs = 0;
  let nappyCount = 0;
  let mostRecent: BabyActivityItem | null = null;

  for (const item of items) {
    const started = new Date(item.startedAt).getTime();
    if (!Number.isFinite(started)) continue;

    if (item.kind === "feeding") {
      if (started >= startMs && started < endMs) {
        feedCount += 1;
        mostRecent = pickMoreRecent(mostRecent, item);
      }
      continue;
    }

    if (item.kind === "nappy") {
      if (started >= startMs && started < endMs) {
        nappyCount += 1;
        mostRecent = pickMoreRecent(mostRecent, item);
      }
      continue;
    }

    if (item.kind === "sleep") {
      if (!item.endedAt) continue;
      const ended = new Date(item.endedAt).getTime();
      if (!Number.isFinite(ended) || ended < started) continue;

      const overlapStart = Math.max(started, startMs);
      const overlapEnd = Math.min(ended, endMs);
      if (overlapEnd > overlapStart) {
        sleepMs += overlapEnd - overlapStart;
        // Count sleep in “most recent” if it started or ended today
        if (
          (started >= startMs && started < endMs) ||
          (ended > startMs && ended <= endMs)
        ) {
          mostRecent = pickMoreRecent(mostRecent, item);
        }
      }
    }
  }

  return { date, feedCount, sleepMs, nappyCount, mostRecent };
}

export function compareActivityDesc(
  a: Pick<BabyActivityItem, "startedAt" | "id">,
  b: Pick<BabyActivityItem, "startedAt" | "id">,
): number {
  if (a.startedAt > b.startedAt) return -1;
  if (a.startedAt < b.startedAt) return 1;
  if (a.id > b.id) return -1;
  if (a.id < b.id) return 1;
  return 0;
}

export function sortActivityNewestFirst(
  items: BabyActivityItem[],
): BabyActivityItem[] {
  return [...items].sort(compareActivityDesc);
}

export function paginateActivity(
  items: BabyActivityItem[],
  pageSize: number,
  before?: { startedAt: string; id: string },
): { page: BabyActivityItem[]; hasMore: boolean } {
  const sorted = sortActivityNewestFirst(items);
  let filtered = sorted;
  if (before) {
    filtered = sorted.filter((item) => {
      if (item.startedAt < before.startedAt) return true;
      if (item.startedAt > before.startedAt) return false;
      return item.id < before.id;
    });
  }
  const page = filtered.slice(0, pageSize);
  return { page, hasMore: filtered.length > pageSize };
}

export function activityTitle(item: BabyActivityItem): string {
  if (item.kind === "feeding") {
    const label =
      FEEDING_KIND_OPTIONS.find((o) => o.value === item.feedingKind)?.label ??
      "Feed";
    return label;
  }
  if (item.kind === "sleep") return "Sleep";
  if (item.kind === "nappy") {
    const label =
      NAPPY_TYPE_OPTIONS.find((o) => o.value === item.nappyType)?.label ??
      "Nappy";
    return `Nappy · ${label}`;
  }
  return "Activity";
}

export function activityDetail(item: BabyActivityItem): string | null {
  const parts: string[] = [];

  if (item.kind === "feeding") {
    if (item.amountMl != null) parts.push(`${item.amountMl} ml`);
    if (item.side && item.side !== "none") {
      parts.push(
        item.side === "both"
          ? "both sides"
          : item.side === "left"
            ? "left"
            : "right",
      );
    }
  }

  if (item.kind === "sleep" && item.endedAt) {
    const ms = sleepDurationMs(item.startedAt, item.endedAt);
    if (ms != null) parts.push(formatDuration(ms));
  }

  if (item.notes) parts.push(item.notes);

  return parts.length > 0 ? parts.join(" · ") : null;
}

export function feedingMethodLabel(
  method: string | null | undefined,
): string | null {
  if (!method) return null;
  switch (method) {
    case "breastfeeding":
      return "Breastfeeding";
    case "bottle":
      return "Bottle";
    case "mixed":
      return "Mixed feeding";
    case "solids":
      return "Solids";
    case "other":
      return "Other";
    default:
      return null;
  }
}

export function formatPrivateDate(date: string | null): string | null {
  if (!date) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(date.trim());
  if (!match) return null;
  const d = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  return new Intl.DateTimeFormat("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(d);
}

function parseInstant(value: string): string | null {
  if (!value || !value.trim()) return null;
  // datetime-local often comes without Z — treat as local wall time
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString();
}

function isRecord(value: Json | null | undefined): value is {
  [key: string]: Json | undefined;
} {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function pickMoreRecent(
  current: BabyActivityItem | null,
  candidate: BabyActivityItem,
): BabyActivityItem {
  if (!current) return candidate;
  return compareActivityDesc(candidate, current) < 0 ? candidate : current;
}

/** Convert Date to datetime-local value in local timezone. */
export function toDatetimeLocalValue(date: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** Australian timezone for Baby “today” summaries — matches Circle prompts. */
export const BABY_TIMEZONE = "Australia/Sydney";

/**
 * Resolve Australian calendar date string (YYYY-MM-DD) from a UTC instant.
 * DST-aware via Intl.
 */
export function australianDateString(at: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: BABY_TIMEZONE,
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

/**
 * UTC bounds for an Australia/Sydney calendar day [start, end).
 */
export function australianDayBounds(
  at: Date = new Date(),
): { startIso: string; endIso: string; date: string } {
  const date = australianDateString(at);
  const startMs = findSydneyMidnightUtc(date);
  const endMs = findSydneyMidnightUtc(addCalendarDays(date, 1));

  return {
    date,
    startIso: new Date(startMs).toISOString(),
    endIso: new Date(endMs).toISOString(),
  };
}

function addCalendarDays(date: string, days: number): string {
  const [y, m, d] = date.split("-").map(Number);
  const utc = Date.UTC(y, m - 1, d + days);
  const next = new Date(utc);
  const year = next.getUTCFullYear();
  const month = String(next.getUTCMonth() + 1).padStart(2, "0");
  const day = String(next.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * UTC ms for the first instant of an Australia/Sydney calendar date.
 */
function findSydneyMidnightUtc(date: string): number {
  const [y, m, d] = date.split("-").map(Number);
  let low = Date.UTC(y, m - 1, d - 1, 12, 0, 0);
  let high = Date.UTC(y, m - 1, d, 16, 0, 0);

  while (high - low > 1) {
    const mid = Math.floor((low + high) / 2);
    if (australianDateString(new Date(mid)) < date) {
      low = mid;
    } else {
      high = mid;
    }
  }

  return high;
}

/**
 * Format a calm relative/absolute timestamp in Australia/Sydney.
 */
export function formatActivityTime(
  iso: string,
  now: Date = new Date(),
): string {
  const at = new Date(iso);
  if (Number.isNaN(at.getTime())) return "";

  const sameDay =
    australianDateString(at) === australianDateString(now);

  const time = new Intl.DateTimeFormat("en-AU", {
    timeZone: BABY_TIMEZONE,
    hour: "numeric",
    minute: "2-digit",
  }).format(at);

  if (sameDay) {
    return time;
  }

  const day = new Intl.DateTimeFormat("en-AU", {
    timeZone: BABY_TIMEZONE,
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(at);

  return `${day} · ${time}`;
}

