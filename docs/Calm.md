# Glow Calm

## Purpose

Create a peaceful, private sound experience for parents — soft soundscapes when they need a breath, not a feed.

Glow Calm must feel calm, premium, private, hopeful, and human.

It must **not** feel like a music streaming app, meditation marketplace, or engagement product.

---

## Beta scope (Sprint 5.3)

### Included

* Curated sound library (intentionally small)
* Shared audio player (play / pause / resume / stop / volume)
* Track selection (one sound at a time)
* Sleep timer (Off / 15 / 30 / 45 / 60 minutes)
* Favourite sound (one) + recent sound return path
* Graceful loading, empty, and failure states
* Playback preserved while navigating authenticated routes
* Media Session metadata where the browser supports it

### Categories

* Rain
* White Noise
* Ocean
* Night Sounds

### Excluded (this sprint)

* Subscriptions / premium gating UI
* Downloads / offline library
* User-uploaded audio
* AI-generated audio
* Social sharing / listener counts UI
* Playlists / recommendations
* Large content catalogue
* Sleep stories / guided meditation content packs
* Alarms or push notifications

---

## Player ownership

**Owner:** `CalmPlayerService` singleton, kept alive by `useCalmPlayerLifecycle()` in `AppShell`.

| Rule | Detail |
|------|--------|
| One audio element | Single `HTMLAudioElement` for the authenticated session |
| Route changes | Do not recreate the player; audio continues |
| Logout | `LogoutButton` calls `handleLogout()` — stops audio, clears timer |
| No multi-play | Selecting a new sound stops the previous source |

UI binds via `useCalmPlayer()` (`useSyncExternalStore`). A restrained `CalmMiniPlayer` appears in the shell when audio is active away from `/calm`.

---

## Sound catalogue source of truth

**Beta source:** static typed catalogue in `src/features/calm/catalogue.ts`.

Supabase `media_library` exists for a future CMS, but seed URLs point at a non-existent CDN and categories do not match the beta IA. Do not use it for Sprint 5.3 playback.

Each sound has: stable ID, title, category, description, audio `src`, continuous-loop flag, visual treatment, active flag, placeholder marker.

---

## Audio assets

Placeholder WAVs live in `public/calm/placeholders/` (Glow-generated, clearly marked for replacement).

**Production audio must be properly licensed or Glow-owned before launch.** See the folder README.

---

## Persistence

Device-local via `localStorage` key `glow.calm.prefs.v1`:

* Persists: volume, favourite sound, recent sound, selected sound id
* Does **not** auto-resume audible playback after full refresh
* Does **not** persist sleep timer (expired or active)

---

## Sleep timer

Absolute end timestamp (`sleepTimerEndsAt`). One watch interval at a time. Cancels cleanly. Expiry pauses playback. Cleared on logout. Recovers after brief backgrounding via wall-clock comparison (subject to browser timer throttling).

---

## Background / screen-lock limitations

| Platform | Expectation |
|----------|-------------|
| In-app navigation | Playback continues (shell-owned element) |
| Android Chrome | Often continues in background; Media Session helps lock-screen controls |
| iOS Safari | Background/lock playback is unreliable; may pause when the tab is suspended |
| Installed PWA | Better on Android; iOS still constrained by WebKit policies |
| Tab suspension | Browser may throttle timers; sleep timer uses absolute end time |

Do not promise lock-screen continuity on iOS Safari.

---

## Offline

If the browser has already cached a local placeholder asset, playback may continue. No download manager in this sprint. Remote/missing assets show a calm unavailable message.

---

## Accessibility

* Named play/pause/stop/favourite/volume/timer controls
* Selected state via text + border (not colour alone)
* `aria-live` for now-playing / timer remaining (restrained)
* Keyboard-operable controls with visible focus
* Reduced motion respected for decorative player glow

---

## Next sprint recommendation

* Replace placeholder WAVs with licensed production audio
* Optional: align `media_library` schema (descriptions, artwork, continuous flag) and migrate catalogue
* Optional: quiet listener presence (privacy-safe counts) — only if product still wants it
* Sleep stories / short meditations as a separate content pack
