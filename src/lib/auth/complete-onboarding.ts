"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import type {
  AuState,
  FeedingMethod,
  MapVisibility,
} from "@/lib/supabase/database.types";
import { assignParentToBestCircle } from "@/features/circles/service/CircleAssignmentRepository";
import {
  postOnboardingRedirectPath,
  shouldFailOnboardingForAssignment,
} from "@/features/circles/assignment/assignmentLogic";
import { createClient } from "@/lib/supabase/server";

export type OnboardingState = {
  error?: string;
  success?: boolean;
};

function asString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function isAuState(value: string): value is AuState {
  return ["NSW", "VIC", "QLD", "WA", "SA", "TAS", "ACT", "NT"].includes(value);
}

function isFeedingMethod(value: string): value is FeedingMethod {
  return ["breastfeeding", "bottle", "mixed", "solids", "other"].includes(
    value,
  );
}

function isMapVisibility(value: string): value is MapVisibility {
  return ["hidden", "state_only", "suburb_area"].includes(value);
}

export async function completeOnboarding(
  _prev: OnboardingState,
  formData: FormData,
): Promise<OnboardingState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You need to be signed in to continue." };
  }

  const displayName = asString(formData, "display_name");
  const state = asString(formData, "state");
  const suburbAreaRaw = asString(formData, "suburb_area");
  const feedingMethod = asString(formData, "feeding_method");
  const firstChildRaw = asString(formData, "first_child");
  const mapVisibility = asString(formData, "map_visibility");
  const babyName = asString(formData, "baby_name");
  const dateOfBirth = asString(formData, "date_of_birth");
  const dueDate = asString(formData, "due_date");

  if (!displayName || displayName.length > 80) {
    return { error: "Please enter a display name (1–80 characters)." };
  }

  if (displayName.toLowerCase() === "new parent") {
    return { error: "Please choose a name that feels like you." };
  }

  if (!isAuState(state)) {
    return { error: "Please select your state." };
  }

  if (!isFeedingMethod(feedingMethod)) {
    return { error: "Please select a feeding method." };
  }

  if (!isMapVisibility(mapVisibility)) {
    return { error: "Please choose a map visibility option." };
  }

  if (firstChildRaw !== "true" && firstChildRaw !== "false") {
    return { error: "Please tell us if this is your first child." };
  }

  const suburbArea =
    mapVisibility === "suburb_area" && suburbAreaRaw
      ? suburbAreaRaw.slice(0, 80)
      : null;

  if (mapVisibility === "suburb_area" && suburbAreaRaw && !suburbArea) {
    return { error: "Suburb area looks invalid." };
  }

  if (babyName && !dateOfBirth && !dueDate) {
    return {
      error: "Add a date of birth or due date for your baby, or clear the name.",
    };
  }

  if ((dateOfBirth || dueDate) && !babyName) {
    return { error: "Please add a baby name, or clear the baby dates." };
  }

  const { data: parent, error: parentFetchError } = await supabase
    .from("parents")
    .select("id, family_id")
    .eq("id", user.id)
    .maybeSingle();

  if (parentFetchError || !parent) {
    return { error: "Could not load your parent profile. Try again." };
  }

  if (!parent.family_id) {
    return { error: "Your family profile is missing. Contact support." };
  }

  const { error: parentUpdateError } = await supabase
    .from("parents")
    .update({
      display_name: displayName,
      state,
      suburb_area: suburbArea,
      feeding_method: feedingMethod,
      first_child: firstChildRaw === "true",
      map_visibility: mapVisibility,
    })
    .eq("id", user.id);

  if (parentUpdateError) {
    return { error: parentUpdateError.message };
  }

  const { error: preferencesError } = await supabase
    .from("preferences")
    .update({ map_visibility_default: mapVisibility })
    .eq("parent_id", user.id);

  if (preferencesError) {
    return { error: preferencesError.message };
  }

  const { error: presenceError } = await supabase
    .from("presence")
    .update({
      state,
      suburb_area: suburbArea,
      map_visibility: mapVisibility,
      approximate_lat: null,
      approximate_lng: null,
    })
    .eq("parent_id", user.id);

  if (presenceError) {
    return { error: presenceError.message };
  }

  if (babyName && (dateOfBirth || dueDate)) {
    const { error: babyError } = await supabase.from("babies").insert({
      parent_id: user.id,
      family_id: parent.family_id,
      name: babyName.slice(0, 80),
      date_of_birth: dateOfBirth || null,
      due_date: dueDate || null,
      feeding_method: feedingMethod,
    });

    if (babyError) {
      return { error: babyError.message };
    }
  }

  // Profile + baby are committed. Assignment must not roll back onboarding.
  const assignment = await assignParentToBestCircle(supabase, user.id);
  if (shouldFailOnboardingForAssignment(assignment)) {
    return { error: "We couldn't finish matching your Circle. Please try again." };
  }

  revalidatePath("/");
  revalidatePath("/circle");
  redirect(postOnboardingRedirectPath());
}
