import type { AuState, MapVisibility } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/client";

import type { AppState, MapPresenceRow, PresenceLifecycleStatus } from "./types";
import { lifecycleToAppState } from "./types";

export type ParentPresenceProfile = {
  state: AuState;
  suburb_area: string | null;
  map_visibility: MapVisibility;
};

function nowIso(): string {
  return new Date().toISOString();
}

/** Coarse location only — never write approximate_lat/lng. */
function privacyFields(profile: ParentPresenceProfile) {
  const suburbArea =
    profile.map_visibility === "suburb_area" ? profile.suburb_area : null;

  return {
    state: profile.state,
    suburb_area: suburbArea,
    map_visibility: profile.map_visibility,
    approximate_lat: null,
    approximate_lng: null,
  };
}

export async function fetchParentPresenceProfile(
  parentId: string,
): Promise<ParentPresenceProfile | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("parents")
    .select("state, suburb_area, map_visibility")
    .eq("id", parentId)
    .maybeSingle();

  if (error || !data) return null;
  return data;
}

/**
 * Persist lifecycle to presence row.
 * Exact GPS is intentionally never written.
 */
export async function persistPresenceLifecycle(input: {
  parentId: string;
  profile: ParentPresenceProfile;
  lifecycle: PresenceLifecycleStatus;
}): Promise<{ error: string | null }> {
  const supabase = createClient();
  const appState: AppState = lifecycleToAppState(input.lifecycle);
  const online = input.lifecycle !== "offline";

  const { error } = await supabase.from("presence").upsert(
    {
      parent_id: input.parentId,
      ...privacyFields(input.profile),
      online_status: online,
      app_state: appState,
      last_seen_at: nowIso(),
    },
    { onConflict: "parent_id" },
  );

  return { error: error?.message ?? null };
}

/** Mark the signed-in parent offline. Safe to call before sign-out. */
export async function markPresenceOffline(
  parentId?: string,
): Promise<{ error: string | null }> {
  const supabase = createClient();

  let id = parentId;
  if (!id) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    id = user?.id;
  }

  if (!id) return { error: null };

  const { error } = await supabase
    .from("presence")
    .update({
      online_status: false,
      app_state: "offline",
      last_seen_at: nowIso(),
      approximate_lat: null,
      approximate_lng: null,
    })
    .eq("parent_id", id);

  return { error: error?.message ?? null };
}

/** Public map feed — never read raw presence for other parents. */
export async function fetchMapPresence(): Promise<{
  rows: MapPresenceRow[];
  error: string | null;
}> {
  const supabase = createClient();
  const { data, error } = await supabase.from("map_presence").select("*");

  if (error) {
    return { rows: [], error: error.message };
  }

  return {
    rows: (data ?? []) as MapPresenceRow[],
    error: null,
  };
}
