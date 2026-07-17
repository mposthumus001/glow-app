# Glow Database

Version

2.0

## Main Tables

parents

families

babies

presence

map_clusters

circles

circle_members

circle_rules

circle_messages

baby_events

media_library

preferences

subscriptions

analytics_events

reports

moderation_actions

daily_activity

connections

account_deletion_requests

app_feedback

---

All tables use RLS.

Supabase Auth is the source of identity.

Presence never stores exact GPS.

---

## Profile & trust (Sprint 5.4)

### Tables (migration 0008)

* `account_deletion_requests` — pending / cancelled / processed; one pending per parent
* `app_feedback` — private feedback messages

### RLS

| Table | User can |
|-------|----------|
| `account_deletion_requests` | SELECT own; INSERT pending; UPDATE own pending → cancelled |
| `app_feedback` | SELECT / INSERT own |

Staff may SELECT (and update deletion for processing). Users cannot mark deletion as processed.

### Notes

Exact GPS remains forbidden on presence writes. Atlas privacy edits sync `parents`, `preferences`, and `presence`.

---

## RLS hardening (Sprint 6.1 — migration 0009)

| Change | Detail |
|--------|--------|
| `parents_select_scoped` | Replaces global SELECT — self, staff, or circle co-members only |
| `shares_active_circle_with()` | Helper for co-membership checks |
| `parent_baby_age_months` | Requires `auth.uid()` or staff |
| `guard_circle_message_update` | Users cannot alter `moderation_status`, `circle_id`, `parent_id`, `prompt_id`, `deleted_at` |

Full matrix: `docs/RLS_ACCESS_MATRIX.md`

---

## Closed beta access (Sprint 6.2 — migration 0010)

### Table upgrades (`beta_testers`)

| Column | Purpose |
|--------|---------|
| `email_normalized` | Unique allowlist key (`lower(trim(email))`) |
| `status` | `invited` \| `active` \| `revoked` |
| `activated_at` | Set when account created |
| `revoked_at` | Set when revoked |

### Functions

| Function | Caller | Purpose |
|----------|--------|---------|
| `is_beta_email_allowed(email)` | anon / authenticated | Boolean UX check — no row exposure |
| `hook_before_user_created_beta_allowlist(event)` | `supabase_auth_admin` only | Before User Created Auth hook |
| `normalize_beta_email(email)` | helpers | Trim + lowercase |

### RLS

| Policy | Access |
|--------|--------|
| `beta_testers_select_staff` | admin/support SELECT only |
| `beta_testers_write_staff_only` | admin/support writes |

Normal clients cannot list or self-insert the allowlist. Notes stay staff/SQL-only.

### Activation

`handle_new_user` updates matching `invited`/`active` row → `active` + `parent_id` (idempotent).

### Auth hook

Enable manually in Dashboard after applying `0010`. See `docs/RELEASE_CHECKLIST.md`.

---

## Hotfix — `circle_messages.prompt_id` (migration 0011)

Defined originally in `0006`. Production may miss the column (PGRST204). Migration `0011_circle_messages_prompt_id.sql` is idempotent:

* nullable `prompt_id uuid`
* FK → `circle_prompts(id)` ON DELETE SET NULL
* partial index when not null
* no RLS changes

After apply: `NOTIFY pgrst, 'reload schema';` then retest Circle send.


---

## Baby tracking (Sprint 5.2)

### Table

`baby_events` — family-scoped care events (existing from 0001).

### Enum additions (migration 0007)

`baby_event_type` gains: `formula`, `expressed_milk`, `solids`.

### Metadata conventions

* Nappy: `{"nappy_type":"wet"|"dirty"|"both"}`
* Other feed: `{"tracking":"feeding_other"}` with `event_type = note`

### RLS (0007)

| Policy | Change |
|--------|--------|
| `baby_events_update_family` | WITH CHECK also requires `family_owns_baby(baby_id)` |
| `baby_events_delete_family` | Recreated (unchanged semantics); app uses soft-delete |

Soft-delete: set `deleted_at`; SELECT policies require `deleted_at is null`.

### Indexes (existing)

* `(baby_id, started_at desc)` where not deleted
* `family_id`, `parent_id`, `event_type`

---

## Circle assignment (Sprint 4.4 + migration 0013)

### RPC

`assign_parent_to_circle(p_parent_id uuid default auth.uid()) → jsonb`

* SECURITY DEFINER; callable by authenticated users for self only (staff may assign any parent).
* Returns one of:
  * `{ outcome: "existing"|"assigned", circle_id, membership_id }`
  * `{ outcome: "no_match", reason, parent_id, parent_state, feeding_method, first_child, baby_age_months }`
* **Does not auto-create Circles** (changed in migration `0013_circle_assignment_no_auto_create.sql`).
* App wrapper: `assignParentToBestCircle` in `CircleAssignmentRepository`.

### Helpers

* `parent_baby_age_months(parent_id)` — documented whole-month age rule.
* `circle_rule_matches_parent(...)` — wildcard/null rule fields.
* `circle_active_member_count(circle_id)` — active, non-deleted members only.

### Concurrency

Per-parent advisory lock + `FOR UPDATE` on the chosen circle + post-lock capacity re-check before insert.

### RLS changes (migration 0004; still in force)

| Policy | Change |
|--------|--------|
| `circle_members_insert_self` | **Dropped** — parents cannot self-join |
| `circle_members_insert_staff` | **Added** — staff-only direct insert |
| `circles_insert_authenticated` | **Dropped** |
| `circles_insert_staff` | **Added** |

Read/update policies for members unchanged. Message isolation unchanged (`circle_messages` scoped to active membership).

### Admin visibility

`supabase/ops/circle-assignment-admin-check.sql` — onboarding, membership, unmatched parents, capacity.

### Backfill

Unassigned onboarded parents: sign in and visit `/circle` — one assignment attempt per page load (idempotent). `no_match` shows holding copy until staff add capacity/rules.

---

## Reactions & read state (Sprint 4.5)

### Tables

* `circle_message_reactions` — curated enum `reaction_type`
* `circle_members.last_read_message_id` — private read marker (added in 0005)

### RPC

`advance_circle_read_state(circle_id, message_id)` — monotonic read advance for `auth.uid()`.

### RLS

Reactions: existing policies from 0001 (members read/insert own delete). Read marker: `circle_members_update_self` (own row only).

---

## Daily prompts & safety (Sprint 4.6)

### Tables

* `prompt_library` — curated templates (`title`, `prompt_text`, `is_active`)
* `circle_prompts` — per-circle daily prompt (`circle_id`, `prompt_date`, unique)
* `hidden_messages` — per-parent hidden message ids
* `circle_messages.prompt_id` — optional FK to `circle_prompts`
* `reports.reason_code` — enum constrained report reasons

### RPC

`ensure_circle_daily_prompt(circle_id)` — idempotent daily assignment (SECURITY DEFINER).

### Helpers

* `australian_prompt_date()` — calendar date in Australia/Sydney
* `prompt_library_index(circle_id, prompt_date)` — deterministic hash modulo library size

### RLS (migration 0006)

| Table | Policy |
|-------|--------|
| `circle_prompts` | Active members SELECT |
| `hidden_messages` | Own rows SELECT / INSERT / DELETE |
| `reports` | Insert requires active membership for message's circle; SELECT own (+ staff) |

Reports are not exposed through normal Circle message queries.

---

## Glow Moments & Family (Milestone 9 — proposed)

**Status:** Specification only. See `docs/Moments.md`, `docs/Family.md`.

### New tables (planned)

| Table | Purpose |
|-------|---------|
| `moments` | Photo memory metadata; `owner_parent_id`, `occurred_on`, visibility |
| `moment_children` | 0..N baby links (no direct `baby_id` on moments) |
| `moment_media` | Storage path metadata, processing status |
| `moment_tags` | System + custom tags |
| `moment_tag_links` | Moment ↔ tag |
| `shared_families` | Invite-based sharing groups (≠ signup `families`) |
| `shared_family_members` | Roles: owner, contributor, viewer |
| `shared_family_invitations` | Email invites, hashed token, expiry |
| `moment_share_audits` | Share/unshare audit trail |

### Storage (planned)

| Bucket | Access |
|--------|--------|
| `moments-private` | Private; signed upload/download URLs only |

Path: `{owner_parent_id}/{moment_id}/{media_id}/original.{ext}`

### RLS principles

- Default: owner-only read/write on moments and media metadata
- Shared access only when `visibility = shared_family` AND active membership
- Joining a group **does not** expose existing private rows
- Storage policies mirror DB ownership via path prefix + server-minted signed URLs
- Prefer SECURITY DEFINER RPCs for invite accept and visibility changes

Full permission matrix: `docs/SECURITY_AUDIT.md` §7.

### Distinction from existing tables

| Existing | Moments relationship |
|----------|---------------------|
| `families` | Internal household scope (`family_id` on moments) — not sharing |
| `milestones` | Text milestones in baby tracking — separate from Moment tags |
| `media_library` | Calm audio URLs — not photo storage |

---

## Glow Moments foundation (Sprint 9.1 — migration 0015)

**Status:** Implemented in code; apply migration + bucket verification before use.

### Tables

| Table | Purpose |
|-------|---------|
| `moments` | Private metadata; `owner_parent_id`, `family_id`, `occurred_on`, CHECK private-only |
| `moment_children` | Baby links (0..N) |
| `moment_media` | Storage paths, processing status, quota bytes |
| `moment_tags` | 12 seeded system tags + custom owner tags |
| `moment_tag_links` | Moment ↔ tag |

### RPCs

| Function | Purpose |
|----------|---------|
| `create_private_moment` | Atomic moment + children + tags |
| `create_moment_media_upload_slot` | Pending media + paths + quota check |
| `finalize_moment_media_upload` | Post-upload metadata (ready blocked in 9.1) |
| `moments_parent_media_bytes` | Quota calculation |

### Storage

Bucket `moments-private` (private, 8 MB, jpeg/png/webp). Ops: `supabase/ops/MOMENTS_ROLLOUT.md`.

### Feature flag

`NEXT_PUBLIC_MOMENTS_ENABLED=false` until Sprint 9.2B album UI.

---

## Glow Moments image processing (Sprint 9.2A — migration 0016)

### `moment_media` additions

| Column | Purpose |
|--------|---------|
| `original_path` | Upload target; deleted after processing |
| `storage_path` | Processed `display.webp` (signed download when `ready`) |
| `processed_size_bytes` / `thumbnail_size_bytes` | Quota + metadata |
| `processing_error_code` | Safe codes only (no paths/filenames) |
| `original_cleanup_required` | Original delete failed after `ready` |
| `processing_started_at` / `processing_completed_at` | Stale claim detection |

### RPCs (9.2A)

| Function | Caller | Purpose |
|----------|--------|---------|
| `claim_moment_media_processing` | authenticated owner | `pending`/`failed`/stale → `processing` |
| `complete_moment_media_processing` | service_role only | Mark `ready` |
| `fail_moment_media_processing` | service_role only | Mark `failed` |
| `retry_moment_media_processing` | authenticated owner | `failed` → `pending` |

Ops: `supabase/ops/moments-retry-processing.sql`, `moments-orphan-cleanup.sql`.

Details: `docs/Moments.md`.
