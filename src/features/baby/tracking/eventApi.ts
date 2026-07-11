import type { SupabaseClient } from "@supabase/supabase-js";

import type {
  BabyEventRow,
  BabyEventType,
  Database,
  FeedSide,
  Json,
  NappyType,
} from "@/lib/supabase/database.types";

import type {
  ActivityCursor,
  ActivityPageResult,
  BabyActivityItem,
  BabyProfile,
  FeedingKind,
  TodaySummary,
} from "../types";
import {
  ACTIVITY_PAGE_SIZE,
  activityKindFromEvent,
  computeTodaySummary,
  rowToActivityItem,
  sortActivityNewestFirst,
  validateFeedingInput,
  validateNappyInput,
  validateSleepInput,
  australianDayBounds,
} from "./eventLogic";

export type GlowSupabaseClient = SupabaseClient<Database>;

const EVENT_SELECT =
  "id, parent_id, baby_id, family_id, event_type, started_at, ended_at, amount_ml, side, notes, metadata, created_at, updated_at, deleted_at";

const TRACKING_TYPES: BabyEventType[] = [
  "breastfeed",
  "bottle_feed",
  "pump",
  "formula",
  "expressed_milk",
  "solids",
  "sleep",
  "nappy",
  "note",
];

export async function loadBabiesForFamily(
  supabase: GlowSupabaseClient,
  familyId: string,
): Promise<{ babies: BabyProfile[]; error: string | null }> {
  const { data, error } = await supabase
    .from("babies")
    .select(
      "id, name, date_of_birth, due_date, feeding_method, family_id, created_at",
    )
    .eq("family_id", familyId)
    .is("deleted_at", null)
    .order("created_at", { ascending: true });

  if (error) {
    return { babies: [], error: error.message };
  }

  const babies: BabyProfile[] = (data ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    dateOfBirth: row.date_of_birth,
    dueDate: row.due_date,
    feedingMethod: row.feeding_method,
    familyId: row.family_id,
  }));

  return { babies, error: null };
}

export async function fetchBabyActivityPage(
  supabase: GlowSupabaseClient,
  input: {
    babyId: string;
    limit?: number;
    before?: ActivityCursor;
  },
): Promise<ActivityPageResult> {
  const limit = input.limit ?? ACTIVITY_PAGE_SIZE;

  let query = supabase
    .from("baby_events")
    .select(EVENT_SELECT)
    .eq("baby_id", input.babyId)
    .is("deleted_at", null)
    .in("event_type", TRACKING_TYPES)
    .order("started_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(limit + 1);

  if (input.before) {
    query = query.lte("started_at", input.before.startedAt);
  }

  const { data, error } = await query;

  if (error) {
    return { items: [], hasMore: false, error: error.message };
  }

  let rows = (data ?? []) as BabyEventRow[];

  if (input.before) {
    const { startedAt, id } = input.before;
    rows = rows.filter((row) => {
      if (row.started_at < startedAt) return true;
      if (row.started_at > startedAt) return false;
      return row.id < id;
    });
  }

  const hasMore = rows.length > limit;
  const pageRows = hasMore ? rows.slice(0, limit) : rows;

  const items = pageRows
    .map((row) => rowToActivityItem(row))
    .filter((item): item is BabyActivityItem => item != null);

  return { items, hasMore, error: null };
}

/**
 * Load events that may contribute to today’s summary.
 * Includes sleep that could overlap the Australian day window.
 */
export async function fetchTodayRelevantEvents(
  supabase: GlowSupabaseClient,
  babyId: string,
  at: Date = new Date(),
): Promise<{ items: BabyActivityItem[]; error: string | null }> {
  const { startIso, endIso } = australianDayBounds(at);
  // Sleep may have started before midnight — look back 24h
  const lookback = new Date(
    new Date(startIso).getTime() - 24 * 60 * 60 * 1000,
  ).toISOString();

  const { data, error } = await supabase
    .from("baby_events")
    .select(EVENT_SELECT)
    .eq("baby_id", babyId)
    .is("deleted_at", null)
    .in("event_type", TRACKING_TYPES)
    .gte("started_at", lookback)
    .lt("started_at", endIso)
    .order("started_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(200);

  if (error) {
    return { items: [], error: error.message };
  }

  // Also include sleep that started before lookback but ended today
  const { data: overlappingSleep, error: sleepError } = await supabase
    .from("baby_events")
    .select(EVENT_SELECT)
    .eq("baby_id", babyId)
    .is("deleted_at", null)
    .eq("event_type", "sleep")
    .lt("started_at", lookback)
    .gte("ended_at", startIso)
    .limit(50);

  if (sleepError) {
    return { items: [], error: sleepError.message };
  }

  const byId = new Map<string, BabyEventRow>();
  for (const row of [...(data ?? []), ...(overlappingSleep ?? [])] as BabyEventRow[]) {
    byId.set(row.id, row);
  }

  const items = [...byId.values()]
    .map((row) => rowToActivityItem(row))
    .filter((item): item is BabyActivityItem => item != null);

  return { items: sortActivityNewestFirst(items), error: null };
}

export async function loadBabyTrackingBundle(
  supabase: GlowSupabaseClient,
  babyId: string,
  at: Date = new Date(),
): Promise<{
  summary: TodaySummary;
  recent: BabyActivityItem[];
  hasMore: boolean;
  error: string | null;
}> {
  const [todayResult, pageResult] = await Promise.all([
    fetchTodayRelevantEvents(supabase, babyId, at),
    fetchBabyActivityPage(supabase, { babyId }),
  ]);

  if (todayResult.error || pageResult.error) {
    return {
      summary: computeTodaySummary([], at),
      recent: [],
      hasMore: false,
      error: todayResult.error ?? pageResult.error,
    };
  }

  return {
    summary: computeTodaySummary(todayResult.items, at),
    recent: pageResult.items,
    hasMore: pageResult.hasMore,
    error: null,
  };
}

export type CreateFeedingResult =
  | { ok: true; item: BabyActivityItem }
  | { ok: false; field?: string; message: string };

export async function createFeedingEvent(
  supabase: GlowSupabaseClient,
  input: {
    babyId: string;
    familyId: string;
    parentId: string;
    kind: FeedingKind | null;
    startedAt: string;
    amountMl?: string | number | null;
    side?: FeedSide | null;
    notes?: string | null;
  },
): Promise<CreateFeedingResult> {
  const validated = validateFeedingInput(input);
  if (!validated.ok) {
    return {
      ok: false,
      field: validated.field,
      message: validated.message,
    };
  }

  const { data, error } = await supabase
    .from("baby_events")
    .insert({
      parent_id: input.parentId,
      baby_id: input.babyId,
      family_id: input.familyId,
      event_type: validated.eventType,
      started_at: validated.startedAt,
      ended_at: null,
      amount_ml: validated.amountMl,
      side: validated.side,
      notes: validated.notes,
      metadata: validated.metadata,
    })
    .select(EVENT_SELECT)
    .single();

  if (error || !data) {
    return {
      ok: false,
      message: "We couldn’t save that feed just now. Please try again.",
    };
  }

  const item = rowToActivityItem(data as BabyEventRow);
  if (!item) {
    return { ok: false, message: "Saved, but we couldn’t display it yet." };
  }

  return { ok: true, item };
}

export async function createSleepEvent(
  supabase: GlowSupabaseClient,
  input: {
    babyId: string;
    familyId: string;
    parentId: string;
    startedAt: string;
    endedAt: string;
    notes?: string | null;
  },
): Promise<CreateFeedingResult> {
  const validated = validateSleepInput(input);
  if (!validated.ok) {
    return {
      ok: false,
      field: validated.field,
      message: validated.message,
    };
  }

  const { data, error } = await supabase
    .from("baby_events")
    .insert({
      parent_id: input.parentId,
      baby_id: input.babyId,
      family_id: input.familyId,
      event_type: "sleep" as BabyEventType,
      started_at: validated.startedAt,
      ended_at: validated.endedAt,
      amount_ml: null,
      side: null,
      notes: validated.notes,
      metadata: {},
    })
    .select(EVENT_SELECT)
    .single();

  if (error || !data) {
    return {
      ok: false,
      message: "We couldn’t save that sleep just now. Please try again.",
    };
  }

  const item = rowToActivityItem(data as BabyEventRow);
  if (!item) {
    return { ok: false, message: "Saved, but we couldn’t display it yet." };
  }

  return { ok: true, item };
}

export async function createNappyEvent(
  supabase: GlowSupabaseClient,
  input: {
    babyId: string;
    familyId: string;
    parentId: string;
    nappyType: NappyType | null;
    startedAt: string;
    notes?: string | null;
  },
): Promise<CreateFeedingResult> {
  const validated = validateNappyInput(input);
  if (!validated.ok) {
    return {
      ok: false,
      field: validated.field,
      message: validated.message,
    };
  }

  const { data, error } = await supabase
    .from("baby_events")
    .insert({
      parent_id: input.parentId,
      baby_id: input.babyId,
      family_id: input.familyId,
      event_type: "nappy" as BabyEventType,
      started_at: validated.startedAt,
      ended_at: null,
      amount_ml: null,
      side: null,
      notes: validated.notes,
      metadata: validated.metadata,
    })
    .select(EVENT_SELECT)
    .single();

  if (error || !data) {
    return {
      ok: false,
      message: "We couldn’t save that nappy just now. Please try again.",
    };
  }

  const item = rowToActivityItem(data as BabyEventRow);
  if (!item) {
    return { ok: false, message: "Saved, but we couldn’t display it yet." };
  }

  return { ok: true, item };
}

export async function softDeleteBabyEvent(
  supabase: GlowSupabaseClient,
  eventId: string,
): Promise<{ ok: boolean; message?: string }> {
  const { error } = await supabase
    .from("baby_events")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", eventId)
    .is("deleted_at", null);

  if (error) {
    return {
      ok: false,
      message: "We couldn’t remove that just now. Please try again.",
    };
  }

  return { ok: true };
}

export async function updateBabyEvent(
  supabase: GlowSupabaseClient,
  input: {
    eventId: string;
    kind: "feeding" | "sleep" | "nappy";
    feedingKind?: FeedingKind | null;
    nappyType?: NappyType | null;
    startedAt: string;
    endedAt?: string;
    amountMl?: string | number | null;
    side?: FeedSide | null;
    notes?: string | null;
  },
): Promise<CreateFeedingResult> {
  if (input.kind === "feeding") {
    const validated = validateFeedingInput({
      kind: input.feedingKind ?? null,
      startedAt: input.startedAt,
      amountMl: input.amountMl,
      side: input.side,
      notes: input.notes,
    });
    if (!validated.ok) {
      return {
        ok: false,
        field: validated.field,
        message: validated.message,
      };
    }

    const { data, error } = await supabase
      .from("baby_events")
      .update({
        event_type: validated.eventType,
        started_at: validated.startedAt,
        ended_at: null,
        amount_ml: validated.amountMl,
        side: validated.side,
        notes: validated.notes,
        metadata: validated.metadata,
      })
      .eq("id", input.eventId)
      .is("deleted_at", null)
      .select(EVENT_SELECT)
      .single();

    if (error || !data) {
      return {
        ok: false,
        message: "We couldn’t update that just now. Please try again.",
      };
    }

    const item = rowToActivityItem(data as BabyEventRow);
    if (!item) {
      return { ok: false, message: "Updated, but we couldn’t display it yet." };
    }
    return { ok: true, item };
  }

  if (input.kind === "sleep") {
    const validated = validateSleepInput({
      startedAt: input.startedAt,
      endedAt: input.endedAt ?? "",
      notes: input.notes,
    });
    if (!validated.ok) {
      return {
        ok: false,
        field: validated.field,
        message: validated.message,
      };
    }

    const { data, error } = await supabase
      .from("baby_events")
      .update({
        event_type: "sleep",
        started_at: validated.startedAt,
        ended_at: validated.endedAt,
        amount_ml: null,
        side: null,
        notes: validated.notes,
        metadata: {},
      })
      .eq("id", input.eventId)
      .is("deleted_at", null)
      .select(EVENT_SELECT)
      .single();

    if (error || !data) {
      return {
        ok: false,
        message: "We couldn’t update that just now. Please try again.",
      };
    }

    const item = rowToActivityItem(data as BabyEventRow);
    if (!item) {
      return { ok: false, message: "Updated, but we couldn’t display it yet." };
    }
    return { ok: true, item };
  }

  const validated = validateNappyInput({
    nappyType: input.nappyType ?? null,
    startedAt: input.startedAt,
    notes: input.notes,
  });
  if (!validated.ok) {
    return {
      ok: false,
      field: validated.field,
      message: validated.message,
    };
  }

  const { data, error } = await supabase
    .from("baby_events")
    .update({
      event_type: "nappy",
      started_at: validated.startedAt,
      ended_at: null,
      amount_ml: null,
      side: null,
      notes: validated.notes,
      metadata: validated.metadata,
    })
    .eq("id", input.eventId)
    .is("deleted_at", null)
    .select(EVENT_SELECT)
    .single();

  if (error || !data) {
    return {
      ok: false,
      message: "We couldn’t update that just now. Please try again.",
    };
  }

  const item = rowToActivityItem(data as BabyEventRow);
  if (!item) {
    return { ok: false, message: "Updated, but we couldn’t display it yet." };
  }
  return { ok: true, item };
}

export function isTrackingEventVisible(
  eventType: BabyEventType,
  metadata: Json | null | undefined,
): boolean {
  return activityKindFromEvent(eventType, metadata) != null;
}
