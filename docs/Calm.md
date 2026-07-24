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
