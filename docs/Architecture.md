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
- Monitoring: dev-only `reportClientError` — Sentry recommended separately
- Audit docs: `SECURITY_AUDIT.md`, `RLS_ACCESS_MATRIX.md`, `KNOWN_ISSUES.md`
