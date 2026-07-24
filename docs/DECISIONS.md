## 2026-07-24 — Calm 1A Support-first boundary

Decision:
Make `/calm/support` the default Calm destination through a server redirect from `/calm`. Keep three reviewed, typed, local Support exercises separate from Tonight and from all Baby/family data. Keep `/calm/sounds` available, but default it to a preparation state unless `NEXT_PUBLIC_CALM_SOUNDS_PREVIEW_ENABLED=true` was present at build time.

Reason:
Parents receive useful, optional wellbeing support without presenting placeholder audio as finished, creating a medical/therapeutic claim, storing emotional or completion data, or coupling Calm to Tonight.

Audio ownership:
When preview is enabled, the authenticated shell remains the only lifecycle owner of the singleton `CalmPlayerService` and its one `HTMLAudioElement`. The preview-off route returns before importing preview UI, and the shell does not mount the audio owner. The full `/calm/sounds` player and mini player are mutually exclusive.

Safety and privacy:
Support wording is general wellbeing content only. It contains no feeding, sleep, medical, therapeutic, or guaranteed-outcome advice. Operational monitoring may use stable exercise IDs and technical categories only; it must not record need selection, exercise text, inferred emotion, Baby context, volume, or timer behaviour.

Release blocker:
Sounds is not production-ready until placeholder WAVs are replaced or removed and agreed browser/device QA passes for playback controls, volume, timer, background/lock-screen behaviour, Media Session, failures, route continuity, logout, and cleanup. Disabling the public flag hides UI but does not remove files from `public/`.

---

## 2026-07-11 — Glow Calm foundation (Sprint 5.3)

Decision:
Ship Calm beta with a static typed sound catalogue in `src/features/calm/catalogue.ts` and a singleton `CalmPlayerService` owned by the authenticated `AppShell`. Use one `HTMLAudioElement` for the session. Persist volume / favourite / recent / selected sound id in `localStorage`. Do not auto-resume audible playback after refresh. Do not persist sleep timers. Use Glow-generated placeholder WAVs clearly marked for replacement. Do not wire `media_library` or seed CDN URLs for playback yet.

Reason:
Delivers a useful private Calm experience without pretending a CMS/CDN exists, without fake controls, and without music-app patterns. Matches existing singleton-service ownership (Presence). Keeps Atlas untouched.

Player ownership:
`useCalmPlayerLifecycle()` in AppShell keeps the service alive across routes; `LogoutButton` calls `handleLogout()`.

Limitation:
Placeholder audio only; iOS Safari background/lock playback unreliable; no listener counts, downloads, or stories in this sprint.

---

## 2026-07-11 — Baby foundation & basic tracking (Sprint 5.2)

Decision:
Ship a deliberately small Baby beta on `/baby` using the existing `baby_events` table. Extend the event-type enum only for formula / expressed milk / solids. Store nappy wet/dirty/both in `metadata.nappy_type`. Prefer completed sleep entries over a live timer. Resolve “today” in Australia/Sydney. Support edit + soft-delete with confirmation. Show a calm multi-baby selector when the family has more than one baby.

Reason:
Delivers useful private tracking for beta without medical advice, charts, notifications, or gamification. Reusing `baby_events` avoids parallel tables and keeps family RLS intact.

Timezone:
Australia/Sydney calendar day for summary counts; sleep duration clipped to day overlap.

Delete behaviour:
App soft-deletes (`deleted_at`); SELECT policies already hide soft-deleted rows. Hard DELETE remains RLS-permitted but unused by the client.

Limitation:
No dedicated baby profile editor yet (link to You). No realtime subscription on baby events — reconcile with a one-shot reload after mutation. Growth charts deferred.

---

## 2026-07-11 — Profile, settings, privacy & trust (Sprint 5.4)

Decision:
Ship a nested `/profile/*` settings area with server actions for parent/baby/Atlas privacy edits, private feedback and deletion-request tables, password reset via Supabase Auth email, and clearly labelled beta draft Privacy/Terms/Safety copy. Circle leave/rematch remains non-self-service. Calm preferences stay device-local.

Reason:
Private beta needs trustworthy account and privacy controls without billing, public profiles, or unfinished leave flows.

Legal:
Documents are drafts — not final legal advice; review required before public launch.

Limitation:
Deletion is request + manual processing; no support mailbox yet.

---

## 2026-07-11 — Permanent app shell (Sprint 5.1)

Decision:
Introduce a single authenticated route group `(app)` with `AppShell` owning mobile bottom nav, desktop side nav, safe areas, presence lifecycle, and global reconnect UI. Keep Atlas cluster realtime on Tonight and Circle messaging on `/circle` only. Primary destinations are Tonight, Circle, Baby, Calm, and You (Profile) — five maximum. Baby and Calm ship as intentional placeholders without fake data or audio.

Reason:
Gives Glow a stable consumer shell for private beta without a dashboard aesthetic, prevents duplicate realtime subscriptions across navigations, and keeps feature ownership clear.

Route map:
`/` Tonight · `/circle` · `/baby` · `/calm` · `/profile` · auth routes outside the shell.

Limitation:
Profile Atlas privacy is read-only until a dedicated settings sprint; Tonight still mixes some mock Circle preview copy.

---

## 2026-07-10

Decision:
Glow Atlas will use a permanent Australia SVG with overlay layers rather than a mapping library.

Reason:
Provides complete design control, smoother animations, and a stable foundation for realtime presence.

---

## 2026-07-10 — Circle realtime messaging

Decision:
Glow Circles messaging uses a dedicated client `CircleMessagingService` with optimistic sends, postgres_changes filtered by `circle_id`, and pure merge/dedupe helpers. Presentation components never talk to Supabase directly. Pagination is explicit (“Earlier messages”), not infinite scroll.

Reason:
Keeps the calm product tone, makes reconciliation/deduplication testable, mirrors the Presence service isolation pattern, and relies on existing RLS without schema changes.

---

## 2026-07-11 — Circle presence & typing channel ownership

Decision:
Extend the existing circle messaging channel to `circle:{circleId}` as the single owner of message inserts, ephemeral Presence, and typing Broadcast. Count unique `parentId`s (not sockets). Keep typing ephemeral with 300ms publish delay, 2s refresh, 3s expiry. Do not persist circle presence or typing to Postgres.

Reason:
Avoids duplicate subscriptions, matches Atlas’s unique-parent presence pattern, and keeps the Circle experience calm and privacy-safe without schema/RLS changes.

Limitation:
Presence/Broadcast are not RLS-scoped; membership is enforced by only joining after assignment. Private Realtime Authorization remains a future hardening step.

---

## 2026-07-16 — Production Circle assignment without auto-create

Decision:
Keep `assign_parent_to_circle` as the sole write path for membership after onboarding, but **stop auto-creating Circles** when no rule-matching active Circle has capacity. Return structured `no_match` for admins; show parents a calm holding state. Prefer filling fuller Circles under capacity.

Reason:
Private beta Circles are staff-seeded. Auto-create scattered one-person Circles and hid matching gaps. Explicit `no_match` keeps onboarding reliable while operators expand capacity via SQL.

Concurrency:
Per-parent advisory lock + `FOR UPDATE` on the chosen circle + post-lock member count re-check before insert.

Idempotency:
Return existing active membership; never move parents automatically.

See: migration `0013`, `docs/GlowCircles.md`, `supabase/ops/circle-assignment-admin-check.sql`.

---

## 2026-07-11 — Circle assignment engine (Sprint 4.4)

Decision:
Automatic Circle assignment runs only server-side via `public.assign_parent_to_circle` (SECURITY DEFINER). Matching reads `circle_rules`, respects active circle capacity, and prefers filling existing circles. **Historical note:** 4.4 also auto-created Circles when none matched; production policy as of 2026-07-16 returns `no_match` instead (migration 0013). Parents cannot INSERT into `circle_members` or `circles` directly — only staff or the definer function.

Reason:
Deterministic, idempotent, concurrency-safe matching without trusting client-provided circle IDs. Keeps assignment logic auditable in Postgres with advisory + row locks.

Concurrency:
Per-parent `pg_advisory_xact_lock(hashtext('circle_assign:' || parent_id))` plus `SELECT … FOR UPDATE OF circles` on the chosen circle before capacity check and insert.

Idempotency:
Return existing active membership unchanged; unique `(circle_id, parent_id)` constraint; ON CONFLICT reactivation for stale rows.

Baby age:
Earliest baby row; DOB → floor whole months; else due date (0 if future, else months since due); NULL if no dates — age-specific rules require a computed age.

Selection order:
1. rule `priority` ASC (lower = higher priority)
2. rule specificity DESC (non-null fields)
3. active member count DESC
4. circle `created_at` ASC
5. circle `id` ASC

Limitations:
No exact suburb matching; no cross-state assignment unless a wildcard rule allows it; unmatched parents wait in holding UI until staff expand Circles/rules; Realtime channel auth unchanged from 4.3.

---

## 2026-07-11 — Circle reactions & private read state (Sprint 4.5)

Decision:
Use existing `circle_message_reactions` with a migrated curated enum (`support`, `with_you`, `tiny_win`, `sending_care`). Extend the unified `circle:{id}` channel with reaction `postgres_changes`. Store private read state on `circle_members.last_read_message_id` with monotonic `advance_circle_read_state` RPC. Show aggregate reaction counts only — never reactor lists or per-message seen-by.

Reason:
Calm, supportive engagement without social pressure. Read state answers “where do I resume?” for the authenticated parent only.

Debounce:
Read writes debounced at 1500ms; require visible tab + observed/near-bottom messages.

Limitation:
Unread counts on nav are server-rendered on page load; live count updates inside Circle session only until next navigation.

---

## 2026-07-11 — Daily prompts & safety foundations (Sprint 4.6)

Decision:
Persist one daily prompt per circle per calendar date using a curated `prompt_library` and server-side `ensure_circle_daily_prompt`. Resolve “today” in **Australia/Sydney** and store `prompt_date` as a calendar `date`. Prompt responses reuse `circle_messages` with optional `prompt_id`. Safety MVP: constrained message reports (existing `reports` table + `reason_code`), durable per-user hide in `hidden_messages`, and crisis disclaimer copy. No automated moderation or admin UI.

Reason:
Calm, optional conversation starters without device-clock drift or AI runtime risk. Reports and hides stay private and scoped; hide survives refresh and realtime without new channels or full refetch.

Hide persistence:
Database table `hidden_messages` (not localStorage) for cross-device consistency.

Moderation boundary:
Store reports only; no punishment automation; moderator tooling deferred.

Limitation:
Report review is manual/off-platform for beta; Realtime channel authorization unchanged from 4.3.

---

## 2026-07-11 — Private beta audit & hardening (Sprint 6.1)

Decision:
Run Milestone 6 Sprint 6.1 as audit-only hardening for ~10 testers. Fix critical security and auth gaps (global `parents` SELECT, password-reset completion, raw error exposure). Document beta program comprehensively. Do **not** implement closed signup enforcement in-app this sprint — recommend Supabase Auth `before-user-created` hook checking `beta_testers` for Sprint 6.2.

Reason:
Private beta needs trust and operational clarity before invites. Closed signup requires Auth hook infrastructure not yet wired; manual allowlist + monitoring is acceptable for 10 known testers short-term.

RLS:
Migration `0009` scopes parent reads to self/staff/circle co-members; restricts `parent_baby_age_months`; adds message update trigger.

Tonight:
Remove mock Circle card; server-load real assignment state.

Monitoring:
Dev-only structured client error logging; recommend Sentry with PII scrubbing — no SDK until approved.

Beta access (Sprint 6.2 proposal):
```sql
-- Supabase Auth hook (before-user-created):
-- reject if lower(email) not in (select email from beta_testers)
```

Limitation:
`map_presence.parent_id` deanonymization remains; Calm placeholders remain; legal docs remain drafts.

---

## 2026-07-11 — Closed beta access (Sprint 6.2)

Decision:
Enforce private-beta signup with a staff-managed `beta_testers` allowlist. Primary gate is Supabase Auth **Before User Created** (Postgres function `hook_before_user_created_beta_allowlist`), available on Free and Pro. App-side `is_beta_email_allowed` boolean RPC + server action provide calm UX only — never client-only enforcement. Activation happens in `handle_new_user` (invited → active). Revocation blocks new signups; existing sessions require manual Auth user disable.

Reason:
~10 testers need a hard closed gate without building invitations UI or admin dashboards. Auth hook blocks direct Auth API bypass.

Schema:
`email_normalized` unique; status `invited` | `active` | `revoked`; staff-only RLS; notes never client-visible.

Ops requirement:
Migration `0010` creates the function; Michael must **enable** the hook in Dashboard → Authentication → Hooks. Disabling the hook reopens signup (emergency only).

Seed:
Template with placeholder emails; real emails never committed.

Limitation:
Revocation does not force-logout existing sessions; Auth hook enablement is manual.

---

## 2026-07-17 — Glow Moments & Family architecture (Milestone 9 spec)

Decision:
Introduce **Glow Moments** (private photo albums per child + Family Moments) and future **Shared Family** invite groups as a new subsystem. Do **not** reuse signup `public.families` as the sharing group — household scope stays for `babies` / `baby_events`. Use new `shared_families` for explicit Moment sharing.

Schema highlights:
- `moments` owned by `owner_parent_id`; default `visibility = private`
- `moment_children` join table (no direct `baby_id` on moments) for 0..N child links
- `moment_media` metadata + private bucket `moments-private`
- Signed upload/download URLs only — never permanent public URLs
- Age at occurred date **derived** from DOB/due date (extend `baby-age.ts`)
- System milestone tags are **labels**, not medical assessments
- Joining a Shared Family **never** auto-exposes existing private Moments

Reason:
Product requires flexible multi-child linking, explicit sharing, and separation from Circle peer support and baby tracking RLS. No Storage exists in repo today — clean-slate design.

Deferred:
Video v1; bulk download; co-parent implicit access (product TBD).

Docs:
`docs/Moments.md`, `docs/Family.md`

---

## 2026-07-17 — Glow Moments Sprint 9.1 foundation

Decision:
Implement private Moments foundation: migration `0015`, owner-only RLS (not household co-parent), `moment_children` join (no `baby_id` on moments), private bucket `moments-private`, signed URLs, 1 GB quota, 12 system tags, feature flag `NEXT_PUBLIC_MOMENTS_ENABLED`.

Reason:
Approved Milestone 9 architecture; separate sharing (`shared_families`) deferred to Sprint 9.5+.

Sprint 9.1 constraints:
- CHECK `moments_sprint91_private_only` + trigger blocks shared visibility
- Image processing not implemented — media stays `pending`
- No album UI until Sprint 9.2

Ops:
`supabase/ops/MOMENTS_ROLLOUT.md`, `moments-verify-rls.sql`

---

## 2026-07-20 — Glow Family Album foundation (Sprint 9.3)

Decision:
Ship Shared Family Album **database foundation only** in migration `0021`. New tables (`shared_families`, `shared_family_members`, `shared_family_invites`, `shared_family_moments`) are separate from signup `public.families`. Moments stay `visibility = private`; sharing is explicit per Moment via `shared_family_moments`. v1 roles: **owner** and **member** only — owner-only share/unshare. Invite tokens: 32-byte random hex, SHA-256 hash stored, **7-day** expiry, accept requires authenticated email match. Signed media via server boundary calling `shared_family_can_access_moment_media` — no broad Storage policies.

Reason:
Product requires trusted invite-based sharing without auto-exposing private child albums or conflating household RLS. Foundation-first lets UI/API ship in a later sprint with enforcement already in Postgres.

Schema:
- `owner_parent_id` / `parent_id` (= `auth.uid()`)
- Archive (not soft-delete) for shared families
- Membership history: `active` / `removed` / `left`
- No migration data backfill — zero `shared_family_moments` rows on deploy

Security:
- RPC-only group/member/invite/share creation (RLS INSERT blocked)
- Triggers prevent role escalation and final-owner removal
- Generic `invalid_invite` errors — no email enumeration

Deferred:
Family Album UI, invite email delivery, member-contributed Moments, ownership transfer on account deletion.

Docs:
`docs/FamilyAlbum.md`, `supabase/ops/shared-family-verify-0021.sql`, `sharedFamilyContract.test.ts`

---

## 2026-07-17 — Glow Moments Sprint 9.2A secure processing

Decision:
Trusted **Next.js Node.js route** + `sharp` with **server-only** `SUPABASE_SERVICE_ROLE_KEY` (not Supabase Edge Function).

Reason:
Edge lacks mature native image stack; Node route reuses existing Vercel deployment, keeps service role off the client, and satisfies EXIF strip / resize / WebP outputs without paid external services.

Implementation:
- Migration `0016` — `processing` enum, `original_path`, service-role completion RPCs
- `storage_path` = processed `display.webp`; original deleted after success
- Outcomes typed for Sprint 9.2B UI (`uploaded`, `processing`, `ready`, etc.)
- Idempotent claim/retry; stale processing reclaim after 10 minutes

---
