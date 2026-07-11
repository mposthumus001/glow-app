# Calm placeholder audio (REPLACE BEFORE PRODUCTION)

These WAV files are **procedurally generated placeholders** for Sprint 5.3 private beta development and QA.

They are:

- Owned by Glow (generated in-repo; not scraped from the web)
- Short (~8s) loops for continuous soundscapes
- Intentionally low-fidelity so they are never mistaken for final art

## Replacement required

Before App Store / production launch, replace each file with properly licensed or Glow-owned production audio:

| File | Sound ID | Intended mood |
|------|----------|---------------|
| `soft-rain.wav` | `soft-rain` | Soft rainfall |
| `steady-hush.wav` | `steady-hush` | Steady white noise |
| `gentle-waves.wav` | `gentle-waves` | Gentle ocean |
| `quiet-evening.wav` | `quiet-evening` | Quiet night atmosphere |

Update `src/features/calm/catalogue.ts` `src` paths if filenames change.

Do not point the catalogue at arbitrary copyrighted CDN tracks.
