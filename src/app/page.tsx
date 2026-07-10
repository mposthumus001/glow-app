import { LoginForm } from "@/components/auth/LoginForm";
import { OnboardingForm } from "@/components/onboarding/OnboardingForm";
import { TonightScreen } from "@/components/tonight";
import { loadCircleNavUnreadHint } from "@/features/circles/service/ReadStateRepository";
import { isParentOnboarded } from "@/lib/auth/onboarding";
import { createClient } from "@/lib/supabase/server";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return <LoginForm />;
  }

  const { data: parent } = await supabase
    .from("parents")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (!parent || !isParentOnboarded(parent)) {
    return (
      <OnboardingForm
        defaultDisplayName={parent?.display_name}
        defaultState={parent?.state}
      />
    );
  }

  const circleNavHint = await loadCircleNavUnreadHint(user.id);

  return (
    <TonightScreen
      displayName={parent.display_name}
      circleNavHint={circleNavHint}
    />
  );
}
