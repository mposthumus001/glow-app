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

export type FamilyActionResult<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; error: string };
