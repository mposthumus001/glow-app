import { OnboardingForm } from "@/components/onboarding/OnboardingForm";
import { isParentOnboarded } from "@/lib/auth/onboarding";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function OnboardingPage() {
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

  if (isParentOnboarded(parent)) {
    redirect("/");
  }

  return (
    <OnboardingForm
      defaultDisplayName={parent?.display_name}
      defaultState={parent?.state}
    />
  );
}
