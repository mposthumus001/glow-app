# Glow Calm

## Calm 1A route model

- `/calm` server-redirects to `/calm/support`; query parameters are not forwarded.
- `/calm/support` is the default, need-based wellbeing Support experience.
- `/calm/support/[slug]` renders one of three typed, local exercises.
- `/calm/sounds` is a valid route but defaults to an honest preparation state.
- The persistent Calm navigation exposes explicit Support and Sounds links. Active state uses `aria-current="page"`, weight, and an underline rather than colour alone.
- Tonight remains separate. Calm does not add exercises, state, or data access to Tonight.

Support content is static typed copy. It creates no database records, completion history, Baby context, emotional-state analytics, notifications, vibration, or audio.

## Reviewed Support wording

### One-minute breathing reset

Summary: “A short, gentle pause with your breath. You can do this in the position you are already in.”

1. “Let yourself stay exactly where you are. There is nothing you need to arrange first.”
2. “Notice your breath as it is. You do not need to make it deeper or slower.”
3. “When you are ready, breathe in gently. If counting helps, count to three. If it does not, leave the counting out.”
4. “Let the breath out without forcing it. You might count to four, or simply notice it leaving.”
5. “Take another easy breath in, then let it go. Continue only for as long as this feels useful.”
6. “Notice one place where your body is supported — the floor, a chair, a bed, or the wall behind you.”

Completion: “That is enough for now. You can repeat a step, stay still for a moment, or return to Glow.”

Safety note: “If focusing on your breath feels uncomfortable, stop and choose another support option.”

Metadata: `About 1 minute`; breathing; pause and skip supported; low-light mode off; version 1.

### Five-senses grounding

Summary: “A no-rush way to notice what is around you. Skip any sense that does not fit.”

1. “Look around and name up to five things you can see. One is enough if that is all you want to do.”
2. “Notice up to four things you can feel — clothing, a surface, the air, or the weight of something you are holding.”
3. “Listen for up to three sounds. They can be close by or further away.”
4. “Notice up to two scents, or simply notice that no scent stands out.”
5. “Notice one taste, or the feeling inside your mouth. You may skip this.”
6. “Choose one thing around you to notice again. There is nothing else you need to complete.”

Completion: “You can finish here, revisit any step, or move on with your night.”

Safety note: “Keep your attention on your surroundings and anything that needs your care. Skip any prompt that does not fit where you are.”

Metadata: `2–3 minutes`; grounding; skip supported; no timer or pause contract; low-light mode off; version 1.

### Tonight is hard reassurance

Summary: “A few quiet words for a difficult stretch of the night. Read only what feels useful.”

1. “This moment is hard. You do not have to make it feel meaningful.”
2. “You can care deeply and still wish this part were easier.”
3. “One difficult stretch does not define you or your family.”
4. “There is no need to solve the whole night right now. You can take it one small moment at a time.”
5. “If practical help from someone you trust is available, it is okay to ask for it.”
6. “You may stay with these words, return to an earlier line, or leave whenever you like.”

Completion: “There is nothing to complete here. Glow will still be here when you return.”

Safety note: “Glow offers general wellbeing support and is not a substitute for professional or emergency care.”

Metadata: `Read at your own pace`; reassurance; no timer, pause, or skip contract; low-light mode on; version 1.

## Content safety boundary

The exercises are optional general wellbeing support, not medical, therapeutic, feeding, sleep, or outcome advice. They make no diagnosis, treatment claim, feeding recommendation, sleep recommendation, or guaranteed-outcome claim. The breathing safety note is a precaution that tells the reader to stop if uncomfortable. The practical-help line is permission to seek support from a trusted person, not treatment advice. Shared safety copy links to `/profile/safety`; do not create a parallel emergency workflow.

Only stable exercise IDs and technical error categories may be used for operational monitoring. Never log selected need categories, exercise text, inferred emotion, Baby context, volume, or timer behaviour.

## Sounds preview flag

`NEXT_PUBLIC_CALM_SOUNDS_PREVIEW_ENABLED` must be exactly `true` to expose the temporary interactive Sounds preview. It should be unset or `false` in production-facing environments until Calm 1B QA is complete. Because this is a `NEXT_PUBLIC_` build-time variable, set it before `next build` and redeploy after changing it.

With the flag off:

- `/calm/sounds` shows “Soundscapes are still being prepared for the Glow beta.”
- the server route returns the standalone preparation component before dynamically importing preview UI;
- the shell does not mount the Calm audio owner;
- no player, catalogue, volume, timer, favourite control, subscription, selected sound, or audio element is initialised.

With the flag on, the authenticated shell owns one `CalmPlayerService` and one `HTMLAudioElement`. `CalmAudioOwner` is the only lifecycle owner. The full player is shown on `/calm/sounds`; the mini player is hidden there and at redirect-only `/calm`. Nothing autoplays on route entry. Selecting Play is the user action that may start audio.

## Placeholder assets and release blocker

The four WAV files under `public/calm/placeholders/` are procedurally generated in-repository, Glow-owned, short, low-fidelity development loops. Retain them only for private preview QA.

The flag hides UI; it does **not** remove files in `public/` from the deployment. Direct asset URLs remain distributable. Before general production or App Store readiness, replace them with approved licensed/Glow-owned production assets and update catalogue paths, or remove them from `public/` entirely.

Sounds is not production-ready until real approved assets and reliable play/pause/stop, volume, timer, background and lock-screen behaviour, Media Session, failure handling, route continuity, logout cleanup, and resource cleanup pass agreed browser/device QA. iOS Safari background playback must not be promised.

Recommended asset handoff: mastered compressed loops with documented creator/licence provenance, seamless-loop QA, loudness/peak targets agreed by product, accessible titles, and tested fallback/error behaviour. Avoid arbitrary copyrighted CDN tracks.

## Accessibility and privacy QA

- All exercise and audio controls are keyboard operable, visibly focused, and at least 44px high/wide.
- Step changes use a restrained polite live region and move focus to the current instruction.
- Decorative breathing motion respects reduced-motion preference.
- Exercise completion is optional and has no success/failure or streak language.
- Need cards stack on phones and must not introduce horizontal overflow.
- Audio preferences remain device-local; no emotional or exercise-completion profile is stored.

## Calm 1B Sounds architecture

### Ownership hierarchy

`AppShell` conditionally mounts one dynamically imported `CalmAudioOwner` when
either Sounds flag is enabled. `CalmAudioOwner` acquires the singleton
`CalmPlayerService` for the authenticated shell lifetime and renders
`CalmMiniPlayer` everywhere except `/calm` and `/calm/sounds`.
`/calm/sounds` dynamically imports `CalmScreen`, which renders the full
`CalmPlayerPanel` and catalogue. UI state subscribes through `useCalmPlayer`
and `useSyncExternalStore`.

The service creates its sole `HTMLAudioElement` lazily on the first track
selection. Merely mounting the shell owner, opening Support, visiting the
preparation state, or hydrating preferences creates no audio element. The
element is retained through authenticated client-side route transitions and is
unloaded on shell disposal or explicit logout.

### Feature modes

- Both flags missing or false: mode is `off`; `/calm/sounds` renders only the
  preparation state and AppShell imports no audio owner.
- `NEXT_PUBLIC_CALM_SOUNDS_PREVIEW_ENABLED=true`: mode is `preview`; only the
  four explicitly preview-only generated WAV records render.
- `NEXT_PUBLIC_CALM_SOUNDS_ENABLED=true`: mode is `production`; only enabled,
  production-approved records from the separate production catalogue render.
- If both flags are true, production takes precedence. Preview records are
  never merged into production.

Both variables are `NEXT_PUBLIC_` build-time settings. A change requires a new
build and deployment. The production flag must remain unset or false until at
least one licensed asset and its registry record pass validation and device QA.

### Playback semantics

- Playback starts only from a Play control or an OS Media Session Play action.
  Route entry, preference hydration, track selection without Play, and reload
  never autoplay.
- Pause retains the current position and leaves the absolute sleep-timer
  deadline running.
- Stop pauses, resets `currentTime` to zero, clears the timer, and retains the
  selected sound so the mini-player can restart it.
- Selecting another sound pauses and rewinds the previous source, replaces the
  source on the same audio element, and plays only after that user action.
- Reload restores valid selected/favourite/recent IDs and volume, but starts
  idle and creates no audio until Play.
- Route navigation, including Sounds to Support and other authenticated routes,
  retains playback. The full player appears only on `/calm/sounds`; the
  mini-player appears elsewhere whenever a valid sound remains selected.
- Browser tab visibility does not pause playback. Visibility and `pageshow`
  only re-check an active sleep-timer deadline.
- Logout or authenticated-shell disposal stops playback, unloads the source,
  clears selection and timer state, removes listeners and Media Session
  handlers, and retains only non-sensitive device preferences.
- Closing the browser ends playback under normal browser/OS lifecycle rules.
  Glow does not claim persistent background execution.
- A network loss may allow already-buffered bytes to continue. A subsequent
  load failure shows calm offline/load copy; reconnect does not autoplay.

### Sleep timer

Choices are Off, 15, 30, 45, and 60 minutes. A non-Off timer can be selected
only after a sound is selected. One scheduler owns one timeout against an
absolute epoch deadline; replacing a timer cancels the old timeout. The visible
countdown is presentational and is not the source of correctness. Stop, logout,
or expiry cancels and clears the timer. Expiry pauses and rewinds playback while
retaining the selected sound.

The deadline continues while playback is paused. Browsers may suspend
JavaScript in a background tab or when a phone sleeps; exact background timing
is not promised. When JavaScript resumes, the absolute deadline is checked and
an overdue timer fires once.

### Device-local favourites

Calm 1B uses local-first storage with key `glow.calm.prefs.v2`. It stores a
versioned array of sound IDs, clamped volume, recent ID, and selected ID. Parsing
deduplicates known IDs, drops unknown IDs, tolerates corrupt/unavailable
`localStorage`, and migrates the v1 single-favourite shape. No timer, listening
duration, account ID, wellbeing state, or analytics is stored. This gives
offline and low-migration-cost beta behaviour but no cross-device sync. A
database table, RLS, and account migration require a separate approved product
decision.

### Media Session

The service feature-detects `navigator.mediaSession` and `MediaMetadata`.
Supported browsers receive Play, Pause, and Stop handlers and neutral metadata:
the approved sound title and artist `Glow Sounds`. No artwork, child/family
information, Support category, emotional state, next/previous controls, or
position state is provided. Handlers and metadata are cleared on logout and
disposal.

Media Session API availability does not guarantee that a control is exposed by
the current OS, device, browser shell, or headset:

- iOS Safari 15+ exposes Media Session, but background audio and lock-screen
  behavior can still be interrupted by iOS resource policy, tab lifecycle,
  calls, other media, Low Power Mode, or browser termination.
- Android Chrome commonly exposes notification/lock-screen controls after
  user-initiated playback, but Android/OEM battery policy may suspend or kill
  Chrome in the background.
- Current Chromium, Safari, and Firefox desktop releases generally support
  Media Session, but media keys, Stop visibility, and background throttling
  vary by browser and operating system. Older/in-app browsers may provide only
  HTML audio controls.

Glow therefore supports the in-page controls as the contract and treats system
controls as a progressive enhancement.

### Catalogue and licensing gate

Sound metadata is split across:

- `src/features/calm/sounds/types.ts`
- `src/features/calm/sounds/catalogue.ts`
- `src/features/calm/sounds/validateCatalogue.ts`
- `src/features/calm/sounds/assetRegistry.ts`
- `docs/CalmAudioAssetRegister.md`

Metadata is plain text only. Production validation requires an enabled,
non-preview, production-approved catalogue record; a matching approved registry
record; matching format, byte size, version and SHA-256 checksum; a safe local
versioned path; and non-WAV production delivery. Missing or pending licensing
blocks production rendering.

### Caching and offline boundary

There is no service worker, audio Cache API use, download control, persistent
Storage API request, or offline promise. Current files under `public/` use
ordinary browser/hosting HTTP caching. Production assets should use immutable
versioned URLs and long-lived immutable caching only after deployment headers
or CDN behavior are explicitly configured and verified. A new asset version
must use a new URL so rollback and cache invalidation are deterministic.

### Monitoring and privacy

Private beta has no listening-history analytics. If operational playback
monitoring is added later, it may contain only `featureArea=calm`, a bounded
operation, stable sound ID, safe error/capability category, and timer operation
category. It must not contain volume, listening duration, chosen timer
duration tied to behavior, local listening time, Support/emotional category,
Baby/family data, full source URL, licence-document location, or free text.
