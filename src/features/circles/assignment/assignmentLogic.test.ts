import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  buildPrivacySafeCircleName,
  compareCircleCandidates,
  computeBabyAgeMonths,
  countActiveMembers,
  deriveAgeBandForNewCircle,
  findExistingActiveMembership,
  ruleMatchesParent,
  ruleSpecificity,
  selectBestCircleWithCapacity,
  simulateAssignment,
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
  it("skips full circles", () => {
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

  it("only considers active circles with capacity", () => {
    const archived = circle({
      circleId: "archived",
      status: "archived",
      rule: rule({ state: "NSW" }),
    });
    assert.equal(
      selectBestCircleWithCapacity([archived], NSW_PARENT),
      null,
    );
  });
});

describe("tie-breaking", () => {
  it("prefers fuller circle, then oldest, then id", () => {
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
      circles: [],
    });
    assert.deepEqual(result, { kind: "existing", circleId: "existing" });
  });

  it("prefers existing circle over creating new", () => {
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
    assert.deepEqual(result, { kind: "existing", circleId: "roomy" });
  });

  it("creates only when no circle has capacity", () => {
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
      ],
    });
    assert.equal(result.kind, "create");
    if (result.kind === "create") {
      assert.equal(result.ageMin, 0);
      assert.equal(result.ageMax, 12);
    }
  });

  it("is idempotent on repeated invocation", () => {
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
    assert.equal(first.kind, "existing");
    assert.equal(second.kind, "existing");
    if (first.kind === "existing" && second.kind === "existing") {
      assert.equal(first.circleId, second.circleId);
    }
  });

  it("concurrent-style duplicate guard via existing membership lookup", () => {
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

describe("privacy-safe naming", () => {
  it("never includes suburb or email", () => {
    const name = buildPrivacySafeCircleName("NSW", 0, 6, 4);
    assert.match(name, /^Glow Circle · NSW · 0–6 mo$/);
    assert.doesNotMatch(name, /@/);
  });
});

describe("deriveAgeBandForNewCircle", () => {
  it("falls back when no template", () => {
    const band = deriveAgeBandForNewCircle(null, 8);
    assert.deepEqual(band, { ageMin: 8, ageMax: 14 });
  });
});
