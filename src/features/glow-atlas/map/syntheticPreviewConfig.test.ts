import assert from "node:assert/strict";
import { test } from "node:test";

import {
  formatSyntheticPreviewDisclosure,
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
  for (const value of ["false", "0", "no", " ", "enabled"]) {
    const config = resolveSyntheticPreviewConfig(value);
    assert.equal(config.enabled, false, `unexpected result for "${value}"`);
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

test("disclosure names simulated parents and never implies genuine live activity", () => {
  const text = formatSyntheticPreviewDisclosure(5000);
  const lower = text.toLowerCase();
  assert.ok(lower.includes("full community preview"));
  assert.ok(lower.includes("5,000") || lower.includes("5000"));
  assert.ok(lower.includes("simulated parents"));
  for (const forbidden of ["awake right now", "live user", "genuine", "real parents"]) {
    assert.ok(!lower.includes(forbidden), `disclosure should not contain "${forbidden}"`);
  }
  assert.equal(SYNTHETIC_PREVIEW_DISCLOSURE_TEXT, formatSyntheticPreviewDisclosure(5000));
});

test("disclosure count follows the configured point count", () => {
  assert.equal(
    formatSyntheticPreviewDisclosure(1200),
    "Full community preview · 1,200 simulated parents online",
  );
});
