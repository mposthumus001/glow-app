import { redirect } from "next/navigation";

import { CircleScreen } from "@/features/circles/components/CircleScreen";
import { loadAssignedCircleWithAssignment } from "@/features/circles/service/CircleRepository";
import { loadCircleDailyPrompt } from "@/features/circles/service/PromptRepository";
import { loadCircleNavUnreadHint } from "@/features/circles/service/ReadStateRepository";
import { isParentOnboarded } from "@/lib/auth/onboarding";
import { createClient } from "@/lib/supabase/server";

export default async function CirclePage() {
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

  const result = await loadAssignedCircleWithAssignment(user.id);
  const circleNavHint = await loadCircleNavUnreadHint(user.id);

  let dailyPrompt = null;
  let promptUnavailable = false;

  if (result.status === "assigned") {
    dailyPrompt = await loadCircleDailyPrompt(result.data.circle.id);
    promptUnavailable = dailyPrompt == null;
  }

  return (
    <CircleScreen
      result={result}
      parentId={user.id}
      displayName={parent.display_name}
      circleNavHint={circleNavHint}
      dailyPrompt={dailyPrompt}
      promptUnavailable={promptUnavailable}
    />
  );
}
