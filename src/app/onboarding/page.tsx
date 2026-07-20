import { OnboardingForm } from "@/components/onboarding/OnboardingForm";
import { isParentOnboarded } from "@/lib/auth/onboarding";
import { safeAuthNextPath } from "@/lib/auth/safe-auth-next";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const params = await searchParams;
  const nextPath = safeAuthNextPath(params.next);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(
      nextPath === "/"
        ? "/login"
        : `/login?next=${encodeURIComponent(nextPath)}`,
    );
  }

  const { data: parent } = await supabase
    .from("parents")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (isParentOnboarded(parent)) {
    redirect(nextPath);
  }

  return (
    <OnboardingForm
      defaultDisplayName={parent?.display_name}
      defaultState={parent?.state}
      nextPath={params.next ? nextPath : undefined}
    />
  );
}
