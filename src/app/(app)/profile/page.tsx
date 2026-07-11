import { ProfileHome } from "@/features/profile";
import { loadAssignedCircleForParent } from "@/features/circles/service/CircleRepository";
import { requireAppUser } from "@/lib/auth/require-app-user";
import { createClient } from "@/lib/supabase/server";
import type { MapVisibility } from "@/lib/supabase/database.types";
import { formatBabyAgeLine } from "@/lib/utils/baby-age";
import { APP_VERSION } from "@/lib/app-version";

function mapVisibilityLabel(value: MapVisibility): string {
  switch (value) {
    case "hidden":
      return "Hidden from the map";
    case "state_only":
      return "State — approximate";
    case "suburb_area":
      return "Suburb area — approximate";
    default:
      return "Privacy-safe map visibility";
  }
}

export default async function ProfilePage() {
  const { user, parent } = await requireAppUser();
  const supabase = await createClient();

  const [{ data: baby }, circleResult] = await Promise.all([
    supabase
      .from("babies")
      .select("name, date_of_birth, due_date")
      .eq("parent_id", user.id)
      .is("deleted_at", null)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle(),
    loadAssignedCircleForParent(user.id),
  ]);

  const babySummary = baby
    ? formatBabyAgeLine({
        name: baby.name,
        dateOfBirth: baby.date_of_birth,
        dueDate: baby.due_date,
      }) ?? baby.name
    : null;

  const circleSummary =
    circleResult.status === "assigned"
      ? circleResult.data.circle.name
      : circleResult.status === "unassigned"
        ? "Your Circle is on its way"
        : null;

  return (
    <ProfileHome
      displayName={parent.display_name}
      email={user.email ?? null}
      mapVisibilityLabel={mapVisibilityLabel(parent.map_visibility)}
      babySummary={babySummary}
      circleSummary={circleSummary}
      appVersion={APP_VERSION}
    />
  );
}
