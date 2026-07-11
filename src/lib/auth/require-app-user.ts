import { redirect } from "next/navigation";

import { isParentOnboarded } from "@/lib/auth/onboarding";
import { createClient } from "@/lib/supabase/server";
import type { ParentRow } from "@/lib/supabase/database.types";
import type { User } from "@supabase/supabase-js";

export type AppUserSession = {
  user: User;
  parent: ParentRow;
};

/**
 * Server guard for authenticated, onboarded app routes.
 * Redirects unauthenticated users to /login and incomplete profiles to /onboarding.
 */
export async function requireAppUser(): Promise<AppUserSession> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: parent } = await supabase
    .from("parents")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (!parent || !isParentOnboarded(parent)) {
    redirect("/onboarding");
  }

  return { user, parent };
}
