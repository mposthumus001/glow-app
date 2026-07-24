# Calm audio asset register

This register is the release gate for Glow Sounds audio. A production catalogue
record must match an **Approved** entry here and in
`src/features/calm/sounds/assetRegistry.ts`. An asset without documented
provenance, redistribution rights, checksum, and review may not render in
production.

## Accepted provenance

- Original Glow-owned recordings.
- Commissioned recordings with written rights to edit, loop, distribute, and
  redistribute inside the Glow app.
- Commercial royalty-free licences that explicitly permit app redistribution.
- Verified public-domain recordings with retained evidence of status.

YouTube, Spotify or Apple Music extraction; personal-use-only licences; unclear
free-download sites; licences prohibiting in-app redistribution; and assets
without retained proof are rejected.

## Production audio standard

- Primary delivery: AAC-LC in M4A at 96–128 kbps, with MP3 at 128 kbps as the
  broad-compatibility alternative when QA requires it.
- Optional secondary delivery: WebM/Opus only when a broadly compatible primary
  source is also present.
- Target duration: 5–10 minutes for natural soundscapes; shorter generated noise
  may loop only after device QA confirms that repetition is not perceptible.
- Loop: sample-accurate, with matching ambience, DC offset, phase, and level at
  the boundary. No click, codec-padding gap, or volume jump is acceptable.
- Loudness: target approximately -23 LUFS integrated, checked by ear at low
  mobile volume; true peak no higher than -2 dBTP.
- Fade treatment: do not bake a fade into a continuously looping boundary.
  Remove transient edges and use a transparent crossfade while mastering when
  needed. The delivered first and last samples must remain loop-compatible.
- Channels: stereo for spatial natural recordings; mono is acceptable for
  intentionally non-spatial noise and must be declared.
- Sample rate: 48 kHz.
- Maximum size: 10 MB per primary asset. Prefer 6–8 MB where quality permits.
- Strip location, creator workstation, comments, and other nonessential embedded
  metadata before delivery.
- Version immutable asset URLs, for example
  `/calm/audio/soft-rain.v1.m4a`. Never replace bytes at an existing versioned
  URL.
- Record a lowercase SHA-256 checksum of the exact deployed bytes.

## Current preview-only records

The four files in `public/calm/placeholders/` are procedurally generated,
Glow-owned, private-QA placeholders. Each is an 8-second, mono, 22.05 kHz,
16-bit PCM WAV file of 352,844 bytes. They are not production approved.

### soft-rain

- Asset ID: `soft-rain`
- Title: Soft Rain placeholder
- Creator/source: Glow procedurally generated test asset
- Licence type: Glow-owned development placeholder
- Proof: `public/calm/placeholders/README.md`
- Attribution: Not required
- Allowed usage: Private preview QA only
- Restrictions: Must not render in production Sounds
- Duration: 8 seconds
- Format: PCM WAV, mono, 22.05 kHz, 16-bit
- File size: 352,844 bytes
- SHA-256: `16925dc6e716f070ba101169527be219901057b2ccfdf2e5177010b2f53f9587`
- Version: `preview-1`
- Approval: Preview only
- Review date: 2026-07-24

### steady-hush

- Asset ID: `steady-hush`
- Title: Steady Hush placeholder
- Creator/source: Glow procedurally generated test asset
- Licence type: Glow-owned development placeholder
- Proof: `public/calm/placeholders/README.md`
- Attribution: Not required
- Allowed usage: Private preview QA only
- Restrictions: Must not render in production Sounds
- Duration: 8 seconds
- Format: PCM WAV, mono, 22.05 kHz, 16-bit
- File size: 352,844 bytes
- SHA-256: `4d9d3119123f29cda72a7290a0e8044884e82f6aac2b220dfa8084acbe727e0b`
- Version: `preview-1`
- Approval: Preview only
- Review date: 2026-07-24

### gentle-waves

- Asset ID: `gentle-waves`
- Title: Gentle Waves placeholder
- Creator/source: Glow procedurally generated test asset
- Licence type: Glow-owned development placeholder
- Proof: `public/calm/placeholders/README.md`
- Attribution: Not required
- Allowed usage: Private preview QA only
- Restrictions: Must not render in production Sounds
- Duration: 8 seconds
- Format: PCM WAV, mono, 22.05 kHz, 16-bit
- File size: 352,844 bytes
- SHA-256: `2275a413382aab61cb457ba6c8ba670662acc63bbbc85108aca25d5d5e450713`
- Version: `preview-1`
- Approval: Preview only
- Review date: 2026-07-24

### quiet-evening

- Asset ID: `quiet-evening`
- Title: Quiet Evening placeholder
- Creator/source: Glow procedurally generated test asset
- Licence type: Glow-owned development placeholder
- Proof: `public/calm/placeholders/README.md`
- Attribution: Not required
- Allowed usage: Private preview QA only
- Restrictions: Must not render in production Sounds
- Duration: 8 seconds
- Format: PCM WAV, mono, 22.05 kHz, 16-bit
- File size: 352,844 bytes
- SHA-256: `bcceb4c98af088ac9f971a275ac029d9701fbb9bf59afdf29c0146f6da5d3769`
- Version: `preview-1`
- Approval: Preview only
- Review date: 2026-07-24

## Template for a production candidate

Copy this section for every candidate:

- Asset ID:
- Title:
- Creator/source:
- Licence type:
- Proof-of-licence location:
- Attribution required:
- Attribution text:
- Allowed app usage:
- Restrictions:
- Duration:
- Loop QA result and reviewer:
- Loudness / true peak:
- Channels / sample rate / bitrate:
- Format:
- File size:
- SHA-256:
- Immutable source path:
- Version:
- Approval status: Pending
- Review date:
- Product approver:
- Legal/licensing approver:
- Device QA evidence:
