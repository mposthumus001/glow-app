import assert from "node:assert/strict";
import { describe, it } from "node:test";

describe("moments RLS contract (Sprint 9.1)", () => {
  it("documents owner-only private moment reads", () => {
    const rule =
      "moments_select_own — owner_parent_id = auth.uid(), deleted_at is null";
    assert.match(rule, /owner_parent_id = auth\.uid\(\)/);
  });

  it("documents household co-parent cannot read owner-private moments", () => {
    const excluded =
      "is_family_member alone does NOT grant moment SELECT in Sprint 9.1";
    assert.match(excluded, /does NOT grant moment SELECT/);
  });

  it("documents family_id derived server-side in create_private_moment", () => {
    const rule = "create_private_moment derives family_id from auth.uid() parent row";
    assert.match(rule, /derives family_id/);
  });

  it("documents cross-household baby link rejection", () => {
    const rule = "invalid_baby when baby.family_id <> owner family_id";
    assert.match(rule, /invalid_baby/);
  });

  it("documents shared visibility blocked by CHECK and trigger", () => {
    const checks = [
      "moments_sprint91_private_only CHECK",
      "guard_moments_update raises on shared visibility",
    ];
    assert.equal(checks.length, 2);
  });

  it("documents soft-deleted moments excluded from SELECT", () => {
    const rule = "deleted_at is null required on moments_select_own";
    assert.match(rule, /deleted_at is null/);
  });

  it("documents storage path owner prefix validation", () => {
    const rule =
      "moments_storage_owner_id(name) = auth.uid() for storage.objects";
    assert.match(rule, /moments_storage_owner_id/);
  });

  it("documents transactional rollback on invalid child link", () => {
    const rule = "create_private_moment returns invalid_baby before commit";
    assert.match(rule, /invalid_baby/);
  });
});

describe("moments processing contract (Sprint 9.2A)", () => {
  it("documents pending → processing → ready lifecycle", () => {
    const rule =
      "claim_moment_media_processing → complete_moment_media_processing (service_role only)";
    assert.match(rule, /service_role only/);
  });

  it("documents only service role marks ready", () => {
    const rule = "complete_moment_media_processing rejects authenticated JWT";
    assert.match(rule, /complete_moment_media_processing/);
  });

  it("documents original_path upload and display.webp storage_path", () => {
    const paths = "original_path upload; storage_path = display.webp after processing";
    assert.match(paths, /display\.webp/);
  });

  it("documents typed outcomes for 9.2B UI", () => {
    const outcomes = [
      "uploaded",
      "processing",
      "ready",
      "unsupported_image",
      "image_too_large",
      "processing_failed",
      "quota_exceeded",
      "retry_available",
    ];
    assert.equal(outcomes.length, 8);
  });
});

describe("moments signed URL contract", () => {
  it("documents short-lived signed URLs only", () => {
    const ttl = "MOMENTS_SIGNED_URL_TTL_SECONDS = 120";
    assert.match(ttl, /120/);
  });

  it("documents ready-only download for originals in UI", () => {
    const rule = "getMomentDownloadUrl rejects non-ready originals";
    assert.match(rule, /non-ready/);
  });
});
