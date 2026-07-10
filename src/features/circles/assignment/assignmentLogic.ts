import type { AuState, FeedingMethod } from "@/lib/supabase/database.types";

/** Whole months between anchor date and reference date (floor, min 0). */
export function monthsBetween(anchor: Date, reference: Date): number {
  let months =
    (reference.getFullYear() - anchor.getFullYear()) * 12 +
    (reference.getMonth() - anchor.getMonth());
  if (reference.getDate() < anchor.getDate()) {
    months -= 1;
  }
  return Math.max(0, months);
}

export type BabyAgeInput = {
  dateOfBirth: string | null;
  dueDate: string | null;
};

/**
 * Baby age in whole months for circle matching.
 * Keep in sync with `public.parent_baby_age_months` (migration 0004).
 */
export function computeBabyAgeMonths(
  baby: BabyAgeInput | null,
  today: Date = new Date(),
): number | null {
  if (!baby) return null;

  const ref = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  );

  if (baby.dateOfBirth) {
    const dob = parseDateOnly(baby.dateOfBirth);
    if (dob) return monthsBetween(dob, ref);
  }

  if (baby.dueDate) {
    const due = parseDateOnly(baby.dueDate);
    if (!due) return null;
    if (ref >= due) return monthsBetween(due, ref);
    return 0;
  }

  return null;
}

function parseDateOnly(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

export type CircleRuleFields = {
  state: AuState | null;
  feedingMethod: FeedingMethod | null;
  babyAgeMinMonths: number | null;
  babyAgeMaxMonths: number | null;
  firstChild: boolean | null;
  priority: number;
};

export type ParentMatchProfile = {
  state: AuState;
  feedingMethod: FeedingMethod;
  firstChild: boolean;
  babyAgeMonths: number | null;
};

export function ruleSpecificity(rule: CircleRuleFields): number {
  return (
    (rule.state != null ? 1 : 0) +
    (rule.feedingMethod != null ? 1 : 0) +
    (rule.firstChild != null ? 1 : 0) +
    (rule.babyAgeMinMonths != null || rule.babyAgeMaxMonths != null ? 1 : 0)
  );
}

export function ruleMatchesParent(
  rule: CircleRuleFields,
  parent: ParentMatchProfile,
): boolean {
  if (rule.state != null && rule.state !== parent.state) return false;
  if (
    rule.feedingMethod != null &&
    rule.feedingMethod !== parent.feedingMethod
  ) {
    return false;
  }
  if (rule.firstChild != null && rule.firstChild !== parent.firstChild) {
    return false;
  }

  const hasAgeConstraint =
    rule.babyAgeMinMonths != null || rule.babyAgeMaxMonths != null;

  if (!hasAgeConstraint) return true;

  if (parent.babyAgeMonths == null) return false;

  if (
    rule.babyAgeMinMonths != null &&
    parent.babyAgeMonths < rule.babyAgeMinMonths
  ) {
    return false;
  }

  if (
    rule.babyAgeMaxMonths != null &&
    parent.babyAgeMonths > rule.babyAgeMaxMonths
  ) {
    return false;
  }

  return true;
}

export type CircleCandidate = {
  circleId: string;
  rule: CircleRuleFields;
  memberCount: number;
  maxMembers: number;
  status: "active" | "forming" | "paused" | "archived";
  createdAt: string;
};

export type CircleSelectionResult =
  | { kind: "existing"; circleId: string }
  | { kind: "create"; template: CircleRuleFields | null; ageMin: number; ageMax: number };

/**
 * Deterministic selection order (must match SQL in assign_parent_to_circle):
 * 1. rule priority ASC (lower number = higher priority)
 * 2. rule specificity DESC
 * 3. member count DESC (prefer fuller circle)
 * 4. circle created_at ASC (oldest)
 * 5. circle id ASC
 */
export function compareCircleCandidates(
  a: CircleCandidate,
  b: CircleCandidate,
): number {
  if (a.rule.priority !== b.rule.priority) {
    return a.rule.priority - b.rule.priority;
  }

  const specA = ruleSpecificity(a.rule);
  const specB = ruleSpecificity(b.rule);
  if (specA !== specB) return specB - specA;

  if (a.memberCount !== b.memberCount) {
    return b.memberCount - a.memberCount;
  }

  if (a.createdAt !== b.createdAt) {
    return a.createdAt.localeCompare(b.createdAt);
  }

  return a.circleId.localeCompare(b.circleId);
}

export function selectBestCircleWithCapacity(
  candidates: CircleCandidate[],
  parent: ParentMatchProfile,
): CircleCandidate | null {
  const eligible = candidates.filter(
    (c) =>
      c.status === "active" &&
      c.memberCount < c.maxMembers &&
      ruleMatchesParent(c.rule, parent),
  );

  if (eligible.length === 0) return null;

  return [...eligible].sort(compareCircleCandidates)[0] ?? null;
}

export function selectBestRuleTemplate(
  candidates: CircleCandidate[],
  parent: ParentMatchProfile,
): CircleRuleFields | null {
  const eligible = candidates.filter(
    (c) =>
      (c.status === "active" || c.status === "forming") &&
      ruleMatchesParent(c.rule, parent),
  );

  if (eligible.length === 0) return null;

  return [...eligible].sort(compareCircleCandidates)[0]?.rule ?? null;
}

export function deriveAgeBandForNewCircle(
  template: CircleRuleFields | null,
  babyAgeMonths: number | null,
): { ageMin: number; ageMax: number } {
  if (template) {
    const ageMin = template.babyAgeMinMonths ?? 0;
    const ageMax = template.babyAgeMaxMonths ?? 12;
    return { ageMin, ageMax };
  }

  const ageMin = Math.max(0, babyAgeMonths ?? 0);
  const ageMax = Math.min(60, ageMin + 6);
  return { ageMax: Math.max(ageMin, ageMax), ageMin };
}

export function buildPrivacySafeCircleName(
  state: AuState,
  ageMin: number,
  ageMax: number,
  babyAgeMonths: number | null,
): string {
  let name = `Glow Circle · ${state}`;
  if (babyAgeMonths != null) {
    name += ` · ${ageMin}–${ageMax} mo`;
  }
  return name;
}

export type MemberRow = {
  circleId: string;
  parentId: string;
  status: "active" | "left" | "removed" | "muted";
  deletedAt: string | null;
};

export function countActiveMembers(
  members: MemberRow[],
  circleId: string,
): number {
  return members.filter(
    (m) =>
      m.circleId === circleId &&
      m.status === "active" &&
      m.deletedAt == null,
  ).length;
}

export function findExistingActiveMembership(
  members: MemberRow[],
  parentId: string,
): string | null {
  const active = members.filter(
    (m) =>
      m.parentId === parentId &&
      m.status === "active" &&
      m.deletedAt == null,
  );
  return active[0]?.circleId ?? null;
}

/** Simulate idempotent assignment in tests without a database. */
export function simulateAssignment(input: {
  parentId: string;
  parent: ParentMatchProfile;
  members: MemberRow[];
  circles: CircleCandidate[];
}): CircleSelectionResult {
  const existing = findExistingActiveMembership(input.members, input.parentId);
  if (existing) {
    return { kind: "existing", circleId: existing };
  }

  const withCounts = input.circles.map((c) => ({
    ...c,
    memberCount: Math.max(
      c.memberCount,
      countActiveMembers(input.members, c.circleId),
    ),
  }));

  const best = selectBestCircleWithCapacity(withCounts, input.parent);
  if (best) {
    return { kind: "existing", circleId: best.circleId };
  }

  const template = selectBestRuleTemplate(withCounts, input.parent);
  const { ageMin, ageMax } = deriveAgeBandForNewCircle(
    template,
    input.parent.babyAgeMonths,
  );

  return { kind: "create", template, ageMin, ageMax };
}
