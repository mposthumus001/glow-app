# Glow Family Album — Architecture (Sprint 9.3 foundation)

**Status:** Database foundation in migration `0021`. Sprint 9.4A ships Family home / create / detail shell behind `NEXT_PUBLIC_FAMILY_ALBUM_ENABLED`.  
**Companion:** `docs/Moments.md`, `docs/Family.md` (earlier spec; this doc reflects implemented schema)

---

## 1. Purpose

**Family Album** is an invited sharing group for explicitly selected Moments. It is separate from the signup **household** (`public.families`), which continues to scope babies, baby events, and milestones.

Critical principle:

> **Joining a shared family never exposes existing private Moments. Sharing is explicit per Moment via `shared_family_moments`.**

---

## 2. Terminology

| Term | Database | Meaning |
|------|----------|---------|
| **Household** | `public.families` | Created at signup; scopes babies and tracking |
| **Shared family** | `shared_families` | Optional invite-based album group |
| **Owner** | `shared_families.owner_parent_id` + active `shared_family_members.role = owner` | Creates group, invites, shares/unshares |
| **Member** | `shared_family_members.role = member` | Views explicitly shared Moments only |

`parents.id = auth.uid()` throughout.

---

## 3. Schema summary

### `shared_families`

| Column | Notes |
|--------|-------|
| `owner_parent_id` | FK → `parents.id` |
| `name` | 1–80 trimmed chars |
| `status` | `active` \| `archived` |
| `archived_at` | Set when archived |

### `shared_family_members`

| Column | Notes |
|--------|-------|
| `role` | `owner` \| `member` |
| `status` | `active` \| `removed` \| `left` |
| `removed_at` | Set on remove/leave |

Unique active membership: `(shared_family_id, parent_id)` where `status = 'active'`.

### `shared_family_invites`

| Column | Notes |
|--------|-------|
| `invited_email_normalized` | `lower(trim(email))` |
| `invite_token_hash` | SHA-256 hex (64 chars) — **raw token never stored** |
| `status` | `pending` \| `accepted` \| `revoked` \| `expired` |
| `expires_at` | Default **7 days** from creation |

### `shared_family_moments`

Explicit share link. `moments.visibility` stays `private`; access is granted through this table and RLS helpers only.

Unique active share: `(shared_family_id, moment_id)` where `removed_at is null`.

---

## 4. Roles (v1)

| Action | Owner | Member |
|--------|-------|--------|
| View shared family | ✅ | ✅ |
| Rename / archive group | ✅ | ❌ |
| Invite / revoke invites | ✅ | ❌ |
| Remove members | ✅ | ❌ |
| Share / unshare own Moments | ✅ | ❌ |
| View shared Moments | ✅ | ✅ |
| Leave group | ❌ (must archive) | ✅ |

Member contribution (sharing their own Moments into the group) is **deferred** — owner-only sharing in v1.

---

## 5. Invite token strategy

1. Owner calls `create_shared_family_invite(shared_family_id, email)`.
2. Server generates 32 random bytes → hex raw token (returned **once** in RPC response).
3. Server stores `invite_token_hash = SHA-256(raw_token)` only.
4. Email delivery (future UI) sends link: `/family/invite/[token]`.
5. Invitee authenticates; `accept_shared_family_invite(raw_token)` validates:
   - token hash match
   - status `pending`
   - not expired (`expires_at > now()`)
   - `auth.users.email` normalized matches `invited_email_normalized`
   - shared family still `active`
6. Accept is **atomic** and **idempotent** for the same parent.
7. Self-invite and already-active-member email rejected at invite creation.

Beta expiry: **7 days**.

---

## 6. Signed media authorization strategy

The `moments-private` bucket remains private. No broad Storage policies for shared-family members.

**Server boundary (Next.js route / server action):**

1. Authenticate parent (`auth.uid()`).
2. Call `shared_family_can_access_moment_media(shared_family_id, moment_id, media_id)` — returns true only when:
   - caller is active member of active shared family
   - active `shared_family_moments` link exists
   - moment and media not soft-deleted
   - `processing_status = 'ready'`
   - media belongs to the moment
3. If authorized, issue short-lived signed URL (same TTL pattern as private Moments — 120s).
4. Members never receive permanent or bucket-listing access.

RLS on `moment_media` adds `moment_media_select_shared_family_member` for direct Supabase reads where needed; Storage downloads still go through signed URLs only.

---

## 7. RPC summary

| RPC | Caller | Purpose |
|-----|--------|---------|
| `create_shared_family(name)` | Authenticated | Create group + owner membership |
| `create_shared_family_invite(id, email)` | Owner | Pending invite + one-time raw token |
| `accept_shared_family_invite(token)` | Authenticated invitee | Atomic accept / idempotent retry |
| `revoke_shared_family_invite(invite_id)` | Owner | Revoke pending invite |
| `remove_shared_family_member(member_id)` | Owner | Mark member `removed` |
| `leave_shared_family(shared_family_id)` | Member | Mark self `left` |
| `share_private_moment(family_id, moment_id)` | Owner | Explicit share link |
| `unshare_private_moment(family_id, moment_id)` | Owner | Set `removed_at` |
| `archive_shared_family(shared_family_id)` | Owner | Archive group |
| `rename_shared_family(shared_family_id, name)` | Owner | Rename active group |

All user RPCs: `SECURITY DEFINER`, explicit `search_path`, `anon` revoked.

Direct INSERT on shared-family tables blocked by RLS (`with check (false)`); mutations go through RPCs or scoped UPDATE policies.

---

## 8. Routes (Sprint 9.4A UI)

| Route | Purpose | Status |
|-------|---------|--------|
| `/family` | List shared families the parent belongs to | ✅ 9.4A |
| `/family/new` | Create a new shared family | ✅ 9.4A |
| `/family/[sharedFamilyId]` | Detail shell + empty album | ✅ 9.4A |
| `/family/invite/[token]` | Accept invitation landing | Future |
| `/family/[sharedFamilyId]/members` | Members + pending invites (owner) | Future |
| `/baby/[babyId]/moments/[momentId]/share` | Owner share/unshare picker | Future |

Family Album nav entry is separate from Baby Moments (`/baby/[babyId]/moments`).

### Feature flag

```env
NEXT_PUBLIC_FAMILY_ALBUM_ENABLED=true
```

- Defaults **off** when missing (must be exactly `"true"`).
- Hides Family from primary nav when off.
- `/family*` routes call `notFound()` when off.
- Documented in `.env.example`.

---

## 9. Privacy (v1)

- No public profiles or searchable directory
- Email invites only (no phone)
- No comments, reactions, bulk download, or notifications beyond invite delivery groundwork
- No automatic sharing; no whole-baby-album share
- No child profile / tracking access beyond metadata on explicitly shared Moments
- Processed images strip EXIF (existing Moments pipeline)

---

## 10. Verification

After applying migration `0021` in Supabase SQL editor:

```sql
-- Run contents of:
-- supabase/ops/shared-family-verify-0021.sql
```

Summary row should read **ALL PASS**.

Contract tests: `src/features/family/sharedFamilyContract.test.ts` (23 scenarios).

---

## 11. Production rollout order

1. Apply `supabase/migrations/0021_shared_family_album_foundation.sql`
2. Run `supabase/ops/shared-family-verify-0021.sql` — confirm ALL PASS
3. Regenerate Supabase types if your workflow requires it
4. Deploy app with server signed-URL boundary (future sprint)
5. Enable Family Album UI behind feature flag (future sprint)

Do **not** modify `public.families` or existing private Moments during migration.

---

## 12. Unresolved decisions

1. Should household co-parents (`same families.id`) get implicit read access to each other's private Moments?
2. Email delivery provider for invites (Supabase Auth vs transactional provider)?
3. Maximum members per shared family?
4. Child name visibility on shared Moments for members?
5. Owner account deletion — transfer ownership vs auto-archive?
6. Future member-contributed Moments into a shared family?

See `docs/DECISIONS.md` Sprint 9.3 entry.
