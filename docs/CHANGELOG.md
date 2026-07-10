# Changelog

## Milestone 2 – Glow Atlas

### Added
- Australia SVG
- Hierarchical zoom
- Progressive disclosure
- Glass state badges
- Responsive overlays

### Changed
- Home screen redesigned
- Circle card updated
- Reminder card refined

### Fixed
- Badge scaling
- Label overlap
- Overlay clipping

## v0.3 – Realtime Presence

### Added
- Supabase Presence Engine
- Live Atlas updates
- Heartbeat service
- Visibility detection
- Automatic reconnect
- Live cluster support

### Changed
- Glow Atlas now supports realtime data
- Demo presence is now a fallback only

### Fixed
- React hook state management
- Presence hook lifecycle

## v0.3

### Added

Realtime Presence Engine

Presence aggregation

Country clusters

State clusters

Realtime Glow Atlas

Automatic heartbeat

Automatic reconnect

Privacy-safe aggregation

Supabase realtime pipeline

## Unreleased

### Added

* Your Circle foundation screen (`/circle`) for Milestone 4 / Sprint 4.1.
* Circle feature module with typed repository reads over existing Circle schema.
* Calm circle header, Tonight’s Prompt placeholder, message-area states, and disabled composer shell.
* Navigation into Your Circle from bottom nav and Home “Enter Circle”.
* Animated Glow Atlas headline presence count.
* Animated state presence badge transitions.
* Realtime connection status indicator.
* Empty-state and low-user-state messaging.
* Reduced-motion support for Atlas animations.

### Improved

* Refined Glow Atlas lighting, glow, and transition behaviour.
* Improved accessibility labels, focus behaviour, and motion preferences.
* Improved realtime visual updates to reduce flicker.
* Optimised Atlas rendering and animation performance.

### Technical

* Completed Sprint 4.1 without database or schema changes.
* Sprint 4.1 `npm run lint` and `npm run build` passed; still awaiting manual testing, commit, and deployment.
* Completed Sprint 3.6 without database or schema changes.
* Confirmed `npm run lint` passes.
