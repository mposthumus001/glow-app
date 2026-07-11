import { TonightScreen } from "@/components/tonight";
import { circlePreviewFromLoad } from "@/components/tonight/tonightCirclePreview";
import { loadAssignedCircleForParent } from "@/features/circles/service/CircleRepository";
import { requireAppUser } from "@/lib/auth/require-app-user";

export default async function TonightPage() {
  const { user, parent } = await requireAppUser();
  const circleResult = await loadAssignedCircleForParent(user.id);
  const circlePreview = circlePreviewFromLoad(circleResult);

  return (
    <TonightScreen
      displayName={parent.display_name}
      circlePreview={circlePreview}
    />
  );
}
