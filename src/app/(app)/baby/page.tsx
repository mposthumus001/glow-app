import { BabyScreen } from "@/features/baby";
import {
  loadBabiesForFamily,
  loadBabyTrackingBundle,
} from "@/features/baby/tracking/eventApi";
import { computeTodaySummary } from "@/features/baby/tracking/eventLogic";
import { requireAppUser } from "@/lib/auth/require-app-user";
import { createClient } from "@/lib/supabase/server";

export default async function BabyPage() {
  const { user, parent } = await requireAppUser();
  const supabase = await createClient();

  if (!parent.family_id) {
    return (
      <BabyScreen
        babies={[]}
        parentId={user.id}
        initialSummary={computeTodaySummary([])}
        initialRecent={[]}
        initialHasMore={false}
        initialError={null}
      />
    );
  }

  const { babies, error: babiesError } = await loadBabiesForFamily(
    supabase,
    parent.family_id,
  );

  const primary = babies[0] ?? null;

  if (!primary) {
    return (
      <BabyScreen
        babies={[]}
        parentId={user.id}
        initialSummary={computeTodaySummary([])}
        initialRecent={[]}
        initialHasMore={false}
        initialError={babiesError}
      />
    );
  }

  const bundle = await loadBabyTrackingBundle(supabase, primary.id);

  return (
    <BabyScreen
      babies={babies}
      parentId={user.id}
      initialSummary={bundle.summary}
      initialRecent={bundle.recent}
      initialHasMore={bundle.hasMore}
      initialError={bundle.error ?? babiesError}
    />
  );
}
