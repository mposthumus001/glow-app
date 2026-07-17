# Glow Family — Architecture Specification

**Status:** Specification only — no migrations, UI, or invitation flow implemented yet.  
**Version:** 0.1 (2026-07-17)  
**Companion:** `docs/Moments.md`

---

## 1. Purpose

**Family** is a product area for general family-oriented Moments (outings, holidays, grandparents, siblings, birthdays) and, in later phases, **trusted sharing** with invited people (partner, grandparents, relatives).

Critical principle:

> **Joining a Family group must never automatically expose every child Moment.**

Sharing is always **explicit per Moment** (or future album policy) — never implicit on membership.

---

## 2. Terminology (avoid schema confusion)

| Term | Database | Meaning |
|------|----------|---------|
| **Household** | `public.families` (existing) | Created at signup; scopes `babies`, `baby_events`, `milestones` |
| **Family (product)** | UX label | Family Moments + future sharing groups |
| **Shared Family** | `shared_families` (proposed) | Optional invite-based group for Moment sharing only |
| **Owner (sharing)** | `shared_families.owner_parent_id` | Parent who created the sharing group |

The existing `families` table **must not** be overloaded as the sharing group without careful migration — household membership today is implicit via `parents.family_id` with no invite flow.

---

## 3. Product scope

### Phase 1 — Family Moments (private)

- New nav area: **Family → Family Moments**
- Create Moments with `moment_kind = family`
- Link zero, one, or many children via `moment_children`
- Visibility: `private` — owner only
- Same Storage and media rules as Baby Moments

### Phase 2 — Shared Family groups

- Owner creates a **Shared Family** group
- Invites trusted people by email
- Roles: `owner`, `contributor`, `viewer` (future)
- Members see only Moments explicitly shared to that group

### Phase 3 — Polish

- Member management UI
- Audit log
- Export shared album boundaries
- Download policy enforcement (signed URLs only)

---

## 4. Data model (sharing — proposed)

### 4.1 `shared_families`

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | |
| `owner_parent_id` | uuid FK → parents | Creator |
| `name` | text | 1–80 chars, e.g. “Smith Family” |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |
| `deleted_at` | timestamptz nullable | Soft-delete group |

**One owner may create multiple Shared Families** (e.g. “Grandparents” vs “Our household”) — product allows multiple groups; default UI shows one primary group.

### 4.2 `shared_family_members`

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | |
| `shared_family_id` | uuid FK | |
| `parent_id` | uuid FK → parents | Glow user |
| `role` | enum | `owner` \| `contributor` \| `viewer` |
| `joined_at` | timestamptz | |
| `removed_at` | timestamptz nullable | Soft removal |
| `removed_by_parent_id` | uuid nullable | Audit |

Unique active: `(shared_family_id, parent_id)` where `removed_at is null`.

### 4.3 `shared_family_invitations`

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | |
| `shared_family_id` | uuid FK | |
| `invited_by_parent_id` | uuid FK | |
| `invitee_email_normalized` | text | lower(trim(email)) |
| `invitee_parent_id` | uuid nullable | Set when invitee already has account |
| `role` | enum | Role on accept |
| `token_hash` | text | Hashed single-use token — never store raw token |
| `status` | enum | `pending` \| `accepted` \| `revoked` \| `expired` |
| `expires_at` | timestamptz | Default 7 days |
| `accepted_at` | timestamptz nullable | |
| `created_at` | timestamptz | |

Unique pending per email per group.

### 4.4 `moment_share_audits` (optional, recommended)

| Column | Type |
|--------|-------|
| `id` | uuid |
| `moment_id` | uuid |
| `shared_family_id` | uuid |
| `actor_parent_id` | uuid |
| `action` | enum: `shared` \| `unshared` \| `visibility_changed` |
| `created_at` | timestamptz |

---

## 5. Roles and permissions

| Action | Owner | Contributor | Viewer |
|--------|-------|-------------|--------|
| View shared Moments | ✅ | ✅ | ✅ |
| Upload to shared album | ✅ | ✅ (future) | ❌ |
| Create Family Moment in group | ✅ | ✅ (future) | ❌ |
| Share existing private Moment | ✅ | ❌ | ❌ |
| Unshare Moment | ✅ | ❌ | ❌ |
| Invite members | ✅ | ❌ | ❌ |
| Remove members | ✅ | ❌ | ❌ |
| Change roles | ✅ | ❌ | ❌ |
| Delete group | ✅ | ❌ | ❌ |
| Delete others’ Moments | ❌ (v1) | ❌ | ❌ |
| Delete own upload | ✅ (future contributor) | Own only | ❌ |

**v1 recommendation:** Only **owner** can delete Moments. Contributors upload; owner moderates.

**Private child Moments → shared:** Owner explicitly changes `moments.visibility` to `shared_family` and sets `shared_family_id`. Never bulk-exposed.

**Download:** Signed URLs only; no “download all” API in v1. Cannot prevent screenshots — document in Safety.

---

## 6. Invitation lifecycle

```
┌─────────────┐     create invite      ┌─────────────┐
│   Owner     │ ─────────────────────► │   pending   │
└─────────────┘                        └──────┬──────┘
                                              │
                    ┌─────────────────────────┼─────────────────────────┐
                    ▼                         ▼                         ▼
             ┌─────────────┐          ┌─────────────┐          ┌─────────────┐
             │  accepted   │          │   revoked   │          │   expired   │
             └─────────────┘          └─────────────┘          └─────────────┘
```

### 6.1 Create invite

1. Owner selects email + role
2. Server validates: not self, not already member, no duplicate pending invite
3. Insert `shared_family_invitations` with hashed token, `expires_at = now() + 7 days`
4. Deliver via email (Supabase Auth email or transactional provider) — **link contains token**, not invitation id

### 6.2 Existing Glow user

- Accept link → authenticate → RPC validates token → insert `shared_family_members` → mark invite `accepted`
- `invitee_parent_id` populated

### 6.3 Non-user invitee

- Accept link → sign up (beta allowlist applies) → then accept RPC
- Invite email must match signup email (normalized)

### 6.4 Duplicate invitations

- Revoke prior pending invite or reject new with calm message
- One pending invite per `(shared_family_id, email_normalized)`

### 6.5 Revocation and removal

- Owner revokes pending invite → `status = revoked`
- Owner removes member → `removed_at` set; immediate loss of shared Moment access
- Removed member’s **private** Moments unaffected

### 6.6 Role changes

- Owner only; audit logged
- Cannot demote last owner

### 6.7 Parent leaves Shared Family

- Self-remove allowed for non-owners
- Owner must transfer ownership or delete group

### 6.8 Parent deletes account

- `account_deletion_requests` flow removes memberships, revokes invites, unshares or deletes owned shared Moments per retention policy

---

## 7. Ownership edge cases

| Scenario | Behaviour |
|----------|-----------|
| Two parents, same household (`families`) | v1: separate Moment ownership; future option to share household album |
| Child linked to Family Moment | Link validates `family_owns_baby`; viewers see child **name/age on shared Moment only** — not full Baby tracking |
| Member removed mid-session | Signed URLs expire; RLS denies on next request |
| Group deleted | All `shared_family` visibility Moments revert to `private` or soft-delete (product choice — recommend revert to private) |
| Owner deletes group | Members lose access; no automatic data export to members |

---

## 8. RLS summary (sharing tables)

| Table | SELECT | INSERT | UPDATE | DELETE |
|-------|--------|--------|--------|--------|
| `shared_families` | Owner + active members | Owner only | Owner only | Owner soft-delete |
| `shared_family_members` | Fellow members of same group | Via accept RPC / owner invite | Owner (role/remove) | Owner remove |
| `shared_family_invitations` | Inviter + invitee (own email match) | Owner | Owner revoke | — |
| `moments` (shared) | Owner OR active member of `shared_family_id` when visibility = shared_family | Owner (+ future contributor) | Owner | Owner soft-delete |

**Attack mitigations:**

| Threat | Control |
|--------|---------|
| Arbitrary `shared_family_id` on moment | WITH CHECK: caller is owner or member with contributor+ role |
| Self-invite as owner | Reject invitee = inviter |
| Role escalation | Trigger blocks non-owner role changes |
| Cross-family read | RLS joins membership + visibility |
| Expired invite accept | RPC checks `expires_at` and `status` |
| Path guessing Storage | Owner prefix + signed URLs |

Prefer **SECURITY DEFINER RPCs** for invite accept and share visibility changes.

---

## 9. UX structure

```
Family (nav)
├── Family Moments      /family/moments          grid + timeline
├── Members             /family/members          future
├── Invitations         /family/invitations      future
└── Settings            /family/settings         group name, leave, delete
```

### Family Moments create flow

1. Add photo
2. Title, occurred date, optional note
3. Optional: link children (multi-select)
4. Tags
5. Visibility: Private (default) — shared toggle disabled until group exists

### Empty states

- No moments: “Family memories stay private until you choose to share.”
- No group yet: “Invite someone you trust when you’re ready.”

---

## 10. Privacy and compliance

- Invited members must accept invite knowingly
- Share confirmation names the group and role
- Children’s images require explicit share action per Moment
- APPs: collect minimum metadata; deletion on account removal
- No legal guarantees in spec — legal review before public launch
- Audit log supports breach impact assessment

---

## 11. Testing strategy (Family)

| Test | Expect |
|------|--------|
| Invite self | Rejected |
| Accept expired invite | Rejected |
| Accept twice | Idempotent member row |
| Revoked member reads shared moment | Denied |
| Private moment invisible to member | Denied |
| Shared moment visible after explicit share | Allowed |
| Join group does not expose private child album | Denied |
| Role escalation by contributor | Denied |
| Cross-family moment_id | Denied |
| Email mismatch on accept | Denied |

---

## 12. Decision log (Family)

| Question | Recommendation |
|----------|----------------|
| Reuse `public.families` for sharing? | **No** — new `shared_families` to avoid accidental baby data exposure |
| One Shared Family or many per parent? | **Many allowed**; UI defaults to one primary |
| Contributors delete? | **Own uploads only** (future); owner deletes any |
| Private child Moments shareable later? | **Yes — explicit per Moment** |
| Members download? | **Signed URL view only in v1** — no bulk download |
| Videos? | **Not v1** |

---

## 13. Unresolved product decisions

1. Should household co-parents (`same families.id`) get implicit read access to each other’s private Moments?
2. Email delivery provider for invites (Supabase vs SendGrid)?
3. Maximum members per Shared Family?
4. Can viewers see linked child names or only “Child” anonymised?
5. Transfer ownership UX when owner deletes account?
