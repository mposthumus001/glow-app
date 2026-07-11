import { CircleScreen } from "@/features/circles/components/CircleScreen";
import { loadAssignedCircleWithAssignment } from "@/features/circles/service/CircleRepository";
import { loadCircleDailyPrompt } from "@/features/circles/service/PromptRepository";
import { requireAppUser } from "@/lib/auth/require-app-user";

export default async function CirclePage() {
  const { user, parent } = await requireAppUser();

  const result = await loadAssignedCircleWithAssignment(user.id);

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
      dailyPrompt={dailyPrompt}
      promptUnavailable={promptUnavailable}
    />
  );
}
