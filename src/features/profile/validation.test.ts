import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { APP_VERSION } from "../../lib/app-version.ts";
import {
  displayNameInitials,
  validateAtlasPrivacy,
  validateBabyProfile,
  validateBetaFeedback,
  validateDeletionReason,
  validateFeedback,
  validateParentProfile,
} from "./validation.ts";

describe("validateParentProfile", () => {
  it("accepts a valid profile", () => {
    const result = validateParentProfile({
      displayName: "Mia",
      state: "VIC",
      feedingMethod: "mixed",
      firstChild: "true",
    });
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.value.displayName, "Mia");
      assert.equal(result.value.firstChild, true);
    }
  });

  it("rejects default display name and invalid state", () => {
    assert.equal(
      validateParentProfile({
        displayName: "New parent",
        state: "VIC",
        feedingMethod: "mixed",
        firstChild: "true",
      }).ok,
      false,
    );
    assert.equal(
      validateParentProfile({
        displayName: "Mia",
        state: "ZZZ",
        feedingMethod: "mixed",
        firstChild: "true",
      }).ok,
      false,
    );
  });
});

describe("validateBabyProfile", () => {
  it("requires baby id, name, and a date", () => {
    assert.equal(
      validateBabyProfile({
        babyId: "",
        name: "Ava",
        dateOfBirth: "2026-01-01",
        dueDate: "",
        feedingMethod: "",
      }).ok,
      false,
    );
    assert.equal(
      validateBabyProfile({
        babyId: "b1",
        name: "Ava",
        dateOfBirth: "",
        dueDate: "",
        feedingMethod: "",
      }).ok,
      false,
    );
  });

  it("accepts DOB or due date", () => {
    const result = validateBabyProfile({
      babyId: "b1",
      name: "Ava",
      dateOfBirth: "2026-01-01",
      dueDate: "",
      feedingMethod: "breastfeeding",
    });
    assert.equal(result.ok, true);
  });
});

describe("validateAtlasPrivacy", () => {
  it("rejects unsupported levels", () => {
    assert.equal(
      validateAtlasPrivacy({
        mapVisibility: "neighbourhood",
        suburbArea: "",
      }).ok,
      false,
    );
  });

  it("requires suburb label for suburb_area", () => {
    assert.equal(
      validateAtlasPrivacy({
        mapVisibility: "suburb_area",
        suburbArea: "",
      }).ok,
      false,
    );
    const ok = validateAtlasPrivacy({
      mapVisibility: "suburb_area",
      suburbArea: "Inner North",
    });
    assert.equal(ok.ok, true);
  });

  it("clears suburb for state_only and hidden", () => {
    const result = validateAtlasPrivacy({
      mapVisibility: "state_only",
      suburbArea: "ShouldClear",
    });
    assert.equal(result.ok, true);
    if (result.ok) assert.equal(result.value.suburbArea, null);
  });
});

describe("validateFeedback", () => {
  it("enforces category and length", () => {
    assert.equal(
      validateFeedback({ category: "nope", message: "Hello" }).ok,
      false,
    );
    assert.equal(
      validateFeedback({ category: "feedback", message: "" }).ok,
      false,
    );
    assert.equal(
      validateFeedback({
        category: "technical",
        message: "Something felt off on Tonight.",
      }).ok,
      true,
    );
  });
});

describe("validateBetaFeedback", () => {
  it("accepts structured beta feedback", () => {
    const result = validateBetaFeedback({
      category: "bug",
      summary: "Circle messages did not refresh",
      details: "Happened after switching tabs.",
      route: "/circle",
      appVersion: APP_VERSION,
      userAgent: "Mozilla/5.0",
      viewport: "390x844",
      contactAllowed: true,
    });
    assert.equal(result.ok, true);
  });

  it("rejects invalid categories and empty summaries", () => {
    assert.equal(
      validateBetaFeedback({
        category: "feedback",
        summary: "Hello",
        contactAllowed: false,
      }).ok,
      false,
    );
    assert.equal(
      validateBetaFeedback({
        category: "bug",
        summary: "",
        contactAllowed: false,
      }).ok,
      false,
    );
  });
});

describe("validateDeletionReason", () => {
  it("allows empty and rejects oversized", () => {
    assert.equal(validateDeletionReason("").ok, true);
    assert.equal(validateDeletionReason("x".repeat(501)).ok, false);
  });
});

describe("displayNameInitials", () => {
  it("builds calm initials", () => {
    assert.equal(displayNameInitials("Mia Chen"), "MC");
    assert.equal(displayNameInitials("Mia"), "M");
    assert.equal(displayNameInitials("  "), "?");
  });
});
