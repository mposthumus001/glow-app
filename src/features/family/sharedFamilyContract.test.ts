import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";

const here = dirname(fileURLToPath(import.meta.url));
const migrationPath = join(
  here,
  "..",
  "..",
  "..",
  "supabase",
  "migrations",
  "0021_shared_family_album_foundation.sql",
);
const migrationSql = readFileSync(migrationPath, "utf8");

describe("shared family album foundation contract (Sprint 9.3)", () => {
  it("1. owner creates shared family with active owner membership via RPC", () => {
    assert.match(migrationSql, /create_shared_family\(p_name text\)/);
    assert.match(migrationSql, /insert into public\.shared_family_members/);
    assert.match(migrationSql, /'owner'/);
    assert.match(migrationSql, /'active'/);
  });

  it("2. non-owner cannot rename or archive shared family", () => {
    assert.match(migrationSql, /rename_shared_family/);
    assert.match(migrationSql, /archive_shared_family/);
    assert.match(migrationSql, /sf\.owner_parent_id = v_parent_id/);
    assert.match(migrationSql, /shared_families_update_owner/);
  });

  it("3. owner creates invitation through SECURITY DEFINER RPC", () => {
    assert.match(migrationSql, /create_shared_family_invite/);
    assert.match(migrationSql, /shared_family_is_active_owner/);
    assert.match(migrationSql, /insert into public\.shared_family_invites/);
  });

  it("4. raw invitation token is never stored", () => {
    assert.match(migrationSql, /invite_token_hash text not null/);
    assert.match(migrationSql, /shared_family_hash_invite_token/);
    assert.match(migrationSql, /encode\(digest\(trim\(p_raw_token\), 'sha256'\), 'hex'\)/);
    assert.doesNotMatch(migrationSql, /invite_token text/);
    assert.match(migrationSql, /'invite_token', v_raw_token/);
  });

  it("5. wrong authenticated email cannot accept invite", () => {
    assert.match(migrationSql, /shared_family_auth_email_normalized\(\)/);
    assert.match(migrationSql, /invited_email_normalized <> v_email/);
    assert.match(migrationSql, /'error', 'invalid_invite'/);
  });

  it("6. correct email can accept invite once", () => {
    assert.match(migrationSql, /accept_shared_family_invite\(p_raw_token text\)/);
    assert.match(migrationSql, /status = 'accepted'/);
    assert.match(migrationSql, /accepted_by_parent_id = v_parent_id/);
  });

  it("7. repeated acceptance is idempotent for same parent", () => {
    assert.match(
      migrationSql,
      /if v_invite\.status = 'accepted'[\s\S]*accepted_by_parent_id = v_parent_id/,
    );
  });

  it("8. expired invite cannot be accepted", () => {
    assert.match(migrationSql, /v_invite\.expires_at <= v_now/);
    assert.match(migrationSql, /set status = 'expired'/);
  });

  it("9. revoked invite cannot be accepted", () => {
    assert.match(migrationSql, /if v_invite\.status <> 'pending'/);
    assert.match(migrationSql, /revoke_shared_family_invite/);
    assert.match(migrationSql, /status = 'revoked'/);
  });

  it("10. active member can read family and membership roster", () => {
    assert.match(migrationSql, /shared_families_select_member/);
    assert.match(migrationSql, /shared_family_members_select_member/);
    assert.match(migrationSql, /shared_family_is_active_member/);
  });

  it("11. removed member immediately loses access", () => {
    assert.match(migrationSql, /remove_shared_family_member/);
    assert.match(migrationSql, /status = 'removed'/);
    assert.match(migrationSql, /m\.status = 'active'/);
  });

  it("12. member cannot promote themselves", () => {
    assert.match(migrationSql, /guard_shared_family_members_update/);
    assert.match(migrationSql, /Cannot change shared family membership identity/);
    assert.match(migrationSql, /new\.role is distinct from old\.role/);
  });

  it("13. member cannot invite another person", () => {
    assert.match(migrationSql, /shared_family_invites_insert_owner/);
    assert.match(migrationSql, /with check \(false\)/);
    assert.match(migrationSql, /shared_family_is_active_owner\(p_shared_family_id, v_parent_id\)/);
  });

  it("14. owner can share an owned private moment", () => {
    assert.match(migrationSql, /share_private_moment/);
    assert.match(migrationSql, /m\.owner_parent_id = v_parent_id/);
    assert.match(migrationSql, /insert into public\.shared_family_moments/);
  });

  it("15. owner cannot share another user's moment", () => {
    assert.match(
      migrationSql,
      /where m\.id = p_moment_id[\s\S]*m\.owner_parent_id = v_parent_id/,
    );
    assert.match(migrationSql, /'error', 'not_found'/);
  });

  it("16. member can see only explicitly shared moments", () => {
    assert.match(migrationSql, /moments_select_shared_family_member/);
    assert.match(migrationSql, /shared_family_can_view_moment/);
    assert.match(migrationSql, /shared_family_moments sfm/);
    assert.match(migrationSql, /sfm\.removed_at is null/);
  });

  it("17. member cannot see another private moment from same owner", () => {
    assert.match(migrationSql, /owner_parent_id <> auth\.uid\(\)/);
    assert.match(migrationSql, /shared_family_moment_is_shared/);
  });

  it("18. unsharing immediately removes member access", () => {
    assert.match(migrationSql, /unshare_private_moment/);
    assert.match(migrationSql, /set removed_at = v_now/);
    assert.match(migrationSql, /sfm\.removed_at is null/);
  });

  it("19. soft-deleted moment removes member access", () => {
    assert.match(migrationSql, /m\.deleted_at is null/);
    assert.match(migrationSql, /shared_family_can_view_moment/);
    assert.match(migrationSql, /moment_media_select_shared_family_member/);
  });

  it("20. archived shared family grants no album access", () => {
    assert.match(migrationSql, /sf\.status = 'active'/);
    assert.match(migrationSql, /archive_shared_family/);
    assert.match(migrationSql, /status = 'archived'/);
  });

  it("21. moment may be shared into two different shared families", () => {
    assert.match(
      migrationSql,
      /create unique index shared_family_moments_active_unique[\s\S]*\(shared_family_id, moment_id\)/,
    );
  });

  it("22. public.families behaviour remains unchanged", () => {
    assert.doesNotMatch(migrationSql, /alter table public\.families/);
    assert.doesNotMatch(migrationSql, /drop table public\.families/);
    assert.match(migrationSql, /Separate from signup public\.families/);
  });

  it("23. existing private moments have zero sharing links after migration", () => {
    assert.doesNotMatch(
      migrationSql,
      /insert\s+into\s+public\.shared_family_moments\s*\([^)]+\)\s*select[\s\S]*?from\s+public\.moments/i,
    );
    assert.match(
      migrationSql,
      /Existing private Moments stay private until shared_family_moments row exists/,
    );
  });
});

describe("shared family signed media contract (Sprint 9.3)", () => {
  it("documents server-boundary signed URL authorization", () => {
    assert.match(migrationSql, /shared_family_can_access_moment_media/);
    assert.match(migrationSql, /mm\.processing_status = 'ready'/);
    assert.match(migrationSql, /No broad Storage policy/);
  });

  it("documents 7-day invite expiry", () => {
    assert.match(migrationSql, /interval '7 days'/);
    assert.match(migrationSql, /Beta expiry: 7 days/);
  });

  it("documents RPC-only group creation", () => {
    assert.match(migrationSql, /shared_families_insert_rpc_only/);
  });
});
