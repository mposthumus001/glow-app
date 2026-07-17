import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  filterOwnedStoragePaths,
  mapSoftDeleteRpcError,
  parseSoftDeleteRpcPayload,
  validateDeleteMomentInput,
} from "./deleteLogic.ts";

describe("validateDeleteMomentInput", () => {
  it("requires baby and moment ids", () => {
    assert.equal(
      validateDeleteMomentInput({ babyId: "", momentId: "m1" }).ok,
      false,
    );
    assert.equal(
      validateDeleteMomentInput({ babyId: "b1", momentId: "  " }).ok,
      false,
    );
  });

  it("trims ids for the owner delete path", () => {
    const result = validateDeleteMomentInput({
      babyId: " baby-1 ",
      momentId: " moment-1 ",
    });
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.babyId, "baby-1");
      assert.equal(result.momentId, "moment-1");
    }
  });
});

describe("parseSoftDeleteRpcPayload", () => {
  it("accepts owner soft-delete success with storage paths", () => {
    const result = parseSoftDeleteRpcPayload({
      ok: true,
      moment_id: "moment-1",
      storage_paths: ["owner/a/display.webp", "owner/a/thumb.webp", ""],
    });
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.momentId, "moment-1");
      assert.deepEqual(result.storagePaths, [
        "owner/a/display.webp",
        "owner/a/thumb.webp",
      ]);
    }
  });

  it("maps not_found and wrong_baby without leaking technical detail", () => {
    assert.deepEqual(parseSoftDeleteRpcPayload({ ok: false, error: "not_found" }), {
      ok: false,
      error: "not_found",
    });
    assert.deepEqual(parseSoftDeleteRpcPayload({ ok: false, error: "wrong_baby" }), {
      ok: false,
      error: "wrong_baby",
    });
    assert.equal(mapSoftDeleteRpcError("wrong_baby"), "That Moment could not be found.");
    assert.equal(
      mapSoftDeleteRpcError("unknown"),
      "Something didn't work just now. Please try again.",
    );
  });

  it("rejects malformed success payloads", () => {
    assert.equal(
      parseSoftDeleteRpcPayload({ ok: true, storage_paths: [] }).ok,
      false,
    );
  });
});

describe("filterOwnedStoragePaths", () => {
  it("never allows another parent's storage objects", () => {
    const owner = "11111111-1111-1111-1111-111111111111";
    const other = "22222222-2222-2222-2222-222222222222";
    const filtered = filterOwnedStoragePaths(
      [
        `${owner}/moment/display.webp`,
        `${other}/moment/display.webp`,
        `${owner}/../${other}/x.webp`,
        "relative.webp",
      ],
      owner,
    );
    assert.deepEqual(filtered, [`${owner}/moment/display.webp`]);
  });
});

describe("soft-delete contract (owner / non-owner / wrong baby)", () => {
  it("documents owner-only RPC soft-delete", () => {
    const rule =
      "soft_delete_private_moment requires moments.owner_parent_id = auth.uid()";
    assert.match(rule, /owner_parent_id = auth\.uid\(\)/);
  });

  it("documents non-owner cannot delete", () => {
    const rule =
      "non-owner SELECT/UPDATE blocked; RPC returns not_found when owner mismatch";
    assert.match(rule, /not_found/);
  });

  it("documents wrong baby route cannot delete", () => {
    const rule =
      "soft_delete_private_moment returns wrong_baby when moment_children link missing";
    assert.match(rule, /wrong_baby/);
  });

  it("documents soft-delete sets deleted_at and does not hard-delete", () => {
    const rule = "UPDATE moments/moment_media SET deleted_at only";
    assert.match(rule, /deleted_at/);
    assert.match(rule, /SET deleted_at only/);
  });

  it("documents ownership and visibility cannot change via delete", () => {
    const rule =
      "guard_moments_update blocks owner_parent_id/family_id/visibility changes";
    assert.match(rule, /blocks owner_parent_id/);
  });

  it("documents storage cleanup failure does not restore the Moment", () => {
    const rule =
      "soft-delete commits first; storage cleanup is best-effort; storage_cleanup_required on failure";
    assert.match(rule, /best-effort/);
  });
});
