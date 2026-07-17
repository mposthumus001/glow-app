# Glow Architecture

## Vision

Glow exists to ensure no parent feels alone.

Every feature should reinforce safety, calmness and connection.

---

## Core Modules

- Glow Atlas
- Glow Circles
- Glow Calm
- Glow Baby
- Glow Moments
- Glow Family
- Glow Learn
- Glow AI
- Profile
- Notifications
- Subscription

---

## Tech Stack

Next.js
TypeScript
TailwindCSS
Supabase
Vercel
Framer Motion

---

## Principles

Simple.

Calm.

Premium.

Privacy first.

Realtime.

Everything should feel effortless.

---

## Authenticated app shell (Sprint 5.1)

### Route map

| Path | Purpose | Shell |
|------|---------|-------|
| `/` | Tonight (default landing) | Yes |
| `/circle` | Your Circle | Yes |
| `/baby` | Baby tracking (profile, logs, today, recent) | Yes |
| `/calm` | Calm soundscapes + player | Yes |
| `/profile` | You / Settings | Yes |
| `/login` | Sign in | No |
| `/signup` | Sign up | No |
| `/onboarding` | First-run profile | No |

Unauthenticated access to shell routes redirects to `/login`.
Incomplete profiles redirect to `/onboarding`.

### Shell ownership

`src/app/(app)/layout.tsx` + `AppShell`:

- Mobile bottom navigation (5 destinations)
- Desktop/tablet side navigation
- Safe areas, background, content width via `GlowPage` / `GlowContainer`
- Global reconnect banner (presence connection only)
- Route `loading.tsx` / `error.tsx`
- Presence lifecycle via `usePresenceConnection` (stable across navigations)
- Calm player lifecycle via `useCalmPlayerLifecycle` + optional `CalmMiniPlayer`

### Realtime ownership

| Concern | Owner | Channel / source |
|---------|-------|------------------|
| Parent presence lifecycle | AppShell (`PresenceService`) | `glow-presence` + DB `presence` |
| Atlas map counts | Tonight (`useMapClusterPresence`) | `map_cluster_public` / `map_clusters` |
| Circle messages, presence, typing, reactions, read | Circle (`CircleMessagingService`) | `circle:{id}` |

Do not start Atlas or Circle subscriptions in the shell.

### Calm player ownership (Sprint 5.3)

| Concern | Owner |
|---------|-------|
| Single `HTMLAudioElement`, play/pause/stop/volume, sleep timer | `CalmPlayerService` (singleton) |
| Keep-alive across authenticated routes | `AppShell` → `useCalmPlayerLifecycle()` |
| Calm home UI | `src/features/calm` (`CalmScreen`) |
| Logout cleanup | `LogoutButton` → `handleLogout()` |

Sound catalogue source of truth for beta: static `src/features/calm/catalogue.ts` (not `media_library` yet). Details: `docs/Calm.md`.

### Loading and errors

- Soft skeletons (`ShellSkeleton`, Circle loading) — no large spinners
- Route `error.tsx` → `ShellError` with retry + back to Tonight
- Navigation remains available during page errors

### Baby (Sprint 5.2)

- Profile summary, feeding / sleep / nappy logging, today summary, recent activity
- Feature module: `src/features/baby`
- Details: `docs/Baby.md`

### Profile & settings (Sprint 5.4)

- Feature module: `src/features/profile`
- Nested `/profile/*` routes under the authenticated shell
- Deletion requests + in-app feedback tables (migration `0008`)
- Details: `docs/ProfileSettings.md`

### Private beta hardening (Sprint 6.1)

- Route inventory: 20 App Router routes (see `docs/BETA_TEST_CHECKLIST.md`)
- `not-found.tsx` at root and `(app)` for calm 404 recovery
- Password recovery panel after email reset link
- Tonight loads live Circle preview server-side (no mock data)
- RLS migration `0009` — scoped parent reads, message update guard
- Error mapping: `src/lib/errors/calm-messages.ts`
- Monitoring (Sprint 7.1): `@sentry/nextjs` when `NEXT_PUBLIC_SENTRY_DSN` is set; privacy scrubbing in `src/lib/monitoring/sentry-privacy.ts`; structured helpers in `report-error.ts`; feature-scoped route `error.tsx` + Atlas `FeatureErrorBoundary`
- Audit docs: `SECURITY_AUDIT.md`, `RLS_ACCESS_MATRIX.md`, `KNOWN_ISSUES.md`

### Closed beta access (Sprint 6.2)

| Concern | Owner |
|---------|-------|
| Allowlist source of truth | `public.beta_testers` |
| Signup gate (primary) | Auth Before User Created → `hook_before_user_created_beta_allowlist` |
| App UX check | `checkBetaSignupAccess` → `is_beta_email_allowed` (boolean only) |
| Activation | `handle_new_user` after Auth insert |
| Tester seeding | SQL template — never client UI |

Signup remains at `/signup` for invited testers. Login/signup copy states private beta. Hook must be enabled in Supabase Dashboard after migration `0010`. Details: `docs/Beta.md`.

### Circle assignment (production)

- Trigger: after successful onboarding (`completeOnboarding` → `assignParentToBestCircle`).
- Engine: Postgres `assign_parent_to_circle` (SECURITY DEFINER); clients cannot insert `circle_members`.
- Outcomes: `existing` | `assigned` | `no_match` (no auto-create Circles).
- Holding UI: `/circle` and Tonight preview — “We're finding the right Circle for you.”
- Details: `docs/GlowCircles.md`, admin SQL `supabase/ops/circle-assignment-admin-check.sql`.

### Monitoring & beta feedback (Sprint 7.1)

| Concern | Owner |
|---------|-------|
| Error monitoring | `@sentry/nextjs` — client, server, edge via `instrumentation.ts` |
| Privacy scrubbing | `scrubSentryEvent` — no message bodies, tokens, email, GPS |
| Operational vs unexpected | `reportOperationalFailure` / `reportUnexpectedException` |
| Structured beta feedback | `public.beta_feedback` (migration `0014`) |
| Legacy feedback rows | `public.app_feedback` (migration `0008`) — retained |

Sentry is **disabled** when no DSN is configured. Release tag: `glow-app@{APP_VERSION}`. Source maps upload on Vercel when `SENTRY_AUTH_TOKEN` is set.

Feedback UI: `/profile/help` → `FeedbackForm` (categories Bug / Confusing / Suggestion / Other). Staff read via `is_staff()` RLS only.

### Glow Moments & Family (Milestone 9 — specification)

| Concern | Owner / status |
|---------|----------------|
| Baby Moments (per child) | `src/features/moments/` (proposed) under `/baby` → Moments |
| Family Moments | `/family/moments` (proposed nav) |
| Media storage | Private Supabase bucket `moments-private`; signed URLs only |
| Sharing groups | `shared_families` — separate from signup `families` household |
| Default visibility | **Private** — explicit share per Moment |
| Age at photo date | Derived from DOB/due date — not stored |
| Milestone tags | Curated + custom labels — not medical assessments |
| Sentry | Extend scrubbing for captions, notes, storage paths; `feature_area: moments` |

**Not implemented yet.** Full spec: `docs/Moments.md`, `docs/Family.md`.

**Sprint 9.1 implemented:** migration `0015`, feature module `src/features/moments/`, private Storage bucket, RPCs, server actions. UI hidden behind `NEXT_PUBLIC_MOMENTS_ENABLED=false`.

**Sprint 9.2A implemented:** migration `0016`, trusted Node.js processing (`sharp` + server-only service role), `POST /api/moments/process`, EXIF strip, WebP display/thumb, original deletion. Album UI still deferred (9.2B).

**Existing primitives:** `babies`, `families` (household), `milestones` (text, unused in UI), `baby-age.ts` + `ageAtDate.ts`.

