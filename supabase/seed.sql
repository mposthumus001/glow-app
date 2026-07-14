-- =============================================================================
-- Glow Database v2.0 — Development seed data
-- =============================================================================
-- Run AFTER 0001_glow_core_schema.sql
-- Local / staging only. Do not use these passwords in production.
--
-- Inserts into auth.users fire handle_new_user(), which creates:
--   families, parents, preferences, subscriptions, presence
-- This seed then UPDATEs those rows and adds related domain data.
-- =============================================================================

create extension if not exists "pgcrypto";

-- Fixed UUIDs
-- melissa: 11111111-1111-1111-1111-111111111111
-- jordan:  22222222-2222-2222-2222-222222222222
-- sam:     33333333-3333-3333-3333-333333333333

-- ---------------------------------------------------------------------------
-- Auth users (dev only)
-- ---------------------------------------------------------------------------
insert into auth.users (
  id,
  instance_id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  confirmation_token,
  recovery_token,
  email_change_token_new,
  email_change,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at
)
values
  (
    '11111111-1111-1111-1111-111111111111',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'melissa@glow.dev',
    crypt('glow-dev-password', gen_salt('bf')),
    timezone('utc', now()),
    '', '', '', '',
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"display_name":"Melissa","state":"VIC"}'::jsonb,
    timezone('utc', now()),
    timezone('utc', now())
  ),
  (
    '22222222-2222-2222-2222-222222222222',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'jordan@glow.dev',
    crypt('glow-dev-password', gen_salt('bf')),
    timezone('utc', now()),
    '', '', '', '',
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"display_name":"Jordan","state":"NSW"}'::jsonb,
    timezone('utc', now()),
    timezone('utc', now())
  ),
  (
    '33333333-3333-3333-3333-333333333333',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'sam@glow.dev',
    crypt('glow-dev-password', gen_salt('bf')),
    timezone('utc', now()),
    '', '', '', '',
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"display_name":"Sam","state":"QLD"}'::jsonb,
    timezone('utc', now()),
    timezone('utc', now())
  )
on conflict (id) do nothing;

insert into auth.identities (
  id,
  user_id,
  identity_data,
  provider,
  provider_id,
  last_sign_in_at,
  created_at,
  updated_at
)
values
  (
    gen_random_uuid(),
    '11111111-1111-1111-1111-111111111111',
    jsonb_build_object(
      'sub', '11111111-1111-1111-1111-111111111111',
      'email', 'melissa@glow.dev'
    ),
    'email',
    '11111111-1111-1111-1111-111111111111',
    timezone('utc', now()),
    timezone('utc', now()),
    timezone('utc', now())
  ),
  (
    gen_random_uuid(),
    '22222222-2222-2222-2222-222222222222',
    jsonb_build_object(
      'sub', '22222222-2222-2222-2222-222222222222',
      'email', 'jordan@glow.dev'
    ),
    'email',
    '22222222-2222-2222-2222-222222222222',
    timezone('utc', now()),
    timezone('utc', now()),
    timezone('utc', now())
  ),
  (
    gen_random_uuid(),
    '33333333-3333-3333-3333-333333333333',
    jsonb_build_object(
      'sub', '33333333-3333-3333-3333-333333333333',
      'email', 'sam@glow.dev'
    ),
    'email',
    '33333333-3333-3333-3333-333333333333',
    timezone('utc', now()),
    timezone('utc', now()),
    timezone('utc', now())
  )
on conflict do nothing;

-- ---------------------------------------------------------------------------
-- Enrich parents / families (role + subscription_status via service_role path)
-- Seed runs as postgres/service role in SQL Editor, so privileged columns update.
-- ---------------------------------------------------------------------------
update public.families
set name = 'Melissa''s family'
where created_by_parent_id = '11111111-1111-1111-1111-111111111111';

update public.families
set name = 'Jordan''s family'
where created_by_parent_id = '22222222-2222-2222-2222-222222222222';

update public.families
set name = 'Sam''s family'
where created_by_parent_id = '33333333-3333-3333-3333-333333333333';

update public.parents
set
  display_name = 'Melissa',
  state = 'VIC',
  suburb_area = 'Inner North',
  feeding_method = 'mixed',
  first_child = true,
  map_visibility = 'suburb_area',
  subscription_status = 'trialing'
where id = '11111111-1111-1111-1111-111111111111';

update public.parents
set
  display_name = 'Jordan',
  state = 'NSW',
  suburb_area = null,
  feeding_method = 'breastfeeding',
  first_child = false,
  map_visibility = 'state_only',
  subscription_status = 'active'
where id = '22222222-2222-2222-2222-222222222222';

update public.parents
set
  display_name = 'Sam',
  state = 'QLD',
  suburb_area = null,
  feeding_method = 'bottle',
  first_child = true,
  map_visibility = 'hidden',
  subscription_status = 'none'
where id = '33333333-3333-3333-3333-333333333333';

-- ---------------------------------------------------------------------------
-- Presence privacy examples
-- ---------------------------------------------------------------------------
update public.presence
set
  online_status = true,
  app_state = 'active',
  state = 'VIC',
  suburb_area = 'Inner North',
  approximate_lat = -37.80,
  approximate_lng = 144.98,
  map_visibility = 'suburb_area',
  last_seen_at = timezone('utc', now())
where parent_id = '11111111-1111-1111-1111-111111111111';

update public.presence
set
  online_status = true,
  app_state = 'background',
  state = 'NSW',
  suburb_area = null,
  approximate_lat = null,
  approximate_lng = null,
  map_visibility = 'state_only',
  last_seen_at = timezone('utc', now())
where parent_id = '22222222-2222-2222-2222-222222222222';

update public.presence
set
  online_status = true,
  app_state = 'active',
  state = 'QLD',
  suburb_area = null,
  approximate_lat = null,
  approximate_lng = null,
  map_visibility = 'hidden',
  last_seen_at = timezone('utc', now())
where parent_id = '33333333-3333-3333-3333-333333333333';

-- ---------------------------------------------------------------------------
-- Babies (need family_id from signup-created families)
-- ---------------------------------------------------------------------------
insert into public.babies (
  id, parent_id, family_id, name, date_of_birth, due_date, feeding_method
)
select
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  '11111111-1111-1111-1111-111111111111',
  p.family_id,
  'Ollie',
  (current_date - interval '7 months')::date,
  null,
  'mixed'::public.feeding_method
from public.parents p
where p.id = '11111111-1111-1111-1111-111111111111'
on conflict (id) do nothing;

insert into public.babies (
  id, parent_id, family_id, name, date_of_birth, due_date, feeding_method
)
select
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  '22222222-2222-2222-2222-222222222222',
  p.family_id,
  'Nova',
  (current_date - interval '10 months')::date,
  null,
  'breastfeeding'::public.feeding_method
from public.parents p
where p.id = '22222222-2222-2222-2222-222222222222'
on conflict (id) do nothing;

insert into public.babies (
  id, parent_id, family_id, name, date_of_birth, due_date, feeding_method
)
select
  'cccccccc-cccc-cccc-cccc-cccccccccccc',
  '33333333-3333-3333-3333-333333333333',
  p.family_id,
  'Baby S',
  null,
  (current_date + interval '6 weeks')::date,
  'bottle'::public.feeding_method
from public.parents p
where p.id = '33333333-3333-3333-3333-333333333333'
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Circles + rules + members
-- ---------------------------------------------------------------------------
insert into public.circles (
  id, name, description, primary_state,
  baby_age_min_months, baby_age_max_months,
  circle_type, status, max_members
)
values
  (
    'dddddddd-dddd-dddd-dddd-dddddddddddd',
    'The Dream Feeders',
    'Late-night feeds and solidarity across Victoria.',
    'VIC', 5, 11, 'age_band', 'active', 12
  ),
  (
    'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
    'Sydney Sunrise Crew',
    'NSW parents navigating the 4am witching hour.',
    'NSW', 0, 6, 'local', 'active', 12
  )
on conflict (id) do nothing;

insert into public.circle_rules (
  id, circle_id, state, feeding_method,
  baby_age_min_months, baby_age_max_months, first_child, priority
)
values
  (
    'cr111111-1111-1111-1111-111111111111',
    'dddddddd-dddd-dddd-dddd-dddddddddddd',
    'VIC', null, 5, 11, null, 10
  ),
  (
    'cr222222-2222-2222-2222-222222222222',
    'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
    'NSW', null, 0, 6, null, 10
  )
on conflict (id) do nothing;

insert into public.circle_members (id, circle_id, parent_id, status, last_read_at)
values
  (
    'f1111111-1111-1111-1111-111111111111',
    'dddddddd-dddd-dddd-dddd-dddddddddddd',
    '11111111-1111-1111-1111-111111111111',
    'active',
    timezone('utc', now())
  ),
  (
    'f2222222-2222-2222-2222-222222222222',
    'dddddddd-dddd-dddd-dddd-dddddddddddd',
    '22222222-2222-2222-2222-222222222222',
    'active',
    timezone('utc', now()) - interval '1 hour'
  ),
  (
    'f3333333-3333-3333-3333-333333333333',
    'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
    '22222222-2222-2222-2222-222222222222',
    'active',
    timezone('utc', now())
  ),
  (
    'f4444444-4444-4444-4444-444444444444',
    'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
    '33333333-3333-3333-3333-333333333333',
    'active',
    null
  )
on conflict (id) do nothing;

update public.presence
set current_circle_id = 'dddddddd-dddd-dddd-dddd-dddddddddddd'
where parent_id = '11111111-1111-1111-1111-111111111111';

-- ---------------------------------------------------------------------------
-- Messages + reactions
-- ---------------------------------------------------------------------------
insert into public.circle_messages (
  id, circle_id, parent_id, body, moderation_status
)
values
  (
    'm1111111-1111-1111-1111-111111111111',
    'dddddddd-dddd-dddd-dddd-dddddddddddd',
    '11111111-1111-1111-1111-111111111111',
    'Anyone else up for the dream feed? You are not alone tonight.',
    'clean'
  ),
  (
    'm2222222-2222-2222-2222-222222222222',
    'dddddddd-dddd-dddd-dddd-dddddddddddd',
    '22222222-2222-2222-2222-222222222222',
    'Here with you. One feed at a time.',
    'clean'
  )
on conflict (id) do nothing;

insert into public.circle_message_reactions (
  id, message_id, parent_id, reaction_type
)
values
  (
    'r1111111-1111-1111-1111-111111111111',
    'm1111111-1111-1111-1111-111111111111',
    '22222222-2222-2222-2222-222222222222',
    'support'
  ),
  (
    'r2222222-2222-2222-2222-222222222222',
    'm2222222-2222-2222-2222-222222222222',
    '11111111-1111-1111-1111-111111111111',
    'with_you'
  )
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Baby events + milestones
-- ---------------------------------------------------------------------------
insert into public.baby_events (
  id, parent_id, baby_id, family_id, event_type,
  started_at, ended_at, amount_ml, side, notes, metadata
)
select
  'l1111111-1111-1111-1111-111111111111',
  '11111111-1111-1111-1111-111111111111',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  p.family_id,
  'bottle_feed'::public.baby_event_type,
  timezone('utc', now()) - interval '2 hours',
  timezone('utc', now()) - interval '1 hour 40 minutes',
  120,
  'none'::public.feed_side,
  'Dream feed — mostly asleep',
  '{"source":"seed"}'::jsonb
from public.parents p
where p.id = '11111111-1111-1111-1111-111111111111'
on conflict (id) do nothing;

insert into public.baby_events (
  id, parent_id, baby_id, family_id, event_type,
  started_at, ended_at, amount_ml, side, notes, metadata
)
select
  'l2222222-2222-2222-2222-222222222222',
  '11111111-1111-1111-1111-111111111111',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  p.family_id,
  'sleep'::public.baby_event_type,
  timezone('utc', now()) - interval '90 minutes',
  null,
  null,
  null,
  'Settled after feed',
  '{}'::jsonb
from public.parents p
where p.id = '11111111-1111-1111-1111-111111111111'
on conflict (id) do nothing;

insert into public.milestones (
  id, baby_id, family_id, parent_id, title, description, milestone_date, category
)
select
  'ms111111-1111-1111-1111-111111111111',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  p.family_id,
  '11111111-1111-1111-1111-111111111111',
  'First belly laugh',
  'Full giggle during tummy time',
  current_date - 14,
  'social'::public.milestone_category
from public.parents p
where p.id = '11111111-1111-1111-1111-111111111111'
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Preferences + devices + subscriptions
-- ---------------------------------------------------------------------------
update public.preferences
set
  theme_mode = 'dark',
  reduce_motion = false,
  map_visibility_default = 'suburb_area',
  circle_activity_notifications = true,
  quiet_time_enabled = true,
  silent_from = time '13:00',
  silent_to = time '16:00',
  daily_encouragement = true
where parent_id = '11111111-1111-1111-1111-111111111111';

insert into public.devices (
  id, parent_id, platform, push_token, app_version, last_seen_at
)
values
  (
    'dv111111-1111-1111-1111-111111111111',
    '11111111-1111-1111-1111-111111111111',
    'ios',
    'ExponentPushToken[dev-melissa-ios]',
    '1.0.0-dev',
    timezone('utc', now())
  ),
  (
    'dv222222-2222-2222-2222-222222222222',
    '22222222-2222-2222-2222-222222222222',
    'android',
    'ExponentPushToken[dev-jordan-android]',
    '1.0.0-dev',
    timezone('utc', now())
  )
on conflict (id) do nothing;

update public.subscriptions
set
  status = 'trialing',
  trial_started_at = timezone('utc', now()) - interval '2 days',
  trial_ends_at = timezone('utc', now()) + interval '12 days',
  provider = 'stripe',
  provider_customer_id = 'cus_dev_melissa'
where parent_id = '11111111-1111-1111-1111-111111111111';

update public.subscriptions
set
  status = 'active',
  trial_started_at = timezone('utc', now()) - interval '40 days',
  trial_ends_at = timezone('utc', now()) - interval '26 days',
  current_period_ends_at = timezone('utc', now()) + interval '20 days',
  provider = 'apple',
  provider_customer_id = 'apple_dev_jordan'
where parent_id = '22222222-2222-2222-2222-222222222222';

-- ---------------------------------------------------------------------------
-- Media library + daily messages
-- ---------------------------------------------------------------------------
insert into public.media_library (
  id, title, slug, media_type, category, media_url, duration_seconds, is_premium
)
values
  (
    'c1111111-1111-1111-1111-111111111111',
    'Box Breathing for 3am',
    'box-breathing-3am',
    'meditation',
    'breathing',
    'https://cdn.glow.dev/audio/box-breathing-3am.mp3',
    180,
    false
  ),
  (
    'c2222222-2222-2222-2222-222222222222',
    'Soft Rain White Noise',
    'soft-rain-white-noise',
    'audio',
    'white_noise',
    'https://cdn.glow.dev/audio/soft-rain.mp3',
    600,
    false
  ),
  (
    'c3333333-3333-3333-3333-333333333333',
    'You Are Enough',
    'you-are-enough',
    'audio',
    'affirmation',
    'https://cdn.glow.dev/audio/you-are-enough.mp3',
    240,
    true
  )
on conflict (id) do nothing;

insert into public.daily_messages (
  id, title, body, category, time_of_day, is_active
)
values
  (
    'dm111111-1111-1111-1111-111111111111',
    'You are doing better than you think',
    'And that is enough.',
    'encouragement',
    'overnight',
    true
  ),
  (
    'dm222222-2222-2222-2222-222222222222',
    'One feed at a time',
    'This night will pass. You are not alone.',
    'solidarity',
    'overnight',
    true
  )
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Map clusters (suburb only when count >= 5)
-- ---------------------------------------------------------------------------
insert into public.map_clusters (
  id, level, state, suburb_area, online_count, approximate_lat, approximate_lng
)
values
  (
    'mc000000-0000-0000-0000-000000000001',
    'country',
    null,
    null,
    1955,
    null,
    null
  ),
  (
    'mc000000-0000-0000-0000-000000000002',
    'state',
    'VIC',
    null,
    412,
    null,
    null
  ),
  (
    'mc000000-0000-0000-0000-000000000003',
    'state',
    'NSW',
    null,
    487,
    null,
    null
  ),
  (
    'mc000000-0000-0000-0000-000000000010',
    'state',
    'QLD',
    null,
    312,
    null,
    null
  ),
  (
    'mc000000-0000-0000-0000-000000000011',
    'state',
    'WA',
    null,
    165,
    null,
    null
  ),
  (
    'mc000000-0000-0000-0000-000000000012',
    'state',
    'SA',
    null,
    94,
    null,
    null
  ),
  (
    'mc000000-0000-0000-0000-000000000013',
    'state',
    'TAS',
    null,
    38,
    null,
    null
  ),
  (
    'mc000000-0000-0000-0000-000000000014',
    'state',
    'ACT',
    null,
    30,
    null,
    null
  ),
  (
    'mc000000-0000-0000-0000-000000000015',
    'state',
    'NT',
    null,
    17,
    null,
    null
  ),
  -- Suburb clusters (k ≥ 5). Names match Atlas suburb labels where possible.
  (
    'mc000000-0000-0000-0000-000000000020',
    'suburb_area',
    'VIC',
    'CBD',
    42,
    -37.81,
    144.96
  ),
  (
    'mc000000-0000-0000-0000-000000000021',
    'suburb_area',
    'VIC',
    'Richmond',
    28,
    -37.82,
    145.00
  ),
  (
    'mc000000-0000-0000-0000-000000000022',
    'suburb_area',
    'VIC',
    'Brunswick',
    23,
    -37.77,
    144.96
  ),
  (
    'mc000000-0000-0000-0000-000000000023',
    'suburb_area',
    'NSW',
    'CBD',
    38,
    -33.87,
    151.21
  ),
  (
    'mc000000-0000-0000-0000-000000000024',
    'suburb_area',
    'NSW',
    'Parramatta',
    34,
    -33.81,
    151.00
  ),
  (
    'mc000000-0000-0000-0000-000000000025',
    'suburb_area',
    'QLD',
    'CBD',
    26,
    -27.47,
    153.03
  ),
  (
    'mc000000-0000-0000-0000-000000000026',
    'suburb_area',
    'WA',
    'CBD',
    18,
    -31.95,
    115.86
  ),
  (
    'mc000000-0000-0000-0000-000000000027',
    'suburb_area',
    'SA',
    'CBD',
    16,
    -34.93,
    138.60
  ),
  (
    'mc000000-0000-0000-0000-000000000028',
    'suburb_area',
    'ACT',
    'Civic',
    12,
    -35.28,
    149.13
  )
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Analytics, beta, report sample
-- ---------------------------------------------------------------------------
insert into public.analytics_events (id, parent_id, event_name, properties)
values
  (
    'ae111111-1111-1111-1111-111111111111',
    '11111111-1111-1111-1111-111111111111',
    'tonight_screen_viewed',
    '{"source":"seed"}'::jsonb
  )
on conflict (id) do nothing;

insert into public.beta_testers (
  id, parent_id, email, email_normalized, status, invited_at, accepted_at,
  activated_at, feedback_score, notes
)
values
  (
    'bt111111-1111-1111-1111-111111111111',
    '11111111-1111-1111-1111-111111111111',
    'melissa@glow.dev',
    'melissa@glow.dev',
    'active',
    timezone('utc', now()) - interval '7 days',
    timezone('utc', now()) - interval '6 days',
    timezone('utc', now()) - interval '6 days',
    9,
    'Seed QA account — replace in production'
  )
on conflict (id) do nothing;

insert into public.reports (
  id, reporter_parent_id, reported_parent_id, circle_id, message_id,
  reason, notes, status
)
values
  (
    'rp111111-1111-1111-1111-111111111111',
    '11111111-1111-1111-1111-111111111111',
    null,
    'dddddddd-dddd-dddd-dddd-dddddddddddd',
    null,
    'spam',
    'Seed placeholder report — dismiss in staging',
    'dismissed'
  )
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Circle invites, connections, daily activity
-- ---------------------------------------------------------------------------
insert into public.circle_invites (
  id,
  circle_id,
  invited_by_parent_id,
  invited_parent_id,
  email,
  status,
  expires_at
)
values
  (
    'ci111111-1111-1111-1111-111111111111',
    'dddddddd-dddd-dddd-dddd-dddddddddddd',
    '11111111-1111-1111-1111-111111111111',
    '33333333-3333-3333-3333-333333333333',
    null,
    'pending',
    timezone('utc', now()) + interval '7 days'
  ),
  (
    'ci222222-2222-2222-2222-222222222222',
    'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
    '22222222-2222-2222-2222-222222222222',
    null,
    'friend@glow.dev',
    'pending',
    timezone('utc', now()) + interval '14 days'
  )
on conflict (id) do nothing;

insert into public.connections (
  id,
  requester_parent_id,
  receiver_parent_id,
  status,
  requested_at,
  accepted_at
)
values
  (
    'cn111111-1111-1111-1111-111111111111',
    '11111111-1111-1111-1111-111111111111',
    '22222222-2222-2222-2222-222222222222',
    'accepted',
    timezone('utc', now()) - interval '3 days',
    timezone('utc', now()) - interval '2 days'
  ),
  (
    'cn222222-2222-2222-2222-222222222222',
    '22222222-2222-2222-2222-222222222222',
    '33333333-3333-3333-3333-333333333333',
    'pending',
    timezone('utc', now()) - interval '1 day',
    null
  )
on conflict (id) do nothing;

insert into public.daily_activity (
  id,
  parent_id,
  activity_date,
  opened_app,
  visited_circle,
  sent_circle_message,
  logged_baby_event,
  played_calm_audio,
  completed_day,
  metadata
)
values
  (
    'da111111-1111-1111-1111-111111111111',
    '11111111-1111-1111-1111-111111111111',
    current_date,
    true,
    true,
    true,
    true,
    false,
    true,
    '{"source":"seed"}'::jsonb
  ),
  (
    'da222222-2222-2222-2222-222222222222',
    '22222222-2222-2222-2222-222222222222',
    current_date,
    true,
    true,
    false,
    false,
    true,
    false,
    '{"source":"seed"}'::jsonb
  )
on conflict (id) do nothing;
