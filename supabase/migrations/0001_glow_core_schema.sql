-- =============================================================================
-- Glow Database v2.0 — Core schema
-- =============================================================================
-- Privacy principles (enforced in schema + RLS + views):
--   1. Never store street address or precise home location.
--   2. Exact GPS is never persisted; only optional approximate_lat/lng when the
--      user opts into suburb_area map visibility (coarse, suburb-level only).
--   3. Map visibility: hidden | state_only | suburb_area.
--   4. Clients must use map_presence / map_cluster_public — not raw presence.
--   5. Suburb-level map_clusters exist only when online_count >= 5 (k-anonymity).
--   6. Normal users cannot self-assign admin/moderator/support or edit billing.
-- =============================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
create type public.au_state as enum (
  'NSW', 'VIC', 'QLD', 'WA', 'SA', 'TAS', 'ACT', 'NT'
);

create type public.feeding_method as enum (
  'breastfeeding', 'bottle', 'mixed', 'solids', 'other'
);

create type public.map_visibility as enum (
  'hidden', 'state_only', 'suburb_area'
);

create type public.subscription_status as enum (
  'none', 'trialing', 'active', 'past_due', 'canceled', 'expired'
);

create type public.app_role as enum (
  'parent', 'moderator', 'support', 'admin'
);

create type public.theme_mode as enum (
  'system', 'light', 'dark'
);

create type public.device_platform as enum (
  'ios', 'android', 'web'
);

create type public.circle_type as enum (
  'general', 'birth_month', 'age_band', 'feeding_method', 'nicu', 'twins', 'local'
);

create type public.circle_status as enum (
  'forming', 'active', 'paused', 'archived'
);

create type public.circle_member_status as enum (
  'active', 'left', 'removed', 'muted'
);

create type public.moderation_status as enum (
  'clean', 'flagged', 'removed'
);

create type public.reaction_type as enum (
  'heart', 'hug', 'support', 'celebrate'
);

create type public.app_state as enum (
  'active', 'background', 'offline'
);

create type public.map_cluster_level as enum (
  'country', 'state', 'suburb_area'
);

create type public.baby_event_type as enum (
  'breastfeed', 'bottle_feed', 'pump', 'sleep', 'nappy',
  'medication', 'milestone', 'note'
);

create type public.feed_side as enum (
  'left', 'right', 'both', 'none'
);

create type public.media_type as enum (
  'audio', 'meditation', 'story', 'music', 'video'
);

create type public.time_of_day as enum (
  'morning', 'afternoon', 'evening', 'overnight', 'anytime'
);

create type public.report_status as enum (
  'open', 'reviewing', 'resolved', 'dismissed'
);

create type public.moderation_action_type as enum (
  'warn', 'mute', 'remove_from_circle', 'suspend', 'ban'
);

create type public.subscription_provider as enum (
  'none', 'stripe', 'apple', 'google'
);

create type public.milestone_category as enum (
  'motor', 'language', 'social', 'sleep', 'feeding', 'health', 'other'
);

create type public.daily_message_category as enum (
  'encouragement', 'reminder', 'tip', 'solidarity'
);

create type public.media_category as enum (
  'breathing', 'white_noise', 'lullaby', 'meditation', 'affirmation',
  'story', 'music', 'other'
);

create type public.circle_invite_status as enum (
  'pending', 'accepted', 'declined', 'expired', 'revoked'
);

create type public.connection_status as enum (
  'pending', 'accepted', 'declined', 'blocked'
);

-- ---------------------------------------------------------------------------
-- updated_at helper
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

comment on function public.set_updated_at() is
  'Sets updated_at to UTC now() on row update.';

-- ---------------------------------------------------------------------------
-- families
-- ---------------------------------------------------------------------------
-- created_by_parent_id is DEFERRABLE so handle_new_user can insert family
-- before parent within the same transaction.
create table public.families (
  id uuid primary key default gen_random_uuid(),
  created_by_parent_id uuid not null,
  name text not null default 'My family',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  deleted_at timestamptz,

  constraint families_name_length check (char_length(name) between 1 and 100)
);

comment on table public.families is
  'Household unit. Multiple parents can share babies and care data via family_id.';

create trigger families_set_updated_at
  before update on public.families
  for each row execute function public.set_updated_at();

create index families_created_by_parent_id_idx
  on public.families (created_by_parent_id)
  where deleted_at is null;

-- ---------------------------------------------------------------------------
-- parents (was profiles in v1)
-- ---------------------------------------------------------------------------
create table public.parents (
  id uuid primary key references auth.users (id) on delete cascade,
  family_id uuid references public.families (id) on delete set null,
  display_name text not null,
  avatar_url text,
  state public.au_state not null,
  -- Coarse area label only (e.g. "Inner West"). Never a street address.
  suburb_area text,
  feeding_method public.feeding_method,
  first_child boolean not null default true,
  role public.app_role not null default 'parent',
  map_visibility public.map_visibility not null default 'state_only',
  subscription_status public.subscription_status not null default 'none',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  deleted_at timestamptz,

  constraint parents_display_name_length check (
    char_length(display_name) between 1 and 80
  ),
  constraint parents_suburb_area_length check (
    suburb_area is null or char_length(suburb_area) between 1 and 80
  ),
  constraint parents_suburb_requires_visibility check (
    suburb_area is null or map_visibility = 'suburb_area'
  )
);

comment on table public.parents is
  'App parent account linked 1:1 to auth.users. No street addresses.';
comment on column public.parents.suburb_area is
  'Optional coarse suburb/area label. Never a street address.';
comment on column public.parents.role is
  'App-level role. Users cannot self-elevate; only service role / admins change this.';
comment on column public.parents.subscription_status is
  'Denormalised billing status. Not user-editable; synced from subscriptions.';

alter table public.families
  add constraint families_created_by_parent_id_fkey
  foreign key (created_by_parent_id)
  references public.parents (id)
  deferrable initially deferred;

create trigger parents_set_updated_at
  before update on public.parents
  for each row execute function public.set_updated_at();

create index parents_family_id_idx on public.parents (family_id)
  where deleted_at is null;
create index parents_state_idx on public.parents (state)
  where deleted_at is null;
create index parents_map_visibility_idx on public.parents (map_visibility);
create index parents_role_idx on public.parents (role);
create index parents_subscription_status_idx on public.parents (subscription_status);

-- ---------------------------------------------------------------------------
-- babies
-- ---------------------------------------------------------------------------
create table public.babies (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid not null references public.parents (id) on delete cascade,
  family_id uuid not null references public.families (id) on delete cascade,
  name text not null,
  date_of_birth date,
  due_date date,
  feeding_method public.feeding_method,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  deleted_at timestamptz,

  constraint babies_name_length check (char_length(name) between 1 and 80),
  constraint babies_has_dob_or_due check (
    date_of_birth is not null or due_date is not null
  )
);

comment on table public.babies is
  'Children belonging to a family. Visible to family members only.';

create trigger babies_set_updated_at
  before update on public.babies
  for each row execute function public.set_updated_at();

create index babies_parent_id_idx on public.babies (parent_id)
  where deleted_at is null;
create index babies_family_id_idx on public.babies (family_id)
  where deleted_at is null;

-- ---------------------------------------------------------------------------
-- preferences (broader than v1 notification_preferences)
-- ---------------------------------------------------------------------------
create table public.preferences (
  parent_id uuid primary key references public.parents (id) on delete cascade,
  theme_mode public.theme_mode not null default 'system',
  reduce_motion boolean not null default false,
  map_visibility_default public.map_visibility not null default 'state_only',
  circle_activity_notifications boolean not null default true,
  quiet_time_enabled boolean not null default false,
  silent_from time,
  silent_to time,
  daily_encouragement boolean not null default true,
  updated_at timestamptz not null default timezone('utc', now()),

  constraint preferences_quiet_window check (
    (not quiet_time_enabled)
    or (silent_from is not null and silent_to is not null)
  )
);

comment on table public.preferences is
  'Per-parent app + notification preferences.';

create trigger preferences_set_updated_at
  before update on public.preferences
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- devices (push notifications)
-- ---------------------------------------------------------------------------
create table public.devices (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid not null references public.parents (id) on delete cascade,
  platform public.device_platform not null,
  push_token text not null,
  app_version text,
  last_seen_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  deleted_at timestamptz,

  constraint devices_push_token_length check (char_length(push_token) between 1 and 512),
  constraint devices_parent_token_unique unique (parent_id, push_token)
);

comment on table public.devices is
  'Registered devices for push notifications. Owned by parent.';

create trigger devices_set_updated_at
  before update on public.devices
  for each row execute function public.set_updated_at();

create index devices_parent_id_idx on public.devices (parent_id)
  where deleted_at is null;
create index devices_push_token_idx on public.devices (push_token)
  where deleted_at is null;

-- ---------------------------------------------------------------------------
-- circles
-- ---------------------------------------------------------------------------
create table public.circles (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  primary_state public.au_state not null,
  baby_age_min_months integer not null default 0,
  baby_age_max_months integer not null default 12,
  circle_type public.circle_type not null default 'general',
  status public.circle_status not null default 'forming',
  max_members integer not null default 12,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  deleted_at timestamptz,

  constraint circles_name_length check (char_length(name) between 1 and 100),
  constraint circles_age_range check (
    baby_age_min_months >= 0
    and baby_age_max_months >= baby_age_min_months
    and baby_age_max_months <= 60
  ),
  constraint circles_max_members_positive check (max_members between 2 and 50)
);

comment on table public.circles is
  'Glow Circles — peer groups by type, state, and age band.';

create trigger circles_set_updated_at
  before update on public.circles
  for each row execute function public.set_updated_at();

create index circles_primary_state_idx on public.circles (primary_state)
  where deleted_at is null;
create index circles_type_status_idx
  on public.circles (circle_type, status)
  where deleted_at is null;
create index circles_age_range_idx
  on public.circles (baby_age_min_months, baby_age_max_months)
  where deleted_at is null;

-- ---------------------------------------------------------------------------
-- circle_rules (matching)
-- ---------------------------------------------------------------------------
create table public.circle_rules (
  id uuid primary key default gen_random_uuid(),
  circle_id uuid not null references public.circles (id) on delete cascade,
  state public.au_state,
  feeding_method public.feeding_method,
  baby_age_min_months integer,
  baby_age_max_months integer,
  first_child boolean,
  priority integer not null default 100,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),

  constraint circle_rules_age_range check (
    baby_age_min_months is null
    or baby_age_max_months is null
    or (
      baby_age_min_months >= 0
      and baby_age_max_months >= baby_age_min_months
    )
  )
);

comment on table public.circle_rules is
  'Matching rules for auto-placing parents into Circles. Null fields = wildcard.';

create trigger circle_rules_set_updated_at
  before update on public.circle_rules
  for each row execute function public.set_updated_at();

create index circle_rules_circle_id_idx on public.circle_rules (circle_id);
create index circle_rules_priority_idx on public.circle_rules (priority);

-- ---------------------------------------------------------------------------
-- circle_members
-- ---------------------------------------------------------------------------
create table public.circle_members (
  id uuid primary key default gen_random_uuid(),
  circle_id uuid not null references public.circles (id) on delete cascade,
  parent_id uuid not null references public.parents (id) on delete cascade,
  status public.circle_member_status not null default 'active',
  joined_at timestamptz not null default timezone('utc', now()),
  last_read_at timestamptz,
  deleted_at timestamptz,

  constraint circle_members_unique unique (circle_id, parent_id)
);

comment on table public.circle_members is
  'Membership of a parent in a Glow Circle.';

create index circle_members_circle_id_idx on public.circle_members (circle_id)
  where deleted_at is null and status = 'active';
create index circle_members_parent_id_idx on public.circle_members (parent_id)
  where deleted_at is null;

-- ---------------------------------------------------------------------------
-- circle_messages (realtime-friendly)
-- ---------------------------------------------------------------------------
create table public.circle_messages (
  id uuid primary key default gen_random_uuid(),
  circle_id uuid not null references public.circles (id) on delete cascade,
  parent_id uuid not null references public.parents (id) on delete cascade,
  body text not null,
  moderation_status public.moderation_status not null default 'clean',
  created_at timestamptz not null default timezone('utc', now()),
  edited_at timestamptz,
  deleted_at timestamptz,

  constraint circle_messages_body_length check (
    char_length(body) between 1 and 4000
  )
);

comment on table public.circle_messages is
  'Circle chat messages. Soft-delete via deleted_at. Enable Realtime.';

create index circle_messages_circle_created_idx
  on public.circle_messages (circle_id, created_at desc);
create index circle_messages_parent_id_idx
  on public.circle_messages (parent_id);
create index circle_messages_active_idx
  on public.circle_messages (circle_id, created_at desc)
  where deleted_at is null and moderation_status <> 'removed';

-- ---------------------------------------------------------------------------
-- circle_message_reactions (realtime-friendly)
-- ---------------------------------------------------------------------------
create table public.circle_message_reactions (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null
    references public.circle_messages (id) on delete cascade,
  parent_id uuid not null references public.parents (id) on delete cascade,
  reaction_type public.reaction_type not null,
  created_at timestamptz not null default timezone('utc', now()),

  constraint circle_message_reactions_unique
    unique (message_id, parent_id, reaction_type)
);

comment on table public.circle_message_reactions is
  'Reactions on circle messages. Enable Realtime.';

create index circle_message_reactions_message_id_idx
  on public.circle_message_reactions (message_id);
create index circle_message_reactions_parent_id_idx
  on public.circle_message_reactions (parent_id);

-- ---------------------------------------------------------------------------
-- presence (realtime-friendly, privacy-safe map)
-- ---------------------------------------------------------------------------
-- Privacy: approximate_lat/lng ONLY when map_visibility = suburb_area.
-- Never store exact home GPS. Clients must read via map_presence, not this table.
create table public.presence (
  parent_id uuid primary key references public.parents (id) on delete cascade,
  online_status boolean not null default false,
  app_state public.app_state not null default 'offline',
  state public.au_state not null,
  suburb_area text,
  approximate_lat double precision,
  approximate_lng double precision,
  map_visibility public.map_visibility not null default 'state_only',
  current_circle_id uuid references public.circles (id) on delete set null,
  last_seen_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),

  constraint presence_suburb_area_length check (
    suburb_area is null or char_length(suburb_area) between 1 and 80
  ),
  constraint presence_coords_require_suburb_visibility check (
    (approximate_lat is null and approximate_lng is null)
    or map_visibility = 'suburb_area'
  ),
  constraint presence_coords_pair check (
    (approximate_lat is null) = (approximate_lng is null)
  ),
  -- Australia bounding box (coarse sanity; not precise geofencing)
  constraint presence_lat_range check (
    approximate_lat is null or (approximate_lat between -44.0 and -10.0)
  ),
  constraint presence_lng_range check (
    approximate_lng is null or (approximate_lng between 112.0 and 154.0)
  ),
  constraint presence_suburb_requires_visibility check (
    suburb_area is null or map_visibility = 'suburb_area'
  )
);

comment on table public.presence is
  'Live status + privacy-safe map fields. No street addresses / exact GPS. Enable Realtime.';
comment on column public.presence.approximate_lat is
  'Coarse suburb-level latitude only. Null unless map_visibility = suburb_area.';
comment on column public.presence.approximate_lng is
  'Coarse suburb-level longitude only. Null unless map_visibility = suburb_area.';

create trigger presence_set_updated_at
  before update on public.presence
  for each row execute function public.set_updated_at();

create index presence_online_status_idx
  on public.presence (online_status)
  where online_status = true;
create index presence_state_online_idx
  on public.presence (state, online_status)
  where online_status = true;
create index presence_map_visibility_idx on public.presence (map_visibility);
create index presence_current_circle_id_idx
  on public.presence (current_circle_id)
  where current_circle_id is not null;

-- ---------------------------------------------------------------------------
-- map_clusters (backend aggregates; k-anonymity for suburb_area)
-- ---------------------------------------------------------------------------
create table public.map_clusters (
  id uuid primary key default gen_random_uuid(),
  level public.map_cluster_level not null,
  state public.au_state,
  suburb_area text,
  online_count integer not null default 0,
  approximate_lat double precision,
  approximate_lng double precision,
  updated_at timestamptz not null default timezone('utc', now()),

  constraint map_clusters_online_count_nonneg check (online_count >= 0),
  -- Suburb clusters only when enough parents are online (k-anonymity).
  constraint map_clusters_suburb_min_count check (
    level <> 'suburb_area' or online_count >= 5
  ),
  constraint map_clusters_state_required check (
    level = 'country' or state is not null
  ),
  constraint map_clusters_suburb_required check (
    level <> 'suburb_area' or suburb_area is not null
  ),
  constraint map_clusters_coords_pair check (
    (approximate_lat is null) = (approximate_lng is null)
  ),
  constraint map_clusters_lat_range check (
    approximate_lat is null or (approximate_lat between -44.0 and -10.0)
  ),
  constraint map_clusters_lng_range check (
    approximate_lng is null or (approximate_lng between 112.0 and 154.0)
  )
);

-- One country row; one row per state; one row per state+suburb_area
create unique index map_clusters_country_unique
  on public.map_clusters (level)
  where level = 'country';

create unique index map_clusters_state_unique
  on public.map_clusters (state)
  where level = 'state';

create unique index map_clusters_suburb_unique
  on public.map_clusters (state, suburb_area)
  where level = 'suburb_area';

comment on table public.map_clusters is
  'Pre-aggregated map counts. Suburb clusters require online_count >= 5. No individual locations.';
comment on constraint map_clusters_suburb_min_count on public.map_clusters is
  'k-anonymity: never publish a suburb_area cluster with fewer than 5 online parents.';

create trigger map_clusters_set_updated_at
  before update on public.map_clusters
  for each row execute function public.set_updated_at();

create index map_clusters_level_idx on public.map_clusters (level);
create index map_clusters_state_idx on public.map_clusters (state);

-- ---------------------------------------------------------------------------
-- baby_events (replaces baby_care_logs)
-- ---------------------------------------------------------------------------
create table public.baby_events (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid not null references public.parents (id) on delete cascade,
  baby_id uuid not null references public.babies (id) on delete cascade,
  family_id uuid not null references public.families (id) on delete cascade,
  event_type public.baby_event_type not null,
  started_at timestamptz not null default timezone('utc', now()),
  ended_at timestamptz,
  amount_ml integer,
  side public.feed_side,
  notes text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  deleted_at timestamptz,

  constraint baby_events_amount_ml_positive check (
    amount_ml is null or amount_ml > 0
  ),
  constraint baby_events_ended_after_start check (
    ended_at is null or ended_at >= started_at
  ),
  constraint baby_events_notes_length check (
    notes is null or char_length(notes) <= 2000
  )
);

comment on table public.baby_events is
  'Flexible care / milestone events. Visible to family members only.';

create trigger baby_events_set_updated_at
  before update on public.baby_events
  for each row execute function public.set_updated_at();

create index baby_events_family_id_idx on public.baby_events (family_id)
  where deleted_at is null;
create index baby_events_baby_started_idx
  on public.baby_events (baby_id, started_at desc)
  where deleted_at is null;
create index baby_events_parent_id_idx on public.baby_events (parent_id)
  where deleted_at is null;
create index baby_events_type_idx on public.baby_events (event_type)
  where deleted_at is null;

-- ---------------------------------------------------------------------------
-- milestones
-- ---------------------------------------------------------------------------
create table public.milestones (
  id uuid primary key default gen_random_uuid(),
  baby_id uuid not null references public.babies (id) on delete cascade,
  family_id uuid not null references public.families (id) on delete cascade,
  parent_id uuid not null references public.parents (id) on delete cascade,
  title text not null,
  description text,
  milestone_date date not null default current_date,
  category public.milestone_category not null default 'other',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  deleted_at timestamptz,

  constraint milestones_title_length check (char_length(title) between 1 and 160)
);

comment on table public.milestones is
  'Baby milestones shared within a family.';

create trigger milestones_set_updated_at
  before update on public.milestones
  for each row execute function public.set_updated_at();

create index milestones_baby_id_idx on public.milestones (baby_id)
  where deleted_at is null;
create index milestones_family_id_idx on public.milestones (family_id)
  where deleted_at is null;

-- ---------------------------------------------------------------------------
-- media_library (replaces calm_audio)
-- ---------------------------------------------------------------------------
create table public.media_library (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  media_type public.media_type not null,
  category public.media_category not null default 'other',
  media_url text not null,
  duration_seconds integer not null,
  is_premium boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  deleted_at timestamptz,

  constraint media_library_title_length check (char_length(title) between 1 and 120),
  constraint media_library_slug_format check (
    slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
  ),
  constraint media_library_duration_positive check (duration_seconds > 0)
);

comment on table public.media_library is
  'Calm / media catalog metadata. Premium gating via is_premium + subscription.';

create trigger media_library_set_updated_at
  before update on public.media_library
  for each row execute function public.set_updated_at();

create index media_library_type_idx on public.media_library (media_type)
  where deleted_at is null;
create index media_library_category_idx on public.media_library (category)
  where deleted_at is null;
create index media_library_is_premium_idx on public.media_library (is_premium)
  where deleted_at is null;

-- ---------------------------------------------------------------------------
-- daily_messages
-- ---------------------------------------------------------------------------
create table public.daily_messages (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null,
  category public.daily_message_category not null default 'encouragement',
  time_of_day public.time_of_day not null default 'anytime',
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),

  constraint daily_messages_title_length check (char_length(title) between 1 and 120),
  constraint daily_messages_body_length check (char_length(body) between 1 and 1000)
);

comment on table public.daily_messages is
  'Curated encouragement / tip copy shown in-app by time of day.';

create trigger daily_messages_set_updated_at
  before update on public.daily_messages
  for each row execute function public.set_updated_at();

create index daily_messages_active_tod_idx
  on public.daily_messages (is_active, time_of_day);

-- ---------------------------------------------------------------------------
-- analytics_events
-- ---------------------------------------------------------------------------
create table public.analytics_events (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid references public.parents (id) on delete set null,
  event_name text not null,
  properties jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),

  constraint analytics_events_name_length check (
    char_length(event_name) between 1 and 120
  )
);

comment on table public.analytics_events is
  'Product analytics. Insert by clients; read restricted to admin/support.';

create index analytics_events_parent_id_idx on public.analytics_events (parent_id);
create index analytics_events_name_created_idx
  on public.analytics_events (event_name, created_at desc);
create index analytics_events_created_at_idx
  on public.analytics_events (created_at desc);

-- ---------------------------------------------------------------------------
-- reports
-- ---------------------------------------------------------------------------
create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_parent_id uuid not null references public.parents (id) on delete cascade,
  reported_parent_id uuid references public.parents (id) on delete set null,
  circle_id uuid references public.circles (id) on delete set null,
  message_id uuid references public.circle_messages (id) on delete set null,
  reason text not null,
  notes text,
  status public.report_status not null default 'open',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),

  constraint reports_reason_length check (char_length(reason) between 1 and 500),
  constraint reports_has_target check (
    reported_parent_id is not null
    or circle_id is not null
    or message_id is not null
  )
);

comment on table public.reports is
  'User-submitted safety reports. Readable by moderator/support/admin.';

create trigger reports_set_updated_at
  before update on public.reports
  for each row execute function public.set_updated_at();

create index reports_status_idx on public.reports (status);
create index reports_reporter_parent_id_idx on public.reports (reporter_parent_id);
create index reports_reported_parent_id_idx on public.reports (reported_parent_id);

-- ---------------------------------------------------------------------------
-- moderation_actions
-- ---------------------------------------------------------------------------
create table public.moderation_actions (
  id uuid primary key default gen_random_uuid(),
  moderator_parent_id uuid not null references public.parents (id) on delete cascade,
  target_parent_id uuid not null references public.parents (id) on delete cascade,
  circle_id uuid references public.circles (id) on delete set null,
  action_type public.moderation_action_type not null,
  reason text not null,
  starts_at timestamptz not null default timezone('utc', now()),
  ends_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),

  constraint moderation_actions_reason_length check (
    char_length(reason) between 1 and 1000
  ),
  constraint moderation_actions_window check (
    ends_at is null or ends_at >= starts_at
  )
);

comment on table public.moderation_actions is
  'Staff moderation actions. Writable by moderator/support/admin only.';

create index moderation_actions_target_idx
  on public.moderation_actions (target_parent_id, created_at desc);
create index moderation_actions_moderator_idx
  on public.moderation_actions (moderator_parent_id);

-- ---------------------------------------------------------------------------
-- beta_testers
-- ---------------------------------------------------------------------------
create table public.beta_testers (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid references public.parents (id) on delete set null,
  email text not null,
  invited_at timestamptz not null default timezone('utc', now()),
  accepted_at timestamptz,
  feedback_score integer,
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),

  constraint beta_testers_email_format check (
    email ~* '^[^\s@]+@[^\s@]+\.[^\s@]+$'
  ),
  constraint beta_testers_feedback_score_range check (
    feedback_score is null or feedback_score between 1 and 10
  ),
  constraint beta_testers_email_unique unique (email)
);

comment on table public.beta_testers is
  'Beta invite list and feedback scores.';

create trigger beta_testers_set_updated_at
  before update on public.beta_testers
  for each row execute function public.set_updated_at();

create index beta_testers_parent_id_idx on public.beta_testers (parent_id);

-- ---------------------------------------------------------------------------
-- circle_invites
-- ---------------------------------------------------------------------------
create table public.circle_invites (
  id uuid primary key default gen_random_uuid(),
  circle_id uuid not null references public.circles (id) on delete cascade,
  invited_by_parent_id uuid not null references public.parents (id) on delete cascade,
  invited_parent_id uuid references public.parents (id) on delete set null,
  email text,
  status public.circle_invite_status not null default 'pending',
  expires_at timestamptz not null,
  accepted_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),

  constraint circle_invites_has_target check (
    invited_parent_id is not null or email is not null
  ),
  constraint circle_invites_email_format check (
    email is null or email ~* '^[^\s@]+@[^\s@]+\.[^\s@]+$'
  ),
  constraint circle_invites_expires_after_create check (
    expires_at > created_at
  )
);

comment on table public.circle_invites is
  'Invites to join a Glow Circle by parent id and/or email. Pending invites are unique per target.';

create trigger circle_invites_set_updated_at
  before update on public.circle_invites
  for each row execute function public.set_updated_at();

create unique index circle_invites_pending_email_unique
  on public.circle_invites (circle_id, lower(email))
  where status = 'pending' and email is not null;

create unique index circle_invites_pending_parent_unique
  on public.circle_invites (circle_id, invited_parent_id)
  where status = 'pending' and invited_parent_id is not null;

create index circle_invites_circle_id_idx on public.circle_invites (circle_id);
create index circle_invites_invited_by_parent_id_idx
  on public.circle_invites (invited_by_parent_id);
create index circle_invites_invited_parent_id_idx
  on public.circle_invites (invited_parent_id)
  where invited_parent_id is not null;
create index circle_invites_status_expires_idx
  on public.circle_invites (status, expires_at);

-- ---------------------------------------------------------------------------
-- connections (parent-to-parent)
-- ---------------------------------------------------------------------------
create table public.connections (
  id uuid primary key default gen_random_uuid(),
  requester_parent_id uuid not null references public.parents (id) on delete cascade,
  receiver_parent_id uuid not null references public.parents (id) on delete cascade,
  status public.connection_status not null default 'pending',
  requested_at timestamptz not null default timezone('utc', now()),
  accepted_at timestamptz,
  updated_at timestamptz not null default timezone('utc', now()),
  deleted_at timestamptz,

  constraint connections_no_self check (
    requester_parent_id <> receiver_parent_id
  )
);

comment on table public.connections is
  'Parent-to-parent connection requests. One active pair per unordered parent duo.';

create trigger connections_set_updated_at
  before update on public.connections
  for each row execute function public.set_updated_at();

-- One active (non-deleted) connection pair regardless of request direction.
create unique index connections_pair_unique
  on public.connections (
    least(requester_parent_id, receiver_parent_id),
    greatest(requester_parent_id, receiver_parent_id)
  )
  where deleted_at is null;

create index connections_requester_parent_id_idx
  on public.connections (requester_parent_id)
  where deleted_at is null;
create index connections_receiver_parent_id_idx
  on public.connections (receiver_parent_id)
  where deleted_at is null;
create index connections_status_idx
  on public.connections (status)
  where deleted_at is null;

-- ---------------------------------------------------------------------------
-- daily_activity (engagement flags per parent per day)
-- ---------------------------------------------------------------------------
create table public.daily_activity (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid not null references public.parents (id) on delete cascade,
  activity_date date not null default current_date,
  opened_app boolean not null default false,
  visited_circle boolean not null default false,
  sent_circle_message boolean not null default false,
  logged_baby_event boolean not null default false,
  played_calm_audio boolean not null default false,
  completed_day boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),

  constraint daily_activity_parent_date_unique unique (parent_id, activity_date)
);

comment on table public.daily_activity is
  'Per-parent daily engagement flags for streaks and product analytics.';

create trigger daily_activity_set_updated_at
  before update on public.daily_activity
  for each row execute function public.set_updated_at();

create index daily_activity_activity_date_idx
  on public.daily_activity (activity_date desc);
create index daily_activity_parent_date_idx
  on public.daily_activity (parent_id, activity_date desc);
create index daily_activity_completed_day_idx
  on public.daily_activity (activity_date)
  where completed_day = true;

-- ---------------------------------------------------------------------------
-- subscriptions
-- ---------------------------------------------------------------------------
create table public.subscriptions (
  parent_id uuid primary key references public.parents (id) on delete cascade,
  status public.subscription_status not null default 'none',
  trial_started_at timestamptz,
  trial_ends_at timestamptz,
  current_period_ends_at timestamptz,
  provider public.subscription_provider not null default 'none',
  provider_customer_id text,
  updated_at timestamptz not null default timezone('utc', now()),

  constraint subscriptions_trial_window check (
    trial_ends_at is null
    or trial_started_at is null
    or trial_ends_at >= trial_started_at
  )
);

comment on table public.subscriptions is
  'Billing status. Readable by owner; writes via service role / webhooks only.';

create trigger subscriptions_set_updated_at
  before update on public.subscriptions
  for each row execute function public.set_updated_at();

create index subscriptions_status_idx on public.subscriptions (status);
create index subscriptions_provider_customer_id_idx
  on public.subscriptions (provider_customer_id)
  where provider_customer_id is not null;

-- ---------------------------------------------------------------------------
-- Security-definer helpers (avoid recursive RLS)
-- ---------------------------------------------------------------------------
-- These bypass RLS on the tables they read so policies can compose safely.

create or replace function public.current_app_role()
returns public.app_role
language sql
stable
security definer
set search_path = public
as $$
  select role
  from public.parents
  where id = auth.uid()
    and deleted_at is null;
$$;

comment on function public.current_app_role() is
  'Returns auth.uid() app role without triggering parents RLS recursion.';

create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.parents p
    where p.id = auth.uid()
      and p.deleted_at is null
      and p.role in ('moderator', 'support', 'admin')
  );
$$;

create or replace function public.is_admin_or_support()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.parents p
    where p.id = auth.uid()
      and p.deleted_at is null
      and p.role in ('support', 'admin')
  );
$$;

create or replace function public.current_family_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select family_id
  from public.parents
  where id = auth.uid()
    and deleted_at is null;
$$;

create or replace function public.is_family_member(p_family_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.parents p
    where p.id = auth.uid()
      and p.deleted_at is null
      and p.family_id is not null
      and p.family_id = p_family_id
  );
$$;

create or replace function public.is_active_circle_member(p_circle_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.circle_members cm
    where cm.circle_id = p_circle_id
      and cm.parent_id = auth.uid()
      and cm.status = 'active'
      and cm.deleted_at is null
  );
$$;

comment on function public.is_active_circle_member(uuid) is
  'True if auth.uid() is an active member of the circle. Used by RLS.';

create or replace function public.family_owns_baby(p_baby_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.babies b
    join public.parents p on p.family_id = b.family_id
    where b.id = p_baby_id
      and b.deleted_at is null
      and p.id = auth.uid()
      and p.deleted_at is null
  );
$$;

-- Guard circle invite status transitions (recipient / inviter / staff).
create or replace function public.guard_circle_invite_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or coalesce(auth.role(), '') = 'service_role' then
    return new;
  end if;

  if public.is_staff() then
    return new;
  end if;

  -- Inviter may only revoke a pending invite (or leave non-status fields alone).
  if old.invited_by_parent_id = auth.uid() then
    if new.status is distinct from old.status then
      if not (
        old.status = 'pending'
        and new.status = 'revoked'
      ) then
        raise exception 'Inviter may only revoke a pending invite';
      end if;
    end if;
    -- Inviter cannot reassign invite targets or circle.
    if new.circle_id is distinct from old.circle_id
       or new.invited_parent_id is distinct from old.invited_parent_id
       or new.email is distinct from old.email
       or new.invited_by_parent_id is distinct from old.invited_by_parent_id then
      raise exception 'Cannot reassign circle invite targets';
    end if;
    return new;
  end if;

  -- Recipient may only accept or decline a pending invite addressed to them.
  if old.invited_parent_id = auth.uid() then
    if new.circle_id is distinct from old.circle_id
       or new.invited_parent_id is distinct from old.invited_parent_id
       or new.email is distinct from old.email
       or new.invited_by_parent_id is distinct from old.invited_by_parent_id then
      raise exception 'Cannot reassign circle invite targets';
    end if;
    if new.status is distinct from old.status then
      if not (
        old.status = 'pending'
        and new.status in ('accepted', 'declined')
      ) then
        raise exception 'Recipient may only accept or decline a pending invite';
      end if;
      if new.status = 'accepted' and new.accepted_at is null then
        new.accepted_at := timezone('utc', now());
      end if;
    end if;
    return new;
  end if;

  raise exception 'Not allowed to update this circle invite';
end;
$$;

create trigger circle_invites_guard_update
  before update on public.circle_invites
  for each row execute function public.guard_circle_invite_update();

-- Guard connection status transitions.
create or replace function public.guard_connection_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or coalesce(auth.role(), '') = 'service_role' then
    return new;
  end if;

  if public.is_staff() then
    return new;
  end if;

  if auth.uid() not in (old.requester_parent_id, old.receiver_parent_id) then
    raise exception 'Not a party to this connection';
  end if;

  -- Parties cannot swap identities.
  if new.requester_parent_id is distinct from old.requester_parent_id
     or new.receiver_parent_id is distinct from old.receiver_parent_id then
    raise exception 'Cannot reassign connection parties';
  end if;

  if new.status is distinct from old.status then
    -- Receiver: accept or decline pending.
    if old.receiver_parent_id = auth.uid()
       and old.status = 'pending'
       and new.status in ('accepted', 'declined') then
      if new.status = 'accepted' and new.accepted_at is null then
        new.accepted_at := timezone('utc', now());
      end if;
      return new;
    end if;

    -- Either party: block from pending/accepted/declined.
    if new.status = 'blocked'
       and old.status in ('pending', 'accepted', 'declined') then
      return new;
    end if;

    raise exception 'Invalid connection status transition';
  end if;

  -- Soft-delete allowed for either party.
  if new.deleted_at is distinct from old.deleted_at then
    return new;
  end if;

  return new;
end;
$$;

create trigger connections_guard_update
  before update on public.connections
  for each row execute function public.guard_connection_update();

-- Prevent users from changing role or subscription_status on their own row.
create or replace function public.protect_parent_privileged_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_role public.app_role;
begin
  -- No end-user JWT: migrations, SQL Editor, service_role, signup trigger.
  if auth.uid() is null or coalesce(auth.role(), '') = 'service_role' then
    return new;
  end if;

  if tg_op = 'INSERT' then
    -- Client inserts must always start as parent / none.
    if new.role is distinct from 'parent' then
      raise exception 'Cannot create parent with elevated role';
    end if;
    if new.subscription_status is distinct from 'none' then
      raise exception 'Cannot set subscription_status on insert';
    end if;
    return new;
  end if;

  -- UPDATE: only admin/support may change role or subscription_status.
  if new.role is distinct from old.role
     or new.subscription_status is distinct from old.subscription_status then
    v_actor_role := public.current_app_role();
    if v_actor_role is null or v_actor_role not in ('admin', 'support') then
      raise exception 'Cannot modify role or subscription_status';
    end if;
  end if;

  return new;
end;
$$;

create trigger parents_protect_privileged_columns
  before insert or update on public.parents
  for each row execute function public.protect_parent_privileged_columns();

-- ---------------------------------------------------------------------------
-- Auth signup: family + parent + preferences + subscription + presence
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_family_id uuid := gen_random_uuid();
  v_display_name text;
  v_state public.au_state;
begin
  v_display_name := coalesce(
    new.raw_user_meta_data ->> 'display_name',
    'New parent'
  );
  v_state := coalesce(
    (new.raw_user_meta_data ->> 'state')::public.au_state,
    'VIC'
  );

  -- Deferred FK: family references parent that is inserted next.
  insert into public.families (id, created_by_parent_id, name)
  values (v_family_id, new.id, 'My family');

  insert into public.parents (
    id,
    family_id,
    display_name,
    state,
    role,
    map_visibility,
    subscription_status
  )
  values (
    new.id,
    v_family_id,
    v_display_name,
    v_state,
    'parent',
    'state_only',
    'none'
  );

  insert into public.preferences (parent_id)
  values (new.id);

  insert into public.subscriptions (parent_id)
  values (new.id);

  insert into public.presence (parent_id, state, map_visibility, app_state)
  values (new.id, v_state, 'state_only', 'offline');

  return new;
end;
$$;

comment on function public.handle_new_user() is
  'On auth.users insert: creates family, parent, preferences, subscription, presence.';

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.families enable row level security;
alter table public.parents enable row level security;
alter table public.babies enable row level security;
alter table public.preferences enable row level security;
alter table public.devices enable row level security;
alter table public.circles enable row level security;
alter table public.circle_rules enable row level security;
alter table public.circle_members enable row level security;
alter table public.circle_messages enable row level security;
alter table public.circle_message_reactions enable row level security;
alter table public.presence enable row level security;
alter table public.map_clusters enable row level security;
alter table public.baby_events enable row level security;
alter table public.milestones enable row level security;
alter table public.media_library enable row level security;
alter table public.daily_messages enable row level security;
alter table public.analytics_events enable row level security;
alter table public.reports enable row level security;
alter table public.moderation_actions enable row level security;
alter table public.beta_testers enable row level security;
alter table public.circle_invites enable row level security;
alter table public.connections enable row level security;
alter table public.daily_activity enable row level security;
alter table public.subscriptions enable row level security;

-- families
create policy "families_select_member"
  on public.families for select
  to authenticated
  using (
    deleted_at is null
    and public.is_family_member(id)
  );

create policy "families_update_member"
  on public.families for update
  to authenticated
  using (
    deleted_at is null
    and public.is_family_member(id)
  )
  with check (public.is_family_member(id));

-- parents
create policy "parents_select_authenticated"
  on public.parents for select
  to authenticated
  using (deleted_at is null);

create policy "parents_insert_own"
  on public.parents for insert
  to authenticated
  with check (
    id = auth.uid()
    and role = 'parent'
    and subscription_status = 'none'
  );

create policy "parents_update_own"
  on public.parents for update
  to authenticated
  using (id = auth.uid() and deleted_at is null)
  with check (id = auth.uid());

-- babies (family-scoped)
create policy "babies_select_family"
  on public.babies for select
  to authenticated
  using (
    deleted_at is null
    and public.is_family_member(family_id)
  );

create policy "babies_insert_family"
  on public.babies for insert
  to authenticated
  with check (
    parent_id = auth.uid()
    and public.is_family_member(family_id)
  );

create policy "babies_update_family"
  on public.babies for update
  to authenticated
  using (
    deleted_at is null
    and public.is_family_member(family_id)
  )
  with check (public.is_family_member(family_id));

create policy "babies_delete_family"
  on public.babies for delete
  to authenticated
  using (public.is_family_member(family_id));

-- preferences
create policy "preferences_select_own"
  on public.preferences for select
  to authenticated
  using (parent_id = auth.uid());

create policy "preferences_insert_own"
  on public.preferences for insert
  to authenticated
  with check (parent_id = auth.uid());

create policy "preferences_update_own"
  on public.preferences for update
  to authenticated
  using (parent_id = auth.uid())
  with check (parent_id = auth.uid());

-- devices
create policy "devices_select_own"
  on public.devices for select
  to authenticated
  using (parent_id = auth.uid() and deleted_at is null);

create policy "devices_insert_own"
  on public.devices for insert
  to authenticated
  with check (parent_id = auth.uid());

create policy "devices_update_own"
  on public.devices for update
  to authenticated
  using (parent_id = auth.uid())
  with check (parent_id = auth.uid());

create policy "devices_delete_own"
  on public.devices for delete
  to authenticated
  using (parent_id = auth.uid());

-- circles
create policy "circles_select_authenticated"
  on public.circles for select
  to authenticated
  using (deleted_at is null);

create policy "circles_insert_authenticated"
  on public.circles for insert
  to authenticated
  with check (true);

create policy "circles_update_staff"
  on public.circles for update
  to authenticated
  using (public.is_staff())
  with check (public.is_staff());

-- circle_rules
create policy "circle_rules_select_authenticated"
  on public.circle_rules for select
  to authenticated
  using (true);

create policy "circle_rules_write_staff"
  on public.circle_rules for all
  to authenticated
  using (public.is_staff())
  with check (public.is_staff());

-- circle_members
create policy "circle_members_select_member_or_self"
  on public.circle_members for select
  to authenticated
  using (
    parent_id = auth.uid()
    or public.is_active_circle_member(circle_id)
  );

create policy "circle_members_insert_self"
  on public.circle_members for insert
  to authenticated
  with check (
    parent_id = auth.uid()
    and status = 'active'
  );

create policy "circle_members_update_self"
  on public.circle_members for update
  to authenticated
  using (parent_id = auth.uid())
  with check (parent_id = auth.uid());

create policy "circle_members_update_staff"
  on public.circle_members for update
  to authenticated
  using (public.is_staff())
  with check (public.is_staff());

-- circle_messages (active members only)
create policy "circle_messages_select_active_members"
  on public.circle_messages for select
  to authenticated
  using (
    public.is_active_circle_member(circle_id)
    and (
      moderation_status <> 'removed'
      or parent_id = auth.uid()
      or public.is_staff()
    )
  );

create policy "circle_messages_insert_active_members"
  on public.circle_messages for insert
  to authenticated
  with check (
    parent_id = auth.uid()
    and public.is_active_circle_member(circle_id)
    and moderation_status = 'clean'
  );

create policy "circle_messages_update_own"
  on public.circle_messages for update
  to authenticated
  using (parent_id = auth.uid())
  with check (parent_id = auth.uid());

create policy "circle_messages_update_staff"
  on public.circle_messages for update
  to authenticated
  using (public.is_staff())
  with check (public.is_staff());

-- circle_message_reactions
create policy "circle_message_reactions_select_members"
  on public.circle_message_reactions for select
  to authenticated
  using (
    exists (
      select 1
      from public.circle_messages m
      where m.id = message_id
        and public.is_active_circle_member(m.circle_id)
    )
  );

create policy "circle_message_reactions_insert_members"
  on public.circle_message_reactions for insert
  to authenticated
  with check (
    parent_id = auth.uid()
    and exists (
      select 1
      from public.circle_messages m
      where m.id = message_id
        and m.deleted_at is null
        and m.moderation_status <> 'removed'
        and public.is_active_circle_member(m.circle_id)
    )
  );

create policy "circle_message_reactions_delete_own"
  on public.circle_message_reactions for delete
  to authenticated
  using (parent_id = auth.uid());

-- presence: own row only for direct table access.
-- Everyone else must use map_presence / map_cluster_public views.
create policy "presence_select_own"
  on public.presence for select
  to authenticated
  using (parent_id = auth.uid());

create policy "presence_insert_own"
  on public.presence for insert
  to authenticated
  with check (parent_id = auth.uid());

create policy "presence_update_own"
  on public.presence for update
  to authenticated
  using (parent_id = auth.uid())
  with check (parent_id = auth.uid());

-- map_clusters: no direct client writes; staff/service maintain aggregates.
create policy "map_clusters_select_authenticated"
  on public.map_clusters for select
  to authenticated
  using (true);

-- baby_events (family-scoped)
create policy "baby_events_select_family"
  on public.baby_events for select
  to authenticated
  using (
    deleted_at is null
    and public.is_family_member(family_id)
  );

create policy "baby_events_insert_family"
  on public.baby_events for insert
  to authenticated
  with check (
    parent_id = auth.uid()
    and public.is_family_member(family_id)
    and public.family_owns_baby(baby_id)
  );

create policy "baby_events_update_family"
  on public.baby_events for update
  to authenticated
  using (
    deleted_at is null
    and public.is_family_member(family_id)
  )
  with check (public.is_family_member(family_id));

create policy "baby_events_delete_family"
  on public.baby_events for delete
  to authenticated
  using (public.is_family_member(family_id));

-- milestones
create policy "milestones_select_family"
  on public.milestones for select
  to authenticated
  using (
    deleted_at is null
    and public.is_family_member(family_id)
  );

create policy "milestones_insert_family"
  on public.milestones for insert
  to authenticated
  with check (
    parent_id = auth.uid()
    and public.is_family_member(family_id)
    and public.family_owns_baby(baby_id)
  );

create policy "milestones_update_family"
  on public.milestones for update
  to authenticated
  using (
    deleted_at is null
    and public.is_family_member(family_id)
  )
  with check (public.is_family_member(family_id));

create policy "milestones_delete_family"
  on public.milestones for delete
  to authenticated
  using (public.is_family_member(family_id));

-- media_library
create policy "media_library_select_authenticated"
  on public.media_library for select
  to authenticated
  using (deleted_at is null);

create policy "media_library_write_staff"
  on public.media_library for all
  to authenticated
  using (public.is_admin_or_support())
  with check (public.is_admin_or_support());

-- daily_messages
create policy "daily_messages_select_authenticated"
  on public.daily_messages for select
  to authenticated
  using (is_active = true);

create policy "daily_messages_write_staff"
  on public.daily_messages for all
  to authenticated
  using (public.is_admin_or_support())
  with check (public.is_admin_or_support());

-- analytics_events
create policy "analytics_events_insert_authenticated"
  on public.analytics_events for insert
  to authenticated
  with check (
    parent_id is null or parent_id = auth.uid()
  );

create policy "analytics_events_select_staff"
  on public.analytics_events for select
  to authenticated
  using (public.is_admin_or_support());

-- reports
create policy "reports_insert_own"
  on public.reports for insert
  to authenticated
  with check (reporter_parent_id = auth.uid());

create policy "reports_select_own_or_staff"
  on public.reports for select
  to authenticated
  using (
    reporter_parent_id = auth.uid()
    or public.is_staff()
  );

create policy "reports_update_staff"
  on public.reports for update
  to authenticated
  using (public.is_staff())
  with check (public.is_staff());

-- moderation_actions
create policy "moderation_actions_select_staff"
  on public.moderation_actions for select
  to authenticated
  using (public.is_staff());

create policy "moderation_actions_insert_staff"
  on public.moderation_actions for insert
  to authenticated
  with check (
    public.is_staff()
    and moderator_parent_id = auth.uid()
  );

-- beta_testers
create policy "beta_testers_select_own_or_staff"
  on public.beta_testers for select
  to authenticated
  using (
    parent_id = auth.uid()
    or public.is_admin_or_support()
  );

create policy "beta_testers_write_staff"
  on public.beta_testers for all
  to authenticated
  using (public.is_admin_or_support())
  with check (public.is_admin_or_support());

-- circle_invites
create policy "circle_invites_select_party_or_staff"
  on public.circle_invites for select
  to authenticated
  using (
    invited_by_parent_id = auth.uid()
    or invited_parent_id = auth.uid()
    or public.is_staff()
  );

create policy "circle_invites_insert_active_member"
  on public.circle_invites for insert
  to authenticated
  with check (
    invited_by_parent_id = auth.uid()
    and status = 'pending'
    and public.is_active_circle_member(circle_id)
    and (
      invited_parent_id is null
      or invited_parent_id <> auth.uid()
    )
  );

create policy "circle_invites_update_party_or_staff"
  on public.circle_invites for update
  to authenticated
  using (
    invited_by_parent_id = auth.uid()
    or invited_parent_id = auth.uid()
    or public.is_staff()
  )
  with check (
    invited_by_parent_id = auth.uid()
    or invited_parent_id = auth.uid()
    or public.is_staff()
  );

-- connections
create policy "connections_select_party"
  on public.connections for select
  to authenticated
  using (
    deleted_at is null
    and (
      requester_parent_id = auth.uid()
      or receiver_parent_id = auth.uid()
      or public.is_staff()
    )
  );

create policy "connections_insert_requester"
  on public.connections for insert
  to authenticated
  with check (
    requester_parent_id = auth.uid()
    and receiver_parent_id <> auth.uid()
    and status = 'pending'
  );

create policy "connections_update_party"
  on public.connections for update
  to authenticated
  using (
    requester_parent_id = auth.uid()
    or receiver_parent_id = auth.uid()
    or public.is_staff()
  )
  with check (
    requester_parent_id = auth.uid()
    or receiver_parent_id = auth.uid()
    or public.is_staff()
  );

-- Soft-delete via update; hard delete allowed for either party.
create policy "connections_delete_party"
  on public.connections for delete
  to authenticated
  using (
    requester_parent_id = auth.uid()
    or receiver_parent_id = auth.uid()
  );

-- daily_activity
create policy "daily_activity_select_own_or_staff"
  on public.daily_activity for select
  to authenticated
  using (
    parent_id = auth.uid()
    or public.is_staff()
  );

create policy "daily_activity_insert_own"
  on public.daily_activity for insert
  to authenticated
  with check (parent_id = auth.uid());

create policy "daily_activity_update_own"
  on public.daily_activity for update
  to authenticated
  using (parent_id = auth.uid())
  with check (parent_id = auth.uid());

-- subscriptions: owner read only; no authenticated write policies
-- (service_role / security definer handle_new_user perform writes)
create policy "subscriptions_select_own"
  on public.subscriptions for select
  to authenticated
  using (parent_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Privacy-safe map views
-- ---------------------------------------------------------------------------
-- security_invoker = false so the view can read presence rows beyond the
-- caller's own RLS policy. Column projection still strips unsafe fields.
create or replace view public.map_presence
with (security_invoker = false)
as
select
  p.parent_id,
  p.online_status,
  p.app_state,
  p.state,
  case
    when p.map_visibility = 'suburb_area' then p.suburb_area
    else null
  end as suburb_area,
  case
    when p.map_visibility = 'suburb_area' then p.approximate_lat
    else null
  end as approximate_lat,
  case
    when p.map_visibility = 'suburb_area' then p.approximate_lng
    else null
  end as approximate_lng,
  p.map_visibility,
  p.current_circle_id,
  p.last_seen_at
from public.presence p
where p.map_visibility <> 'hidden'
  and p.online_status = true
  and p.app_state in ('active', 'background');

comment on view public.map_presence is
  'Privacy-safe individual map feed. No street addresses. Coords only for suburb_area.';

create or replace view public.map_cluster_public
with (security_invoker = false)
as
select
  mc.id,
  mc.level,
  mc.state,
  case
    when mc.level = 'suburb_area' then mc.suburb_area
    else null
  end as suburb_area,
  mc.online_count,
  case
    when mc.level = 'suburb_area' then mc.approximate_lat
    else null
  end as approximate_lat,
  case
    when mc.level = 'suburb_area' then mc.approximate_lng
    else null
  end as approximate_lng,
  mc.updated_at
from public.map_clusters mc
where mc.online_count > 0
  and (
    mc.level <> 'suburb_area'
    or mc.online_count >= 5
  );

comment on view public.map_cluster_public is
  'Public map aggregates. Suburb clusters only when online_count >= 5.';

grant select on public.map_presence to authenticated;
grant select on public.map_cluster_public to authenticated;

-- ---------------------------------------------------------------------------
-- Realtime publication
-- ---------------------------------------------------------------------------
do $$
begin
  alter publication supabase_realtime add table public.circle_messages;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.circle_message_reactions;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.presence;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.circle_members;
exception when duplicate_object then null;
end $$;

-- ---------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------
grant usage on schema public to authenticated;

grant select, insert, update, delete on public.families to authenticated;
grant select, insert, update, delete on public.parents to authenticated;
grant select, insert, update, delete on public.babies to authenticated;
grant select, insert, update on public.preferences to authenticated;
grant select, insert, update, delete on public.devices to authenticated;
grant select, insert, update on public.circles to authenticated;
grant select, insert, update, delete on public.circle_rules to authenticated;
grant select, insert, update on public.circle_members to authenticated;
grant select, insert, update on public.circle_messages to authenticated;
grant select, insert, delete on public.circle_message_reactions to authenticated;
grant select, insert, update on public.presence to authenticated;
grant select on public.map_clusters to authenticated;
grant select, insert, update, delete on public.baby_events to authenticated;
grant select, insert, update, delete on public.milestones to authenticated;
grant select on public.media_library to authenticated;
grant select on public.daily_messages to authenticated;
grant insert on public.analytics_events to authenticated;
grant select on public.analytics_events to authenticated;
grant select, insert, update on public.reports to authenticated;
grant select, insert on public.moderation_actions to authenticated;
grant select, insert, update, delete on public.beta_testers to authenticated;
grant select, insert, update on public.circle_invites to authenticated;
grant select, insert, update, delete on public.connections to authenticated;
grant select, insert, update on public.daily_activity to authenticated;
grant select on public.subscriptions to authenticated;

grant execute on function public.current_app_role() to authenticated;
grant execute on function public.is_staff() to authenticated;
grant execute on function public.is_admin_or_support() to authenticated;
grant execute on function public.current_family_id() to authenticated;
grant execute on function public.is_family_member(uuid) to authenticated;
grant execute on function public.is_active_circle_member(uuid) to authenticated;
grant execute on function public.family_owns_baby(uuid) to authenticated;
