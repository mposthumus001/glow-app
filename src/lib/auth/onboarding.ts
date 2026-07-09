import type { ParentRow } from "@/lib/supabase/database.types";

/** Signup trigger seeds display_name as "New parent" until onboarding completes. */
export const DEFAULT_DISPLAY_NAME = "New parent";

export function isParentOnboarded(parent: ParentRow | null | undefined): boolean {
  if (!parent || parent.deleted_at) return false;
  if (!parent.feeding_method) return false;
  if (parent.display_name.trim() === DEFAULT_DISPLAY_NAME) return false;
  return true;
}
