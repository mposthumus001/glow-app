import { notFound } from "next/navigation";

import { requireAppUser } from "@/lib/auth/require-app-user";
import { createClient } from "@/lib/supabase/server";

import { CreateFamilyScreen } from "../components/CreateFamilyScreen";
import { FamilyDetailScreen } from "../components/FamilyDetailScreen";
import { FamilyHomeScreen } from "../components/FamilyHomeScreen";
import { isFamilyAlbumEnabled } from "../config";
import { getSharedFamilyDetail, listMySharedFamilies } from "../queries";

export async function renderFamilyHomePage() {
  if (!isFamilyAlbumEnabled()) {
    notFound();
  }

  const { user } = await requireAppUser();
  const supabase = await createClient();
  const families = await listMySharedFamilies(supabase, user.id);

  return <FamilyHomeScreen families={families} />;
}

export async function renderCreateFamilyPage() {
  if (!isFamilyAlbumEnabled()) {
    notFound();
  }

  await requireAppUser();
  return <CreateFamilyScreen />;
}

export async function renderFamilyDetailPage(sharedFamilyId: string) {
  if (!isFamilyAlbumEnabled()) {
    notFound();
  }

  const { user } = await requireAppUser();
  const supabase = await createClient();
  const family = await getSharedFamilyDetail(
    supabase,
    user.id,
    sharedFamilyId,
  );

  if (!family) {
    notFound();
  }

  return <FamilyDetailScreen family={family} />;
}
