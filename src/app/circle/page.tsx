import { redirect } from "next/navigation";

import { CircleScreen } from "@/features/circles/components/CircleScreen";
import { loadAssignedCircleForParent } from "@/features/circles/service/CircleRepository";
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

  const result = await loadAssignedCircleForParent(user.id);

  return (
    <CircleScreen
      result={result}
      parentId={user.id}
      displayName={parent.display_name}
    />
  );
}
