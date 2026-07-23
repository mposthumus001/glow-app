import { notFound, redirect } from "next/navigation";

import { isParentOnboarded } from "@/lib/auth/onboarding";
import { requireAppUser } from "@/lib/auth/require-app-user";
import { createClient } from "@/lib/supabase/server";

import { acceptSharedFamilyInviteAction } from "../actions";
import { CreateFamilyScreen } from "../components/CreateFamilyScreen";
import { FamilyDetailScreen } from "../components/FamilyDetailScreen";
import { FamilyHomeScreen } from "../components/FamilyHomeScreen";
import {
  FamilyInviteAcceptScreen,
  type FamilyInviteAcceptScreenProps,
} from "../components/FamilyInviteAcceptScreen";
import { FamilyMembersScreen } from "../components/FamilyMembersScreen";
import { InviteSignedOutFlow } from "../components/InviteSignedOutFlow";
import { isFamilyAlbumEnabled } from "../config";
import { isValidInviteTokenFormat, normalizeInviteToken } from "../inviteUtils";
import {
  getSharedFamilyDetail,
  getSharedFamilyMembersPageData,
  listMySharedFamilies,
} from "../queries";
import type { InviteAcceptCategory } from "../types";
import { mapInviteAcceptMessage } from "../validation";

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

export async function renderFamilyMembersPage(sharedFamilyId: string) {
  if (!isFamilyAlbumEnabled()) {
    notFound();
  }

  const { user } = await requireAppUser();
  const supabase = await createClient();
  const data = await getSharedFamilyMembersPageData(
    supabase,
    user.id,
    sharedFamilyId,
  );

  if (!data) {
    notFound();
  }

  return (
    <FamilyMembersScreen {...data} currentUserId={user.id} />
  );
}

function mapCategoryToScreenState(
  category: InviteAcceptCategory,
): FamilyInviteAcceptScreenProps["state"] {
  switch (category) {
    case "email_mismatch":
      return "email_mismatch";
    case "expired":
      return "expired";
    case "revoked":
      return "revoked";
    case "invalid":
      return "invalid";
    default:
      return "unavailable";
  }
}

export async function renderFamilyInviteAcceptPage(token: string) {
  if (!isFamilyAlbumEnabled()) {
    notFound();
  }

  const trimmed = normalizeInviteToken(token);

  if (!isValidInviteTokenFormat(trimmed)) {
    return (
      <FamilyInviteAcceptScreen
        token={trimmed}
        state="invalid"
        message={mapInviteAcceptMessage("invalid")}
      />
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return <InviteSignedOutFlow token={trimmed} />;
  }

  const { data: parent } = await supabase
    .from("parents")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (!isParentOnboarded(parent)) {
    redirect(`/onboarding?next=${encodeURIComponent(`/family/invite/${trimmed}`)}`);
  }

  const result = await acceptSharedFamilyInviteAction(trimmed);

  if (result.ok) {
    redirect(`/family/${result.sharedFamilyId}`);
  }

  if (result.category === "needs_auth") {
    return <InviteSignedOutFlow token={trimmed} />;
  }

  return (
    <FamilyInviteAcceptScreen
      token={trimmed}
      state={mapCategoryToScreenState(result.category)}
      message={result.error}
    />
  );
}
