# Glow Moments — Architecture Specification

**Status:** Sprint 9.1 foundation implemented (migration `0015`); UI deferred to Sprint 9.2.  
**Version:** 0.2 (2026-07-17)  
**Depends on:** existing `parents`, `babies`, `families`, Baby feature, Supabase Auth/RLS patterns.

---

## 1. Purpose

Glow Moments is a **private photo memory system** for authenticated parents. It lives inside the Baby area (per child) and later in a dedicated Family area (general family-oriented memories).

Design goals:

- Calm, premium, private-by-default
- Separate albums per child when multiple children exist
- Optional links to zero, one, or many children for Family Moments
- Explicit sharing later — **never** automatic exposure on group join
- Australian Privacy Principles–aware handling of children’s photos
- No medical or developmental judgements from tags

---

## 2. Current architecture discovered

| Area | What exists today |
|------|-------------------|
| Identity | `auth.users.id` = `parents.id` |
| Household | `public.families` + `parents.family_id` (created at signup via `handle_new_user`) |
| Children | `public.babies` — `parent_id`, `family_id`, `name`, `date_of_birth`, `due_date`, soft-delete |
| Baby UI | `/baby` — multi-baby selector, family-scoped `baby_events` |
| Milestones table | `public.milestones` — family-scoped text milestones; **no photo UI** |
| Storage | **`moments-private` bucket** — signed URLs only (migration `0015`) |
| Nav | 5 items: Tonight, Circle, Baby, Calm, You — **no Family nav yet** |
| Age helper | `src/lib/utils/baby-age.ts` — derived display from DOB/due date |
| Sentry | Scrubs `photo`, `baby_name`, GPS, message bodies from events |
| Soft-delete | `deleted_at` on babies, baby_events, milestones, etc. |

**Gap:** No `moments`, no media metadata, no Storage, no Family product area.

**Relationship to `milestones` table:** Keep separate. `milestones` remains for text-based baby milestones in tracking. Moment tags are **photo labels** only — not clinical records. Optional future link: `moments.source_milestone_id` (deferred).

---

## 3. Product scope

### 3.1 Baby Moments (per child)

Each child has a **private album** under Baby → select child → Moments.

Each Moment may include:

| Field | Required | Notes |
|-------|----------|-------|
| Title / short caption | Yes | 1–120 chars |
| Occurred date | Yes | Calendar date (not necessarily upload date) |
| Optional note | No | Max 500 chars; no medical advice |
| System milestone tags | No | Curated labels (see §8) |
| Custom tags | No | User-created, owner-scoped |
| Media | Yes (after upload) | One primary image in v1; schema supports many |
| Derived child age | Display only | Computed from DOB/due date at occurred date |

Multi-child: selector matches existing Baby pattern (`BabySelector`); Moments query filtered by selected `baby_id` via join table.

### 3.2 Family Moments (general)

Separate product area — **Family** nav item (future). Moments may:

- Belong to **no specific child** (family outing, grandparents visit)
- Link to **one child**
- Link to **multiple children**

**Phase 1 visibility:** private to `owner_parent_id` only — same as child Moments.

### 3.3 Out of scope (v1)

- Video upload/playback
- Public albums or links
- Circle integration
- AI tagging or face recognition
- Medical/growth interpretation
- Automatic sharing on family join
- Permanent public CDN URLs
- Comments/likes social graph

---

## 4. Data model

### 4.1 Design principles

- **Default private** — every row owned by one parent until explicitly shared
- **No direct `baby_id` on `moments`** — use `moment_children` join for 0..N children (see Decision log)
- **Derived age** — store `occurred_on` date only; compute age at read time
- **Soft-delete** — consistent with `baby_events`, `babies`
- **Household vs sharing group** — signup `families` ≠ optional `shared_families` (see `docs/Family.md`)

### 4.2 Core tables (proposed)

#### `moments`

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | |
| `owner_parent_id` | uuid FK → parents | Always set; creator/owner |
| `household_family_id` | uuid FK → families | Denormalized from owner for RLS helpers; set at insert |
| `moment_kind` | enum | `child` \| `family` — UX grouping only |
| `title` | text | 1–120 chars |
| `note` | text nullable | Max 500 |
| `occurred_on` | date | Calendar date of memory |
| `visibility` | enum | `private` (default) \| `shared_family` (future) |
| `shared_family_id` | uuid nullable FK → shared_families | Set only when visibility = shared_family |
| `is_favourite` | boolean | Default false |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |
| `deleted_at` | timestamptz nullable | Soft-delete |

**Indexes:** `(owner_parent_id, occurred_on desc)`, `(owner_parent_id, deleted_at)`, partial favourite index.

**No stored age text** — derived at query/display time.

#### `moment_children`

| Column | Type | Notes |
|--------|------|-------|
| `moment_id` | uuid FK → moments | |
| `baby_id` | uuid FK → babies | |
| `created_at` | timestamptz | |

PK: `(moment_id, baby_id)`.  
**Rules:** Baby Moments must have exactly one row. Family Moments may have zero or more. All `baby_id` values must belong to owner’s household (`family_owns_baby`).

#### `moment_media`

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | |
| `moment_id` | uuid FK → moments | |
| `owner_parent_id` | uuid FK → parents | Denormalized for Storage RLS |
| `storage_bucket` | text | Always `moments-private` in v1 |
| `storage_path` | text | See Storage §5 |
| `thumbnail_path` | text nullable | Derived image |
| `mime_type` | text | image/jpeg, image/png, image/webp |
| `byte_size` | integer | |
| `width` | integer nullable | |
| `height` | integer nullable | |
| `sort_order` | smallint | Default 0; v1 single image |
| `processing_status` | enum | `pending` \| `ready` \| `failed` |
| `created_at` | timestamptz | |
| `deleted_at` | timestamptz nullable | |

**v1:** one `moment_media` row per moment. Schema allows multiple for future.

#### `moment_tags`

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | |
| `owner_parent_id` | uuid nullable | NULL = system/curated tag |
| `slug` | text | Unique per owner (or global for system) |
| `label` | text | Display text |
| `tag_kind` | enum | `system` \| `custom` |
| `locale` | text | Default `en-AU`; localisation-ready |
| `created_at` | timestamptz | |
| `deleted_at` | timestamptz nullable | Soft-delete custom tags |

**System tags (seed):** `first-crawl`, `first-steps`, `first-smile`, `first-bottle-hold`, plus extensible list. Labels are **celebratory labels**, not assessments.

#### `moment_tag_links`

| Column | Type |
|--------|------|
| `moment_id` | uuid FK |
| `tag_id` | uuid FK |

PK: `(moment_id, tag_id)`.

### 4.3 Future sharing tables

Defined in `docs/Family.md`: `shared_families`, `shared_family_members`, `shared_family_invitations`, `moment_share_audits`.

---

## 5. Supabase Storage design

### 5.1 Bucket strategy

**One private bucket:** `moments-private`

| Property | Value |
|----------|-------|
| Public | **No** — never permanent public URLs |
| File size limit | 8 MB (configurable; enforce client + Storage policy) |
| Allowed MIME | `image/jpeg`, `image/png`, `image/webp` |
| Video | **Not in v1** — reject at validation; reserve `moment_media` for future |

### 5.2 Path format

```
{owner_parent_id}/{moment_id}/{media_id}/original.{ext}
{owner_parent_id}/{moment_id}/{media_id}/thumb.webp
```

- `owner_parent_id` first segment prevents cross-user path guessing even if UUID leaked
- All paths validated server-side before signed upload URL issuance

### 5.3 Upload flow (trusted server action)

1. Client requests upload slot → server action validates auth, creates `moments` + `moment_media` rows (`processing_status = pending`)
2. Server returns **short-lived signed upload URL** (Supabase `createSignedUploadUrl` or equivalent)
3. Client uploads directly to Storage
4. Server/webhook confirms upload → generates thumbnail (Edge Function or server job) → strips EXIF/GPS → sets `ready`
5. On failure/timeout → mark `failed`; orphan cleanup job removes objects without `ready` after 24h

### 5.4 Read flow

- **Signed download URLs** only — TTL 60–300 seconds
- Created via server action after RLS check on `moments` + `moment_media`
- Thumbnails served same way (prefer thumb in grid)

### 5.5 Image processing

| Step | Requirement |
|------|-------------|
| EXIF/GPS removal | Strip all location and device metadata on server after upload |
| Compression | Max dimension 2048px; JPEG quality ~85 or WebP equivalent |
| Thumbnail | Max 400px edge; WebP |
| Validation | Magic-byte check, not extension alone |

### 5.6 Delete behaviour

- Soft-delete moment → hide from UI; Storage objects retained until hard purge (account deletion or retention job)
- Hard delete / account deletion → delete Storage objects + metadata rows
- Orphan cleanup: cron for `pending` > 24h with no `ready`

### 5.7 Video (future boundary)

- Separate MIME allowlist when added
- Size limits TBD (recommend 50 MB cap)
- Processing pipeline deferred — do not half-implement in v1

---

## 6. Ownership and visibility

| Rule | Detail |
|------|--------|
| Owner | `owner_parent_id` — always the creating parent |
| Default visibility | `private` — only owner can read/write |
| Household scope | `household_family_id` copied from owner’s `parents.family_id` for helper functions; **does not** grant co-parent access in v1 |
| Edit | Owner only (v1); future: contributors on explicitly shared moments |
| Delete | Owner only (v1); soft-delete |
| Upload media | Owner only (v1) |
| View child-linked Moments | Owner only until explicit `shared_family` visibility |
| Join shared family | **Does not** expose existing private Moments |
| Share moment | Future: owner sets `visibility = shared_family` + `shared_family_id`; optional per-moment |
| Member removed | Loses access immediately; no copy retained |
| Parent leaves shared family | Retains own private Moments; shared copies governed by share policy (owner retains control) |
| Two parents, one household | v1: each parent owns their own Moments; co-parent access requires future household or shared_family policy (product decision) |
| Account deletion | Delete/private purge per `account_deletion_requests` process; Storage objects removed |

---

## 7. Age calculation

Use **`occurred_on`** (date) + baby’s `date_of_birth` or `due_date`.

| Case | Behaviour |
|------|-----------|
| DOB known | Whole months between DOB and `occurred_on` (same algorithm as `baby-age.ts`) |
| Due date only, occurred before due | Display “before due date” or omit age line — **never invent** |
| Due date only, occurred after due | Approximate age from due date with “about” prefix (match existing Baby copy) |
| No DOB or due | Age line omitted |
| Stored vs derived | **Derived only** — no `age_at_occurred` column |

Display examples (calm, non-medical):

- “3 months”
- “1 year 2 months”
- “newborn”
- “about 5 months” (due-date fallback)

Implementation: extend `baby-age.ts` with `formatBabyAgeAtDate({ dob, dueDate, onDate })`.

Timezone: use **Australia/Sydney** calendar date for `occurred_on` boundaries (consistent with Baby tracking).

---

## 8. Milestone tags

| Aspect | Design |
|--------|--------|
| System tags | Seeded `moment_tags` with `tag_kind = system`, `owner_parent_id = NULL` |
| Custom tags | `tag_kind = custom`, scoped to `owner_parent_id` |
| Duplicate prevention | Unique `(owner_parent_id, slug)` for custom; unique global slug for system |
| Semantics | **Labels only** — “First steps” is a memory label, not a developmental assessment |
| Localisation | `locale` column; v1 English only |
| UI | Multi-select chips; system tags shown first |

**Initial system tags:**

- First crawl
- First steps
- First smile
- First time holding their bottle

---

## 9. UX structure

### 9.1 Navigation (proposed)

```
Baby → [child selector] → Moments        (existing Baby nav)
Family → Family Moments                  (new nav item — phase 2+)
Family → Members                         (future)
Family → Invitations                     (future)
Family → Settings                        (future)
```

Nav config owner: `src/components/shell/nav.ts` — add `family` between `baby` and `calm` when ready (product approval).

### 9.2 Baby Moments screens

| Screen | Purpose |
|--------|---------|
| Grid view | Default; square thumbnails, occurred date, favourite indicator |
| Timeline view | Grouped by month/year |
| Moment detail | Full image, title, note, tags, derived age, edit/delete |
| Create / edit | Photo picker, crop (optional v1), metadata form, tag picker |
| Empty state | Calm illustration + “Capture a moment” CTA |
| Loading | Skeleton grid — no large spinners |
| Error | Feature error boundary; Sentry `feature_area: baby` |

### 9.3 Family Moments screens

Same patterns as Baby Moments without forced single-child link. Child linker: optional multi-select from household babies.

### 9.4 Visibility controls (future)

Per-moment toggle: Private → Share with [Family group name]. Confirmation dialog explaining who will see it.

---

## 10. Backend architecture

| Layer | Owner |
|-------|-------|
| Feature module | `src/features/moments/` (proposed) |
| Server actions | Create/update/delete moment, request signed URLs, confirm upload |
| RPCs (optional) | `create_moment_upload_slot`, `confirm_moment_media` — SECURITY DEFINER if needed |
| Client | Grid/timeline/detail components; no direct Storage writes without signed URL |
| Sentry | `feature_area: baby` or new `moments`; scrub captions/notes from breadcrumbs |

**Do not** use service-role in browser. Signed URLs created server-side only.

---

## 11. Testing strategy

| Area | Tests |
|------|-------|
| Ownership | Owner can CRUD own moments; other parent cannot |
| Multi-child | Family moment links 0, 1, N babies; invalid baby_id rejected |
| Private by default | No shared_family member can read without visibility flip |
| Signed URLs | Expired URL fails; wrong owner path rejected |
| Upload validation | MIME, size, magic bytes |
| Soft-delete | Deleted moments hidden; media inaccessible |
| Orphan cleanup | Pending > 24h removed |
| Age calculation | DOB, due-only, pre-birth, unknown |
| Custom tags | Isolated per owner; no cross-user slug collision |
| Sentry | Moment notes not in event payloads |
| RLS contract | Document in `rlsContract.test.ts` patterns |

---

## 12. Privacy and compliance notes

- Children’s photos are **sensitive personal information** under APPs
- Default private minimises collection and disclosure
- EXIF/GPS stripped before persistence
- No permanent public URLs
- Account deletion must purge Storage + DB rows
- Export: future sprint — parent-initiated archive
- Screenshot/download: cannot fully prevent; document limitation in Safety copy
- No legal compliance claims — legal review required before public launch
- Sentry: extend scrub list for `caption`, `moment_note`, storage paths

---

## 13. Staged delivery (Moments-specific)

See `docs/Roadmap.md` Milestone 9 for full sprint breakdown.

| Sprint | Deliverable |
|--------|-------------|
| 9.1 Moments foundation | Schema, Storage bucket, RLS, signed URL actions, no UI |
| 9.2 Private child albums | Baby → Moments UI, upload, grid, detail |
| 9.3 Tags + timeline | System/custom tags, timeline view, favourites |
| 9.4 Family private album | Family nav, family-kind moments, multi-child link |
| 9.5+ | Sharing — see `docs/Family.md` |

---

## 14. Decision log (Moments)

| Question | Recommendation |
|----------|----------------|
| `baby_id` on moments vs join table? | **Join table only** (`moment_children`) |
| One bucket vs many? | **One private bucket** (`moments-private`) |
| Store age text? | **No — derive** |
| Videos in v1? | **No** |
| Reuse `milestones` table? | **No** — separate tags; optional FK later |
| Public URLs? | **Never** |

See `docs/DECISIONS.md` for recorded decisions.

---

## 15. Unresolved product decisions

1. Co-parent in same signup `families` household — read access to each other’s Moments in v1?
2. Maximum Moments per child / storage quota per account?
3. Image crop/rotate in v1 or defer?
4. Export format (ZIP of originals) — sprint priority?
5. When to add 6th nav item vs sub-nav under Baby/You?
