import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  canRequestAssignmentForParent,
  compareCircleCandidates,
  computeBabyAgeMonths,
  countActiveMembers,
  findExistingActiveMembership,
  postOnboardingRedirectPath,
  ruleMatchesParent,
  ruleSpecificity,
  selectBestCircleWithCapacity,
  shouldFailOnboardingForAssignment,
  simulateAssignment,
  simulateConcurrentFinalSlotAssignments,
  type CircleCandidate,
  type CircleRuleFields,
  type MemberRow,
  type ParentMatchProfile,
} from "./assignmentLogic.ts";

const NSW_PARENT: ParentMatchProfile = {
  state: "NSW",
  feedingMethod: "breastfeeding",
  firstChild: false,
  babyAgeMonths: 5,
};

function rule(overrides: Partial<CircleRuleFields> = {}): CircleRuleFields {
  return {
    state: null,
    feedingMethod: null,
    babyAgeMinMonths: null,
    babyAgeMaxMonths: null,
    firstChild: null,
    priority: 50,
    ...overrides,
  };
}

function circle(
  overrides: Partial<CircleCandidate> & Pick<CircleCandidate, "circleId">,
): CircleCandidate {
  return {
    rule: rule(),
    memberCount: 0,
    maxMembers: 12,
    status: "active",
    createdAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("computeBabyAgeMonths", () => {
  const today = new Date(2026, 6, 11); // 11 Jul 2026 local

  it("uses DOB when present", () => {
    const age = computeBabyAgeMonths(
      { dateOfBirth: "2026-01-15", dueDate: null },
      today,
    );
    assert.equal(age, 5);
  });

  it("returns 0 for future due date", () => {
    const age = computeBabyAgeMonths(
      { dateOfBirth: null, dueDate: "2026-09-01" },
      today,
    );
    assert.equal(age, 0);
  });

  it("uses due date when past and DOB missing", () => {
    const age = computeBabyAgeMonths(
      { dateOfBirth: null, dueDate: "2026-02-01" },
      today,
    );
    assert.equal(age, 5);
  });

  it("returns null when no baby dates", () => {
    assert.equal(
      computeBabyAgeMonths({ dateOfBirth: null, dueDate: null }, today),
      null,
    );
    assert.equal(computeBabyAgeMonths(null, today), null);
  });

  it("clamps negative ages to zero", () => {
    const age = computeBabyAgeMonths(
      { dateOfBirth: "2026-08-01", dueDate: null },
      today,
    );
    assert.equal(age, 0);
  });
});

describe("ruleMatchesParent", () => {
  it("matches an eligible parent against matching rules", () => {
    assert.equal(
      ruleMatchesParent(
        rule({
          state: "NSW",
          feedingMethod: "breastfeeding",
          babyAgeMinMonths: 0,
          babyAgeMaxMonths: 6,
        }),
        NSW_PARENT,
      ),
      true,
    );
  });

  it("matches wildcard rules", () => {
    assert.equal(ruleMatchesParent(rule(), NSW_PARENT), true);
  });

  it("respects state and feeding constraints", () => {
    assert.equal(
      ruleMatchesParent(rule({ state: "NSW" }), NSW_PARENT),
      true,
    );
    assert.equal(
      ruleMatchesParent(rule({ state: "VIC" }), NSW_PARENT),
      false,
    );
    assert.equal(
      ruleMatchesParent(
        rule({ feedingMethod: "breastfeeding" }),
        NSW_PARENT,
      ),
      true,
    );
  });

  it("requires baby age for age-specific rules", () => {
    const ageRule = rule({ babyAgeMinMonths: 0, babyAgeMaxMonths: 6 });
    assert.equal(ruleMatchesParent(ageRule, NSW_PARENT), true);
    assert.equal(
      ruleMatchesParent(ageRule, { ...NSW_PARENT, babyAgeMonths: null }),
      false,
    );
  });

  it("handles baby-age boundary values", () => {
    const ageRule = rule({ babyAgeMinMonths: 0, babyAgeMaxMonths: 6 });
    assert.equal(
      ruleMatchesParent(ageRule, { ...NSW_PARENT, babyAgeMonths: 0 }),
      true,
    );
    assert.equal(
      ruleMatchesParent(ageRule, { ...NSW_PARENT, babyAgeMonths: 6 }),
      true,
    );
    assert.equal(
      ruleMatchesParent(ageRule, { ...NSW_PARENT, babyAgeMonths: 7 }),
      false,
    );
  });
});

describe("rule priority and specificity", () => {
  it("selects lower priority number first", () => {
    const high = circle({
      circleId: "a",
      rule: rule({ priority: 10, state: "NSW" }),
      memberCount: 1,
    });
    const low = circle({
      circleId: "b",
      rule: rule({ priority: 20, state: "NSW" }),
      memberCount: 5,
    });
    assert.equal(
      selectBestCircleWithCapacity([low, high], NSW_PARENT)?.circleId,
      "a",
    );
  });

  it("prefers more specific rules at equal priority", () => {
    const wildcard = circle({
      circleId: "wild",
      rule: rule({ priority: 10 }),
    });
    const specific = circle({
      circleId: "specific",
      rule: rule({ priority: 10, state: "NSW", feedingMethod: "breastfeeding" }),
    });
    assert.equal(ruleSpecificity(specific.rule), 2);
    assert.equal(
      selectBestCircleWithCapacity([wildcard, specific], NSW_PARENT)?.circleId,
      "specific",
    );
  });
});

describe("capacity and circle status", () => {
  it("excludes full Circles", () => {
    const full = circle({
      circleId: "full",
      rule: rule({ state: "NSW" }),
      memberCount: 12,
      maxMembers: 12,
    });
    assert.equal(selectBestCircleWithCapacity([full], NSW_PARENT), null);
  });

  it("ignores inactive members in counts", () => {
    const members: MemberRow[] = [
      {
        circleId: "c1",
        parentId: "p1",
        status: "active",
        deletedAt: null,
      },
      {
        circleId: "c1",
        parentId: "p2",
        status: "left",
        deletedAt: null,
      },
      {
        circleId: "c1",
        parentId: "p3",
        status: "active",
        deletedAt: "2026-01-01T00:00:00.000Z",
      },
    ];
    assert.equal(countActiveMembers(members, "c1"), 1);
  });

  it("excludes inactive Circles", () => {
    const archived = circle({
      circleId: "archived",
      status: "archived",
      rule: rule({ state: "NSW" }),
    });
    const paused = circle({
      circleId: "paused",
      status: "paused",
      rule: rule({ state: "NSW" }),
    });
    const forming = circle({
      circleId: "forming",
      status: "forming",
      rule: rule({ state: "NSW" }),
    });
    assert.equal(selectBestCircleWithCapacity([archived], NSW_PARENT), null);
    assert.equal(selectBestCircleWithCapacity([paused], NSW_PARENT), null);
    assert.equal(selectBestCircleWithCapacity([forming], NSW_PARENT), null);
  });
});

describe("tie-breaking", () => {
  it("uses deterministic fuller → oldest → id order", () => {
    const fuller = circle({
      circleId: "b-circle",
      rule: rule({ priority: 10, state: "NSW" }),
      memberCount: 4,
      createdAt: "2026-02-01T00:00:00.000Z",
    });
    const emptier = circle({
      circleId: "a-circle",
      rule: rule({ priority: 10, state: "NSW" }),
      memberCount: 2,
      createdAt: "2026-01-01T00:00:00.000Z",
    });
    assert.equal(
      selectBestCircleWithCapacity([emptier, fuller], NSW_PARENT)?.circleId,
      "b-circle",
    );

    const older = circle({
      circleId: "z-old",
      memberCount: 4,
      createdAt: "2026-01-01T00:00:00.000Z",
    });
    const newer = circle({
      circleId: "y-new",
      memberCount: 4,
      createdAt: "2026-06-01T00:00:00.000Z",
    });
    assert.ok(compareCircleCandidates(older, newer) < 0);
  });
});

describe("simulateAssignment", () => {
  const members: MemberRow[] = [];

  it("returns existing membership unchanged", () => {
    const existingMembers: MemberRow[] = [
      {
        circleId: "existing",
        parentId: "parent-1",
        status: "active",
        deletedAt: null,
      },
    ];
    const result = simulateAssignment({
      parentId: "parent-1",
      parent: NSW_PARENT,
      members: existingMembers,
      circles: [
        circle({
          circleId: "other",
          rule: rule({ state: "NSW" }),
        }),
      ],
    });
    assert.deepEqual(result, { kind: "existing", circleId: "existing" });
  });

  it("assigns an eligible parent into the best matching Circle", () => {
    const result = simulateAssignment({
      parentId: "parent-1",
      parent: NSW_PARENT,
      members,
      circles: [
        circle({
          circleId: "roomy",
          rule: rule({ state: "NSW", babyAgeMinMonths: 0, babyAgeMaxMonths: 12 }),
          memberCount: 3,
        }),
      ],
    });
    assert.deepEqual(result, { kind: "assigned", circleId: "roomy" });
  });

  it("returns no_match when no Circle fits", () => {
    const result = simulateAssignment({
      parentId: "parent-1",
      parent: NSW_PARENT,
      members,
      circles: [
        circle({
          circleId: "full",
          rule: rule({ state: "NSW" }),
          memberCount: 12,
          maxMembers: 12,
        }),
        circle({
          circleId: "wrong-state",
          rule: rule({ state: "VIC" }),
          memberCount: 2,
        }),
      ],
    });
    assert.deepEqual(result, {
      kind: "no_match",
      reason: "no_eligible_active_circle",
    });
  });

  it("is idempotent on repeated assignment", () => {
    const membersAfterFirst: MemberRow[] = [
      {
        circleId: "roomy",
        parentId: "parent-1",
        status: "active",
        deletedAt: null,
      },
    ];
    const first = simulateAssignment({
      parentId: "parent-1",
      parent: NSW_PARENT,
      members,
      circles: [
        circle({
          circleId: "roomy",
          rule: rule({ state: "NSW" }),
          memberCount: 1,
        }),
      ],
    });
    const second = simulateAssignment({
      parentId: "parent-1",
      parent: NSW_PARENT,
      members: membersAfterFirst,
      circles: [
        circle({
          circleId: "roomy",
          rule: rule({ state: "NSW" }),
          memberCount: 2,
        }),
      ],
    });
    assert.equal(first.kind, "assigned");
    assert.equal(second.kind, "existing");
    if (first.kind === "assigned" && second.kind === "existing") {
      assert.equal(first.circleId, second.circleId);
    }
  });

  it("finds existing active membership for duplicate-guard semantics", () => {
    assert.equal(
      findExistingActiveMembership(
        [
          {
            circleId: "c1",
            parentId: "parent-1",
            status: "active",
            deletedAt: null,
          },
        ],
        "parent-1",
      ),
      "c1",
    );
  });
});

describe("concurrent final-slot assignment", () => {
  it("cannot exceed capacity for the last seat", () => {
    const almostFull = circle({
      circleId: "last-seat",
      rule: rule({ state: "NSW" }),
      memberCount: 11,
      maxMembers: 12,
    });
    const existing: MemberRow[] = Array.from({ length: 11 }, (_, i) => ({
      circleId: "last-seat",
      parentId: `seed-${i}`,
      status: "active" as const,
      deletedAt: null,
    }));

    const race = simulateConcurrentFinalSlotAssignments({
      circle: almostFull,
      existingMembers: existing,
      parentA: { parentId: "parent-a", parent: NSW_PARENT },
      parentB: { parentId: "parent-b", parent: NSW_PARENT },
    });

    assert.equal(race.results[0].kind, "assigned");
    assert.equal(race.results[1].kind, "no_match");
    assert.equal(race.finalActiveCount, 12);
    assert.equal(race.exceededCapacity, false);
  });
});

describe("assignment auth guard", () => {
  it("rejects unauthenticated or mismatched parent ids", () => {
    assert.equal(canRequestAssignmentForParent(null, "parent-1"), false);
    assert.equal(canRequestAssignmentForParent(undefined, "parent-1"), false);
    assert.equal(
      canRequestAssignmentForParent("other-parent", "parent-1"),
      false,
    );
    assert.equal(
      canRequestAssignmentForParent("parent-1", "parent-1"),
      true,
    );
  });
});

describe("onboarding assignment soft-fail", () => {
  it("does not fail onboarding when assignment returns no_match", () => {
    assert.equal(
      shouldFailOnboardingForAssignment({ ok: true, outcome: "no_match" }),
      false,
    );
    assert.equal(
      shouldFailOnboardingForAssignment({ ok: false }),
      false,
    );
    assert.equal(postOnboardingRedirectPath(), "/circle");
  });
});
