# Glow Moments — Storage & rollout (Sprint 9.1 + 9.2A)

## Prerequisites

1. Apply migration `0015_moments_foundation.sql`
2. Apply migration `0016_moments_image_processing.sql`
3. Run `supabase/ops/moments-verify-rls.sql` — confirm policies and bucket
4. Set environment variables:

```env
NEXT_PUBLIC_MOMENTS_ENABLED=false
SUPABASE_SERVICE_ROLE_KEY=<server-only>
```

On Vercel: add `SUPABASE_SERVICE_ROLE_KEY` to Project → Settings → Environment Variables (Production + Preview).  
Never prefix with `NEXT_PUBLIC_`. Required for Sprint 9.2A processing worker.

`NEXT_PUBLIC_MOMENTS_ENABLED` must remain `false` until Sprint 9.2B album UI QA.

## Storage bucket

Migration creates **`moments-private`** automatically:

| Property | Value |
|----------|-------|
| Public | `false` |
| Max file size | 8 MB (original upload) |
| MIME types | `image/jpeg`, `image/png`, `image/webp` |

## Path format (Sprint 9.2A)

```
{owner_parent_id}/{moment_id}/{media_id}/original.{jpg|png|webp}  ← upload (deleted after processing)
{owner_parent_id}/{moment_id}/{media_id}/display.webp             ← privacy-safe display (storage_path)
{owner_parent_id}/{moment_id}/{media_id}/thumb.webp               ← thumbnail
```

## Processing architecture

**Next.js Node.js trusted worker** (`sharp` + server-only service role):

1. Parent uploads to `original_path` via signed URL
2. `finalizeMomentMediaUpload` or `requestMomentMediaProcessing` claims row (`pending` → `processing`)
3. Server downloads original, MIME-sniffs, processes (EXIF strip, max 2048px WebP + 400px thumb)
4. Uploads `display.webp` + `thumb.webp`, deletes original
5. `complete_moment_media_processing` (service role) marks `ready`

Alternative Edge Function rejected: no mature `sharp` on Deno; Node route is simplest secure option.

API route: `POST /api/moments/process` `{ "mediaId": "..." }` (auth cookie required).

## Production rollout checklist

- [ ] Migration `0015` + `0016` applied to production
- [ ] `moments-verify-rls.sql` passes (12 system tags, table + storage policies)
- [ ] Bucket `moments-private` is **not** public
- [ ] `SUPABASE_SERVICE_ROLE_KEY` set on Vercel (server env only)
- [ ] `NEXT_PUBLIC_MOMENTS_ENABLED=false` until Sprint 9.2B UI QA
- [ ] Sentry DSN configured; verify no storage paths/URLs in test events
- [ ] Schedule orphan + stale processing review (`moments-orphan-cleanup.sql`, `moments-retry-processing.sql`)
- [ ] Quota audit baseline (`moments-quota-audit.sql`)
- [ ] Legal draft updated for children's photos (before enabling UI)

## Deferred to Sprint 9.2B

- Album UI (grid, detail, upload picker)
- Enable `NEXT_PUBLIC_MOMENTS_ENABLED=true` for beta testers
- Parent-facing outcome messaging wired in UI
