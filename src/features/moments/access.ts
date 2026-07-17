import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/supabase/database.types";

import type { BabyMomentsContext } from "./types";

export async function loadBabyForMoments(
  supabase: SupabaseClient<Database>,
  babyId: string,
  familyId: string,
): Promise<BabyMomentsContext | null> {
  const trimmed = babyId.trim();
  if (!trimmed) return null;

  const { data, error } = await supabase
    .from("babies")
    .select("id, name, date_of_birth, due_date, family_id")
    .eq("id", trimmed)
    .eq("family_id", familyId)
    .is("deleted_at", null)
    .maybeSingle();

  if (error || !data) return null;

  return {
    babyId: data.id,
    babyName: data.name,
    dateOfBirth: data.date_of_birth,
    dueDate: data.due_date,
  };
}

export async function verifyMomentAccess(
  supabase: SupabaseClient<Database>,
  momentId: string,
  ownerId: string,
  babyId: string,
): Promise<boolean> {
  const trimmedMoment = momentId.trim();
  const trimmedBaby = babyId.trim();
  if (!trimmedMoment || !trimmedBaby) return false;

  const { data: moment, error: momentError } = await supabase
    .from("moments")
    .select("id")
    .eq("id", trimmedMoment)
    .eq("owner_parent_id", ownerId)
    .is("deleted_at", null)
    .maybeSingle();

  if (momentError || !moment) return false;

  const { data: link, error: linkError } = await supabase
    .from("moment_children")
    .select("baby_id")
    .eq("moment_id", trimmedMoment)
    .eq("baby_id", trimmedBaby)
    .maybeSingle();

  return !linkError && Boolean(link);
}
