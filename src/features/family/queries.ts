import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/supabase/database.types";

import type { SharedFamilyDetail, SharedFamilyListItem, SharedFamilyRole, SharedFamilyMembersPageData, SharedFamilyMemberRow, SharedFamilyPendingInviteRow } from "./types";
import { maskInviteEmail, memberDisplayName } from "./inviteUtils.ts";

type Client = SupabaseClient<Database>;

type MembershipRow = {
  shared_family_id: string;
  role: SharedFamilyRole;
  status: string;
};

type FamilyRow = {
  id: string;
  name: string;
  status: string;
  created_at: string;
  updated_at: string;
};

function roleLabel(role: SharedFamilyRole): "Owner" | "Member" {
  return role === "owner" ? "Owner" : "Member";
}

/**
 * Pure mapper — used by queries and unit tests.
 * Deduplicates by family id (first membership wins).
 */
export function buildSharedFamilyListItems(input: {
  memberships: MembershipRow[];
  families: FamilyRow[];
  memberCounts: Record<string, number>;
}): SharedFamilyListItem[] {
  const familyById = new Map(
    input.families
      .filter((f) => f.status === "active")
      .map((f) => [f.id, f] as const),
  );

  const seen = new Set<string>();
  const items: SharedFamilyListItem[] = [];

  for (const membership of input.memberships) {
    if (membership.status !== "active") continue;
    if (seen.has(membership.shared_family_id)) continue;

    const family = familyById.get(membership.shared_family_id);
    if (!family) continue;

    seen.add(family.id);
    items.push({
      id: family.id,
      name: family.name,
      role: membership.role,
      roleLabel: roleLabel(membership.role),
      memberCount: input.memberCounts[family.id] ?? 1,
      updatedAt: family.updated_at,
      createdAt: family.created_at,
    });
  }

  items.sort((a, b) => {
    const byUpdated = b.updatedAt.localeCompare(a.updatedAt);
    if (byUpdated !== 0) return byUpdated;
    return a.name.localeCompare(b.name);
  });

  return items;
}

export async function listMySharedFamilies(
  supabase: Client,
  parentId: string,
): Promise<SharedFamilyListItem[]> {
  const { data: memberships, error: membershipError } = await supabase
    .from("shared_family_members")
    .select("shared_family_id, role, status")
    .eq("parent_id", parentId)
    .eq("status", "active");

  if (membershipError || !memberships?.length) {
    return [];
  }

  const familyIds = [
    ...new Set(memberships.map((m) => m.shared_family_id).filter(Boolean)),
  ];

  const { data: families, error: familiesError } = await supabase
    .from("shared_families")
    .select("id, name, status, created_at, updated_at")
    .in("id", familyIds)
    .eq("status", "active");

  if (familiesError || !families?.length) {
    return [];
  }

  const activeFamilyIds = families.map((f) => f.id);

  const { data: roster } = await supabase
    .from("shared_family_members")
    .select("shared_family_id")
    .in("shared_family_id", activeFamilyIds)
    .eq("status", "active");

  const memberCounts: Record<string, number> = {};
  for (const row of roster ?? []) {
    const id = row.shared_family_id;
    memberCounts[id] = (memberCounts[id] ?? 0) + 1;
  }

  return buildSharedFamilyListItems({
    memberships: memberships as MembershipRow[],
    families: families as FamilyRow[],
    memberCounts,
  });
}

export async function getSharedFamilyDetail(
  supabase: Client,
  parentId: string,
  sharedFamilyId: string,
): Promise<SharedFamilyDetail | null> {
  const { data: membership } = await supabase
    .from("shared_family_members")
    .select("shared_family_id, role, status")
    .eq("shared_family_id", sharedFamilyId)
    .eq("parent_id", parentId)
    .eq("status", "active")
    .maybeSingle();

  if (!membership) return null;

  const { data: family } = await supabase
    .from("shared_families")
    .select("id, name, status, created_at, updated_at")
    .eq("id", sharedFamilyId)
    .eq("status", "active")
    .maybeSingle();

  if (!family) return null;

  const { count } = await supabase
    .from("shared_family_members")
    .select("id", { count: "exact", head: true })
    .eq("shared_family_id", sharedFamilyId)
    .eq("status", "active");

  const role = membership.role as SharedFamilyRole;

  return {
    id: family.id,
    name: family.name,
    role,
    roleLabel: roleLabel(role),
    memberCount: count ?? 1,
    updatedAt: family.updated_at,
    createdAt: family.created_at,
    isOwner: role === "owner",
  };
}

type MemberQueryRow = {
  id: string;
  parent_id: string;
  role: SharedFamilyRole;
  joined_at: string;
};

export async function getSharedFamilyMembersPageData(
  supabase: Client,
  parentId: string,
  sharedFamilyId: string,
): Promise<SharedFamilyMembersPageData | null> {
  const family = await getSharedFamilyDetail(supabase, parentId, sharedFamilyId);
  if (!family?.isOwner) return null;

  const { data: memberRows, error: membersError } = await supabase
    .from("shared_family_members")
    .select("id, parent_id, role, joined_at")
    .eq("shared_family_id", sharedFamilyId)
    .eq("status", "active")
    .order("joined_at", { ascending: true });

  if (membersError) {
    return null;
  }

  const typedRows = (memberRows ?? []) as MemberQueryRow[];
  const parentIds = [...new Set(typedRows.map((row) => row.parent_id))];

  const displayNamesByParentId = new Map<string, string>();
  if (parentIds.length > 0) {
    const { data: parents } = await supabase
      .from("parents")
      .select("id, display_name")
      .in("id", parentIds);

    for (const parent of parents ?? []) {
      displayNamesByParentId.set(parent.id, parent.display_name);
    }
  }

  const members: SharedFamilyMemberRow[] = typedRows.map((row) => {
    const role = row.role as SharedFamilyRole;

    return {
      id: row.id,
      parentId: row.parent_id,
      role,
      roleLabel: roleLabel(role),
      displayName: memberDisplayName(displayNamesByParentId.get(row.parent_id)),
      joinedAt: row.joined_at,
    };
  });

  const { data: inviteRows, error: invitesError } = await supabase
    .from("shared_family_invites")
    .select("id, invited_email_normalized, expires_at, created_at")
    .eq("shared_family_id", sharedFamilyId)
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  if (invitesError) {
    return null;
  }

  const pendingInvites: SharedFamilyPendingInviteRow[] = (inviteRows ?? []).map(
    (invite) => ({
      id: invite.id,
      maskedEmail: maskInviteEmail(invite.invited_email_normalized),
      expiresAt: invite.expires_at,
      createdAt: invite.created_at,
    }),
  );

  return { family, members, pendingInvites };
}
