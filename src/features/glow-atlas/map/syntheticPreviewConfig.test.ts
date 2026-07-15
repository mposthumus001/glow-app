import assert from "node:assert/strict";
import { test } from "node:test";

import {
  resolveSyntheticPreviewConfig,
  SYNTHETIC_PREVIEW_DEFAULT_COUNT,
  SYNTHETIC_PREVIEW_DISCLOSURE_TEXT,
  SYNTHETIC_PREVIEW_MAX_COUNT,
} from "./syntheticPreviewConfig.ts";

test("disabled when the flag is unset", () => {
  const config = resolveSyntheticPreviewConfig(undefined, undefined);
  assert.equal(config.enabled, false);
  assert.equal(config.pointCount, SYNTHETIC_PREVIEW_DEFAULT_COUNT);
});

test("disabled for any value other than an explicit true/1", () => {
  for (const value of ["false", "0", "no", "TRUE ", " ", "enabled"]) {
    const config = resolveSyntheticPreviewConfig(value);
    assert.equal(config.enabled, value.trim().toLowerCase() === "true", `unexpected result for "${value}"`);
  }
});

test("enabled when the flag is exactly 'true' (case-insensitive, trimmed)", () => {
  for (const value of ["true", "True", " TRUE ", "1"]) {
    const config = resolveSyntheticPreviewConfig(value);
    assert.equal(config.enabled, true, `expected "${value}" to enable the preview`);
  }
});

test("defaults to 5000 points when no count override is given", () => {
  const config = resolveSyntheticPreviewConfig("true");
  assert.equal(config.pointCount, 5000);
});

test("respects a configured point count override", () => {
  const config = resolveSyntheticPreviewConfig("true", "1200");
  assert.equal(config.pointCount, 1200);
});

test("clamps an oversized count override to the safe upper cap", () => {
  const config = resolveSyntheticPreviewConfig("true", "5000000");
  assert.equal(config.pointCount, SYNTHETIC_PREVIEW_MAX_COUNT);
});

test("ignores an invalid/non-numeric count override and falls back to the default", () => {
  for (const value of ["not-a-number", "-500", "0", ""]) {
    const config = resolveSyntheticPreviewConfig("true", value);
    assert.equal(config.pointCount, SYNTHETIC_PREVIEW_DEFAULT_COUNT, `unexpected result for "${value}"`);
  }
});

test("the disclosure text never implies real activity", () => {
  const lower = SYNTHETIC_PREVIEW_DISCLOSURE_TEXT.toLowerCase();
  for (const forbidden of ["parent", "live user", "awake", "online now"]) {
    assert.ok(!lower.includes(forbidden), `disclosure text should not contain "${forbidden}"`);
  }
  assert.ok(lower.includes("preview"));
  assert.ok(lower.includes("simulated"));
});
