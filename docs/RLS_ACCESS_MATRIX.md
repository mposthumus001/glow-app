# RLS Access Matrix — Glow Private Beta

Sprint 6.1 audit. Source: migrations `0001`–`0009`. Enforcement: Postgres RLS + SECURITY DEFINER RPCs + triggers.

Legend: **Staff** = moderator / support / admin. **Circle member** = active `circle_members` row.

| Table | SELECT | INSERT | UPDATE | DELETE | Enforcement | Test coverage |
|-------|--------|--------|--------|--------|-------------|---------------|
| `parents` | Self, staff, circle co-members (0009) | Own on signup trigger | Own (`id = auth.uid()`) | — | RLS + `protect_parent_privileged_columns` | `rlsContract.test.ts` |
| `families` | Family members | Trigger only | Family members | — | RLS | Manual |
| `babies` | Family members | Family + owns baby | Family members | Family members | RLS | `authContract.test.ts` |
| `baby_events` | Family (`deleted_at` null) | Family + `family_owns_baby` | Family + owns baby (0007) | Family | RLS | `eventLogic.test.ts`, `authContract.test.ts` |
| `preferences` | Own | Own | Own | — | RLS | Manual |
| `presence` | Own row only | Own | Own | — | RLS | Manual |
| `map_clusters` | All authenticated | Service role trigger | — | — | RLS (read-all by design) | Manual |
| `map_presence` (view) | All authenticated | — | — | — | View owner bypasses RLS | Manual — **known deanonymization risk** |
| `circles` | All authenticated | Staff only (0004) | Staff | — | RLS | `assignmentLogic.test.ts` |
| `circle_rules` | All authenticated | Staff | Staff | Staff | RLS `using (true)` | Manual |
| `circle_members` | Self or circle peer | Staff / assignment RPC | Self or staff | — | RLS | `assignmentLogic.test.ts` |
| `circle_messages` | Active members | Active members (`clean`) | Own body only (0009 trigger) | — | RLS + `guard_circle_message_update` | `messageLogic.test.ts` |
| `circle_message_reactions` | Circle members | Active members | — | Own | RLS | `reactionLogic.test.ts` |
| `circle_prompts` | Active members | RPC only | — | — | RLS + `ensure_circle_daily_prompt` | `promptLibrary.test.ts` |
| `prompt_library` | Active rows | — | — | — | RLS read-only | `promptLibrary.test.ts` |
| `hidden_messages` | Own | Own (member) | — | Own | RLS | `hideLogic.test.ts` |
| `reports` | Own + staff | Member w/ message access | Staff | — | RLS | `reportLogic.test.ts` |
| `account_deletion_requests` | Own + staff | Own pending | Own cancel / staff process | — | RLS | `trustContract.test.ts` |
| `app_feedback` | Own + staff | Own | — | — | RLS | `trustContract.test.ts` |
| `beta_testers` | Staff only (0010) | Staff | Staff | Staff | RLS + Auth hook | `rlsContract.test.ts`, `beta-access.test.ts` |
| `subscriptions` | Own | — | — | — | RLS read-only | Manual |
| `media_library` | All authenticated | Admin/support | Admin/support | Admin/support | RLS | `catalogue.test.ts` (client catalogue) |
| `analytics_events` | Staff | Auth (own/null parent) | — | — | RLS | Manual |
| `moderation_actions` | Staff | Staff | — | — | RLS | Manual |
| `devices` | Own | Own | Own | Own | RLS | Manual |
| `milestones` | Family | Family | Family | Family | RLS | Manual |
| `circle_invites` | Party/staff | Member pending | Party/staff + trigger | — | RLS + trigger | Manual |
| `connections` | Party/staff | Requester | Party/staff + trigger | Either party | RLS + trigger | Manual |
| `daily_activity` | Own + staff | Own | Own | — | RLS | Manual |
| `daily_messages` | Active | Admin/support | Admin/support | Admin/support | RLS | Manual |

## SECURITY DEFINER RPCs (user-callable)

| Function | Who may call | Guard |
|----------|--------------|-------|
| `assign_parent_to_circle` | Self or staff | Locks + capacity inside function |
| `ensure_circle_daily_prompt` | Active circle member | Membership check |
| `advance_circle_read_state` | Invoker (RLS) | Own membership row |
| `parent_baby_age_months` | Self or staff (0009) | `auth.uid()` check |
| `shares_active_circle_with` | Authenticated | Used in RLS only |
| `is_beta_email_allowed` | anon / authenticated | Boolean only — no allowlist rows |
| `hook_before_user_created_beta_allowlist` | `supabase_auth_admin` | Before User Created |

## Service-role only

| Function | Purpose |
|----------|---------|
| `refresh_map_clusters` | Rebuild aggregates |
| `expire_stale_presence_and_refresh_clusters` | Stale cleanup |

## Sprint 6.1 changes (migration `0009`)

1. Replaced `parents_select_authenticated` (global) with `parents_select_scoped`.
2. Added `shares_active_circle_with()` helper.
3. Restricted `parent_baby_age_months()` to self or staff.
4. Added `guard_circle_message_update` trigger — users may only edit message body fields.

## Sprint 6.2 changes (migration `0010`)

1. `beta_testers` status lifecycle + `email_normalized` unique key.
2. Staff-only SELECT/WRITE on allowlist (no own-row listing).
3. `is_beta_email_allowed` boolean RPC for app UX.
4. `hook_before_user_created_beta_allowlist` for Auth Before User Created (Dashboard enable required).
5. `handle_new_user` activates invited → active on signup.

## Remaining risks (documented, not fixed this sprint)

| Risk | Severity | Notes |
|------|----------|-------|
| `map_presence.parent_id` visible | Medium | Correlates online users; mitigated by small beta cohort |
| Circle co-members see full `parents` row columns | Medium | App selects `display_name` only; policy still row-wide |
| Realtime channels not RLS-filtered | Medium | Client joins only after assignment |
| k=5 suburb anonymity with ~10 testers | Low–Medium | Low-traffic suburbs may not cluster |

## Manual verification checklist

- [ ] Two accounts in same Circle can read each other's `display_name` via messages join
- [ ] Two accounts in different Circles cannot SELECT unrelated `parents` rows (0009)
- [ ] `parent_baby_age_months(other_uuid)` returns permission denied for non-staff
- [ ] User cannot UPDATE own message `moderation_status` or `circle_id`
- [ ] No `service_role` key in browser bundle (`npm run build` + source grep)
