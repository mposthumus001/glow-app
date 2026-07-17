import { notFound, redirect } from "next/navigation";

import { MomentsAlbumScreen } from "@/features/moments/components/MomentsAlbumScreen";
import { MomentDetailScreen } from "@/features/moments/components/MomentDetailScreen";
import { NewMomentScreen } from "@/features/moments/components/NewMomentScreen";
import { isMomentsEnabled } from "@/features/moments/config";
import {
  loadBabyForMoments,
  verifyMomentAccess,
} from "@/features/moments/access";
import {
  loadMomentDetail,
  loadMomentsForBaby,
  loadSystemTags,
} from "@/features/moments/queries";
import { requireAppUser } from "@/lib/auth/require-app-user";
import { createClient } from "@/lib/supabase/server";

export async function requireBabyMomentsContext(babyId: string) {
  if (!isMomentsEnabled()) {
    redirect("/baby");
  }

  const { user, parent } = await requireAppUser();
  if (!parent.family_id) {
    notFound();
  }

  const supabase = await createClient();
  const baby = await loadBabyForMoments(supabase, babyId, parent.family_id);
  if (!baby) {
    notFound();
  }

  return { user, parent, supabase, baby };
}

export async function renderMomentsAlbumPage(babyId: string) {
  const { user, supabase, baby } = await requireBabyMomentsContext(babyId);
  const items = await loadMomentsForBaby(supabase, baby, user.id);

  return (
    <MomentsAlbumScreen
      babyId={baby.babyId}
      babyName={baby.babyName}
      items={items}
    />
  );
}

export async function renderNewMomentPage(babyId: string) {
  const { supabase, baby } = await requireBabyMomentsContext(babyId);
  const systemTags = await loadSystemTags(supabase);

  return (
    <NewMomentScreen
      babyId={baby.babyId}
      babyName={baby.babyName}
      systemTags={systemTags}
    />
  );
}

export async function renderMomentDetailPage(babyId: string, momentId: string) {
  const { user, supabase, baby } = await requireBabyMomentsContext(babyId);

  const allowed = await verifyMomentAccess(
    supabase,
    momentId,
    user.id,
    baby.babyId,
  );
  if (!allowed) {
    notFound();
  }

  const moment = await loadMomentDetail(supabase, momentId, baby, user.id);
  if (!moment) {
    notFound();
  }

  return (
    <MomentDetailScreen
      babyId={baby.babyId}
      babyName={baby.babyName}
      moment={moment}
    />
  );
}
