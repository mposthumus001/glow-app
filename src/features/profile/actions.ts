"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import {
  validateAtlasPrivacy,
  validateBabyProfile,
  validateDeletionReason,
  validateFeedback,
  validateParentProfile,
} from "@/features/profile/validation";

export type ProfileActionState = {
  error?: string;
  success?: string;
};

function asString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { supabase, user: null as null, error: "Please sign in again." };
  }
  return { supabase, user, error: null as null };
}

export async function updateParentProfile(
  _prev: ProfileActionState,
  formData: FormData,
): Promise<ProfileActionState> {
  const { supabase, user, error } = await requireUser();
  if (error || !user) return { error: error ?? "Please sign in again." };

  const parsed = validateParentProfile({
    displayName: asString(formData, "display_name"),
    state: asString(formData, "state"),
    feedingMethod: asString(formData, "feeding_method"),
    firstChild: asString(formData, "first_child"),
  });
  if (!parsed.ok) return { error: parsed.error };

  const { error: updateError } = await supabase
    .from("parents")
    .update({
      display_name: parsed.value.displayName,
      state: parsed.value.state,
      feeding_method: parsed.value.feedingMethod,
      first_child: parsed.value.firstChild,
    })
    .eq("id", user.id);

  if (updateError) return { error: updateError.message };

  // Keep presence location fields aligned (never write GPS).
  await supabase
    .from("presence")
    .update({ state: parsed.value.state })
    .eq("parent_id", user.id);

  revalidatePath("/profile");
  revalidatePath("/profile/you");
  revalidatePath("/");
  return { success: "Your profile has been saved." };
}

export async function updateBabyProfile(
  _prev: ProfileActionState,
  formData: FormData,
): Promise<ProfileActionState> {
  const { supabase, user, error } = await requireUser();
  if (error || !user) return { error: error ?? "Please sign in again." };

  const parsed = validateBabyProfile({
    babyId: asString(formData, "baby_id"),
    name: asString(formData, "name"),
    dateOfBirth: asString(formData, "date_of_birth"),
    dueDate: asString(formData, "due_date"),
    feedingMethod: asString(formData, "feeding_method"),
  });
  if (!parsed.ok) return { error: parsed.error };

  const { data: parent } = await supabase
    .from("parents")
    .select("family_id")
    .eq("id", user.id)
    .maybeSingle();

  if (!parent?.family_id) {
    return { error: "Your family profile is missing." };
  }

  const { data: baby, error: babyFetchError } = await supabase
    .from("babies")
    .select("id, family_id")
    .eq("id", parsed.value.babyId)
    .is("deleted_at", null)
    .maybeSingle();

  if (babyFetchError || !baby) {
    return { error: "We couldn’t find that baby profile." };
  }

  if (baby.family_id !== parent.family_id) {
    return { error: "You can only edit babies in your family." };
  }

  const { error: updateError } = await supabase
    .from("babies")
    .update({
      name: parsed.value.name,
      date_of_birth: parsed.value.dateOfBirth,
      due_date: parsed.value.dueDate,
      feeding_method: parsed.value.feedingMethod,
    })
    .eq("id", parsed.value.babyId)
    .eq("family_id", parent.family_id);

  if (updateError) return { error: updateError.message };

  revalidatePath("/profile");
  revalidatePath("/profile/baby");
  revalidatePath("/baby");
  return { success: "Baby profile saved." };
}

export async function updateAtlasPrivacy(
  _prev: ProfileActionState,
  formData: FormData,
): Promise<ProfileActionState> {
  const { supabase, user, error } = await requireUser();
  if (error || !user) return { error: error ?? "Please sign in again." };

  const parsed = validateAtlasPrivacy({
    mapVisibility: asString(formData, "map_visibility"),
    suburbArea: asString(formData, "suburb_area"),
  });
  if (!parsed.ok) return { error: parsed.error };

  const { error: parentError } = await supabase
    .from("parents")
    .update({
      map_visibility: parsed.value.mapVisibility,
      suburb_area: parsed.value.suburbArea,
    })
    .eq("id", user.id);

  if (parentError) return { error: parentError.message };

  const { error: prefsError } = await supabase
    .from("preferences")
    .update({ map_visibility_default: parsed.value.mapVisibility })
    .eq("parent_id", user.id);

  if (prefsError) return { error: prefsError.message };

  const { error: presenceError } = await supabase
    .from("presence")
    .update({
      map_visibility: parsed.value.mapVisibility,
      suburb_area: parsed.value.suburbArea,
      approximate_lat: null,
      approximate_lng: null,
    })
    .eq("parent_id", user.id);

  if (presenceError) return { error: presenceError.message };

  revalidatePath("/profile");
  revalidatePath("/profile/atlas-privacy");
  revalidatePath("/");
  return { success: "Atlas privacy updated." };
}

export async function submitAppFeedback(
  _prev: ProfileActionState,
  formData: FormData,
): Promise<ProfileActionState> {
  const { supabase, user, error } = await requireUser();
  if (error || !user) return { error: error ?? "Please sign in again." };

  const parsed = validateFeedback({
    category: asString(formData, "category"),
    message: asString(formData, "message"),
    routeContext: asString(formData, "route_context") || undefined,
  });
  if (!parsed.ok) return { error: parsed.error };

  const { error: insertError } = await supabase.from("app_feedback").insert({
    parent_id: user.id,
    category: parsed.value.category,
    message: parsed.value.message,
    app_version: asString(formData, "app_version").slice(0, 40) || null,
    route_context: parsed.value.routeContext,
  });

  if (insertError) return { error: insertError.message };

  revalidatePath("/profile/help");
  return { success: "Thank you — we’ve received your note." };
}

export async function requestAccountDeletion(
  _prev: ProfileActionState,
  formData: FormData,
): Promise<ProfileActionState> {
  const { supabase, user, error } = await requireUser();
  if (error || !user) return { error: error ?? "Please sign in again." };

  const confirm = asString(formData, "confirm");
  if (confirm !== "DELETE") {
    return {
      error: "Type DELETE to confirm your request.",
    };
  }

  const reasonResult = validateDeletionReason(asString(formData, "reason"));
  if (!reasonResult.ok) return { error: reasonResult.error };

  const { data: existing } = await supabase
    .from("account_deletion_requests")
    .select("id, status")
    .eq("parent_id", user.id)
    .eq("status", "pending")
    .maybeSingle();

  if (existing) {
    return {
      success:
        "You already have a pending deletion request. We’ll process it manually during beta.",
    };
  }

  const { error: insertError } = await supabase
    .from("account_deletion_requests")
    .insert({
      parent_id: user.id,
      status: "pending",
      reason: reasonResult.value,
    });

  if (insertError) {
    if (insertError.code === "23505") {
      return {
        success:
          "You already have a pending deletion request. We’ll process it manually during beta.",
      };
    }
    return { error: insertError.message };
  }

  revalidatePath("/profile/account");
  return {
    success:
      "Deletion request received. During private beta we process these manually — you’ll hear from us if we need anything.",
  };
}

export async function cancelAccountDeletion(
  _prev: ProfileActionState,
  formData: FormData,
): Promise<ProfileActionState> {
  void _prev;
  void formData;
  const { supabase, user, error } = await requireUser();
  if (error || !user) return { error: error ?? "Please sign in again." };

  const { error: updateError } = await supabase
    .from("account_deletion_requests")
    .update({ status: "cancelled" })
    .eq("parent_id", user.id)
    .eq("status", "pending");

  if (updateError) return { error: updateError.message };

  revalidatePath("/profile/account");
  return { success: "Your deletion request has been cancelled." };
}

export async function sendPasswordResetEmail(): Promise<ProfileActionState> {
  const { supabase, user, error } = await requireUser();
  if (error || !user) return { error: error ?? "Please sign in again." };
  if (!user.email) {
    return { error: "No email is linked to this account." };
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");
  const origin =
    siteUrl ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null);

  const redirectTo = origin
    ? `${origin}/auth/callback?next=/profile/account`
    : undefined;

  const { error: resetError } = await supabase.auth.resetPasswordForEmail(
    user.email,
    redirectTo ? { redirectTo } : undefined,
  );

  if (resetError) return { error: resetError.message };

  return {
    success:
      "If this email can receive mail, a reset link is on its way. Check your inbox calmly — no rush.",
  };
}
