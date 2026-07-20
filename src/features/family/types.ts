export type SharedFamilyRole = "owner" | "member";

export type SharedFamilyListItem = {
  id: string;
  name: string;
  role: SharedFamilyRole;
  roleLabel: "Owner" | "Member";
  memberCount: number;
  /** ISO timestamptz for display formatting */
  updatedAt: string;
  createdAt: string;
};

export type SharedFamilyDetail = SharedFamilyListItem & {
  isOwner: boolean;
};

export type SharedFamilyMemberRow = {
  id: string;
  role: SharedFamilyRole;
  roleLabel: "Owner" | "Member";
  displayName: string;
  joinedAt: string;
  parentId: string;
};

export type SharedFamilyPendingInviteRow = {
  id: string;
  maskedEmail: string;
  expiresAt: string;
  createdAt: string;
};

export type SharedFamilyMembersPageData = {
  family: SharedFamilyDetail;
  members: SharedFamilyMemberRow[];
  pendingInvites: SharedFamilyPendingInviteRow[];
};

export type CreateInviteResultData = {
  inviteId: string;
  invitePath: string;
  inviteUrl: string;
  maskedEmail: string;
  expiresAt: string;
  /** Raw token — returned once in memory only; never persisted or logged. */
  rawToken: string;
};

export type InviteAcceptCategory =
  | "accepted"
  | "email_mismatch"
  | "expired"
  | "revoked"
  | "invalid"
  | "unavailable"
  | "needs_auth";

export type FamilyActionResult<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; error: string };
