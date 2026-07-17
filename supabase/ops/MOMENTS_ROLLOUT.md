# Glow Moments — Storage & rollout (Sprint 9.1)

## Prerequisites

1. Apply migration `0015_moments_foundation.sql`
2. Run `supabase/ops/moments-verify-rls.sql` — confirm policies and bucket
3. Set environment variable (optional until Sprint 9.2 UI):

```env
NEXT_PUBLIC_MOMENTS_ENABLED=false
```

On Vercel: add to Project → Settings → Environment Variables for Preview/Production.  
Value must be exactly `true` to enable server actions and future UI.  
When `false`, schema exists but actions return “Moments are not available yet.”

## Storage bucket

Migration creates **`moments-private`** automatically:

| Property | Value |
|----------|-------|
| Public | `false` |
| Max file size | 8 MB |
| MIME types | `image/jpeg`, `image/png`, `image/webp` |

If migration bucket insert fails (permissions), create manually in Dashboard:

1. Storage → New bucket → `moments-private`
2. Public: **off**
3. File size limit: **8388608**
4. Allowed MIME types: jpeg, png, webp
5. Re-run storage policy section from migration or apply full migration

## Path format

```
{owner_parent_id}/{moment_id}/{media_id}/original.{jpg|png|webp}
{owner_parent_id}/{moment_id}/{media_id}/thumb.webp
```

## Production rollout checklist

- [ ] Migration `0015` applied to production
- [ ] `moments-verify-rls.sql` passes (12 system tags, 5 table policy sets, 4 storage policies)
- [ ] Bucket `moments-private` is **not** public
- [ ] `NEXT_PUBLIC_MOMENTS_ENABLED=false` until Sprint 9.2 UI QA
- [ ] Sentry DSN configured; verify no storage paths in test events
- [ ] Schedule orphan cleanup review (`moments-orphan-cleanup.sql`)
- [ ] Quota audit baseline (`moments-quota-audit.sql`)
- [ ] Legal draft updated for children’s photos (before enabling UI)

## Deferred to Sprint 9.2

- Album UI (grid, detail, upload picker)
- Image processing worker (EXIF strip, resize, thumbnails)
- Mark media `ready` after processing
- Enable `NEXT_PUBLIC_MOMENTS_ENABLED=true` for beta testers
