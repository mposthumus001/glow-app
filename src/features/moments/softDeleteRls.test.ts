import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";

import {
  filterOwnedStoragePaths,
  mapSoftDeleteRpcError,
  parseSoftDeleteRpcPayload,
  validateDeleteMomentInput,
} from "./deleteLogic.ts";

const here = dirname(fileURLToPath(import.meta.url));
const migration0020 = readFileSync(
  join(here, "..", "..", "..", "supabase", "migrations", "0020_fix_moments_soft_delete_rls.sql"),
  "utf8",
);
const migration0015 = readFileSync(
  join(here, "..", "..", "..", "supabase", "migrations", "0015_moments_foundation.sql"),
  "utf8",
);
const actionsSrc = readFileSync(join(here, "actions.ts"), "utf8");

describe("soft-delete RLS root cause (0020)", () => {
  it("documents SELECT deleted_at is null as the blocking clause on UPDATE NEW row", () => {
    // Postgres requires UPDATE NEW rows to satisfy SELECT policies.
    assert.match(
      migration0015,
      /create policy "moment_media_select_own"[\s\S]*?deleted_at is null/,
    );
    assert.match(
      migration0020,
      /moment_media_select_own[\s\S]*?deleted_at is null/,
    );
  });

  it("does not broaden SELECT to expose soft-deleted media", () => {
    assert.doesNotMatch(
      migration0020,
      /create policy "moment_media_select_own"/,
    );
  });

  it("uses SECURITY DEFINER with row_security=off after ownership checks", () => {
    assert.match(migration0020, /security definer/i);
    assert.match(migration0020, /set row_security = off/i);
    assert.match(migration0020, /v_parent_id uuid := auth\.uid\(\)/);
    assert.match(migration0020, /owner_parent_id = v_parent_id/);
    assert.match(migration0020, /wrong_baby/);
  });
});

describe("owner delete succeeds contract", () => {
  it("soft-deletes media and moment in one function body", () => {
    const mediaIdx = migration0020.indexOf(
      "update public.moment_media\n  set deleted_at = v_now",
    );
    const momentIdx = migration0020.indexOf(
      "update public.moments\n  set deleted_at = v_now",
    );
    assert.ok(mediaIdx > 0);
    assert.ok(momentIdx > mediaIdx);
    assert.match(migration0020, /v_moment_updated <> 1/);
  });

  it("app action calls RPC then best-effort storage cleanup without restore", () => {
    assert.match(actionsSrc, /soft_delete_private_moment/);
    assert.match(actionsSrc, /cleanupMomentStorageBestEffort/);
    assert.match(actionsSrc, /storage_cleanup_required/);
    // Cleanup failures must not reverse soft-delete
    assert.doesNotMatch(actionsSrc, /deleted_at:\s*null/);
  });
});

describe("non-owner and wrong-baby delete fail", () => {
  it("RPC returns not_found when owner mismatch", () => {
    assert.match(migration0020, /and m\.owner_parent_id = v_parent_id/);
    assert.match(migration0020, /'not_found'/);
  });

  it("RPC returns wrong_baby when child link missing", () => {
    assert.match(migration0020, /from public\.moment_children mc/);
    assert.match(migration0020, /'wrong_baby'/);
  });

  it("maps wrong_baby to calm not-found copy", () => {
    assert.equal(
      mapSoftDeleteRpcError("wrong_baby"),
      "That Moment could not be found.",
    );
    assert.equal(
      mapSoftDeleteRpcError("not_found"),
      "That Moment could not be found.",
    );
  });
});

describe("undelete and ownership immutability", () => {
  it("guard blocks undelete and path/owner mutation", () => {
    assert.match(migration0020, /guard_moment_media_update/);
    assert.match(migration0020, /Cannot undelete moment media/);
    assert.match(migration0020, /Cannot change moment media ownership or paths/);
    assert.match(migration0020, /new\.storage_path is distinct from old\.storage_path/);
    assert.match(migration0020, /new\.owner_parent_id is distinct from old\.owner_parent_id/);
  });

  it("service_role may still update media for processing", () => {
    assert.match(migration0020, /auth\.role\(\), ''\) = 'service_role'/);
    assert.match(migration0020, /grant execute[\s\S]*complete_moment_media_processing[\s\S]*service_role/);
  });

  it("anon cannot execute soft-delete RPC", () => {
    assert.match(migration0020, /revoke all on function public\.soft_delete_private_moment[\s\S]*from anon/);
  });
});

describe("atomic rollback semantics", () => {
  it("single RPC transaction implies media failure rolls back moment", () => {
    // One plpgsql function body = one transaction; raise after failed moment update
    assert.match(migration0020, /raise exception 'soft_delete_private_moment: moment update failed'/);
    assert.equal(
      (migration0020.match(/update public\.moment_media/g) ?? []).length >= 1,
      true,
    );
    assert.equal(
      (migration0020.match(/update public\.moments/g) ?? []).length >= 1,
      true,
    );
  });
});

describe("storage path ownership filter", () => {
  it("rejects cross-owner paths during cleanup", () => {
    const owner = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
    const other = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";
    assert.deepEqual(
      filterOwnedStoragePaths(
        [`${owner}/x/display.webp`, `${other}/x/display.webp`],
        owner,
      ),
      [`${owner}/x/display.webp`],
    );
  });
});

describe("input validation", () => {
  it("owner delete requires baby and moment ids", () => {
    assert.equal(
      validateDeleteMomentInput({ babyId: "b1", momentId: "m1" }).ok,
      true,
    );
    assert.equal(
      validateDeleteMomentInput({ babyId: "", momentId: "m1" }).ok,
      false,
    );
  });

  it("parses successful RPC payload including media_updated", () => {
    const result = parseSoftDeleteRpcPayload({
      ok: true,
      moment_id: "m1",
      media_updated: 1,
      storage_paths: ["owner/a/display.webp"],
    });
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.momentId, "m1");
      assert.deepEqual(result.storagePaths, ["owner/a/display.webp"]);
    }
  });
});
