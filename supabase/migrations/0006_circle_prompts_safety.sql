-- =============================================================================
-- Sprint 4.6 — Daily Prompts, Safety Foundations, Circle Polish
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Report reason enum (constrained reasons)
-- ---------------------------------------------------------------------------
create type public.report_reason as enum (
  'harmful',
  'harassment',
  'misinformation',
  'privacy',
  'spam',
  'other'
);

alter table public.reports
  add column if not exists reason_code public.report_reason;

alter table public.reports
  add constraint reports_notes_length check (
    notes is null or char_length(notes) <= 500
  );

create unique index if not exists reports_reporter_message_unique
  on public.reports (reporter_parent_id, message_id)
  where message_id is not null;

-- ---------------------------------------------------------------------------
-- Curated prompt library (global, beta-safe)
-- ---------------------------------------------------------------------------
create table public.prompt_library (
  id serial primary key,
  title text,
  prompt_text text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  constraint prompt_library_text_length check (
    char_length(prompt_text) between 1 and 280
  )
);

comment on table public.prompt_library is
  'Curated daily prompt templates. No runtime AI generation.';

insert into public.prompt_library (title, prompt_text)
values
  ('Tiny win', 'What''s one tiny win from today?'),
  ('Check-in', 'What''s been on your mind lately?'),
  ('Human moment', 'What helped you feel a little more human today?'),
  ('Gentle reflection', 'What would you tell yourself from last week?'),
  ('Gratitude', 'What''s something small you''re grateful for right now?'),
  ('A smile', 'What''s one thing that made you smile recently?'),
  ('This week', 'What do you need a little more of this week?'),
  ('Keeping going', 'What''s keeping you going right now?'),
  ('Surprise', 'What surprised you about parenting lately?'),
  ('Tonight', 'What would make tonight a little easier?');

-- ---------------------------------------------------------------------------
-- Circle daily prompts (one per circle per calendar date)
-- ---------------------------------------------------------------------------
create table public.circle_prompts (
  id uuid primary key default gen_random_uuid(),
  circle_id uuid not null references public.circles (id) on delete cascade,
  prompt_date date not null,
  title text,
  prompt_text text not null,
  library_index integer,
  is_active boolean not null default true,
  source text not null default 'library',
  created_at timestamptz not null default timezone('utc', now()),
  constraint circle_prompts_text_length check (
    char_length(prompt_text) between 1 and 280
  ),
  constraint circle_prompts_unique_date unique (circle_id, prompt_date)
);

create index circle_prompts_circle_date_idx
  on public.circle_prompts (circle_id, prompt_date desc);

comment on table public.circle_prompts is
  'One active daily prompt per circle per Australian calendar date.';

alter table public.circle_messages
  add column if not exists prompt_id uuid
    references public.circle_prompts (id) on delete set null;

create index if not exists circle_messages_prompt_id_idx
  on public.circle_messages (prompt_id)
  where prompt_id is not null;

-- ---------------------------------------------------------------------------
-- User-scoped hidden messages (local hide, durable across devices)
-- ---------------------------------------------------------------------------
create table public.hidden_messages (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid not null references public.parents (id) on delete cascade,
  message_id uuid not null references public.circle_messages (id) on delete cascade,
  hidden_at timestamptz not null default timezone('utc', now()),
  constraint hidden_messages_unique unique (parent_id, message_id)
);

create index hidden_messages_parent_id_idx
  on public.hidden_messages (parent_id);

comment on table public.hidden_messages is
  'Per-parent message hide. Does not affect other members.';

-- ---------------------------------------------------------------------------
-- Australian calendar date helper (Australia/Sydney)
-- ---------------------------------------------------------------------------
create or replace function public.australian_prompt_date(
  p_at timestamptz default timezone('utc', now())
)
returns date
language sql
stable
as $$
  select (timezone('Australia/Sydney', p_at))::date;
$$;

comment on function public.australian_prompt_date(timestamptz) is
  'Calendar date for daily prompts in Australia/Sydney (handles DST).';

create or replace function public.prompt_library_index(
  p_circle_id uuid,
  p_prompt_date date,
  p_count integer
)
returns integer
language sql
immutable
as $$
  select case
    when p_count <= 0 then 0
    else (abs(hashtext(p_circle_id::text || p_prompt_date::text)) % p_count)
  end;
$$;

create or replace function public.ensure_circle_daily_prompt(
  p_circle_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_circle_id uuid := p_circle_id;
  v_today date;
  v_existing record;
  v_count integer;
  v_index integer;
  v_lib record;
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;

  if v_circle_id is null then
    select cm.circle_id into v_circle_id
    from public.circle_members cm
    where cm.parent_id = v_uid
      and cm.status = 'active'
      and cm.deleted_at is null
    order by cm.joined_at desc
    limit 1;
  end if;

  if v_circle_id is null then
    raise exception 'No active circle';
  end if;

  if not public.is_active_circle_member(v_circle_id) then
    raise exception 'Not an active circle member';
  end if;

  v_today := public.australian_prompt_date();

  select cp.id, cp.title, cp.prompt_text, cp.prompt_date, cp.is_active
  into v_existing
  from public.circle_prompts cp
  where cp.circle_id = v_circle_id
    and cp.prompt_date = v_today
    and cp.is_active = true
  limit 1;

  if found then
    return jsonb_build_object(
      'id', v_existing.id,
      'title', v_existing.title,
      'prompt_text', v_existing.prompt_text,
      'prompt_date', v_existing.prompt_date,
      'created', false
    );
  end if;

  select count(*)::integer into v_count
  from public.prompt_library pl
  where pl.is_active = true;

  if v_count = 0 then
    return jsonb_build_object(
      'id', null,
      'title', null,
      'prompt_text', null,
      'prompt_date', v_today,
      'created', false
    );
  end if;

  v_index := public.prompt_library_index(v_circle_id, v_today, v_count);

  select pl.title, pl.prompt_text, pl.id
  into v_lib
  from public.prompt_library pl
  where pl.is_active = true
  order by pl.id
  offset v_index
  limit 1;

  insert into public.circle_prompts (
    circle_id,
    prompt_date,
    title,
    prompt_text,
    library_index,
    is_active,
    source
  )
  values (
    v_circle_id,
    v_today,
    v_lib.title,
    v_lib.prompt_text,
    v_index,
    true,
    'library'
  )
  on conflict (circle_id, prompt_date) do update
    set is_active = true
  returning id, title, prompt_text, prompt_date
  into v_existing;

  return jsonb_build_object(
    'id', v_existing.id,
    'title', v_existing.title,
    'prompt_text', v_existing.prompt_text,
    'prompt_date', v_existing.prompt_date,
    'created', true
  );
end;
$$;

grant execute on function public.australian_prompt_date(timestamptz) to authenticated;
grant execute on function public.ensure_circle_daily_prompt(uuid) to authenticated;

alter table public.circle_prompts enable row level security;
alter table public.prompt_library enable row level security;
alter table public.hidden_messages enable row level security;

create policy "circle_prompts_select_members"
  on public.circle_prompts for select
  to authenticated
  using (public.is_active_circle_member(circle_id) and is_active = true);

create policy "prompt_library_select_authenticated"
  on public.prompt_library for select
  to authenticated
  using (is_active = true);

create policy "hidden_messages_select_own"
  on public.hidden_messages for select
  to authenticated
  using (parent_id = auth.uid());

create policy "hidden_messages_insert_own"
  on public.hidden_messages for insert
  to authenticated
  with check (
    parent_id = auth.uid()
    and exists (
      select 1
      from public.circle_messages m
      where m.id = message_id
        and public.is_active_circle_member(m.circle_id)
        and m.deleted_at is null
    )
  );

create policy "hidden_messages_delete_own"
  on public.hidden_messages for delete
  to authenticated
  using (parent_id = auth.uid());

drop policy if exists "reports_insert_own" on public.reports;

create policy "reports_insert_member"
  on public.reports for insert
  to authenticated
  with check (
    reporter_parent_id = auth.uid()
    and (
      message_id is null
      or exists (
        select 1
        from public.circle_messages m
        where m.id = message_id
          and public.is_active_circle_member(m.circle_id)
          and m.deleted_at is null
      )
    )
  );

grant select on public.circle_prompts to authenticated;
grant select on public.prompt_library to authenticated;
grant select, insert, delete on public.hidden_messages to authenticated;
