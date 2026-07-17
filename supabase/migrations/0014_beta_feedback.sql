-- =============================================================================
-- Sprint 7.1 — Private beta feedback (structured)
-- =============================================================================
-- Replaces app_feedback for new submissions. Legacy app_feedback rows remain.
-- Users: insert own rows only. Staff: read all. No user updates.
-- =============================================================================

create type public.beta_feedback_category as enum (
  'bug',
  'confusing',
  'suggestion',
  'other'
);

create type public.beta_feedback_status as enum (
  'new',
  'reviewed',
  'closed'
);

create table public.beta_feedback (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid not null references public.parents (id) on delete cascade,
  category public.beta_feedback_category not null,
  summary text not null,
  details text,
  route text,
  app_version text,
  environment text,
  user_agent text,
  viewport text,
  contact_allowed boolean not null default false,
  status public.beta_feedback_status not null default 'new',
  created_at timestamptz not null default timezone('utc', now()),

  constraint beta_feedback_summary_length check (
    char_length(summary) between 1 and 200
  ),
  constraint beta_feedback_details_length check (
    details is null or char_length(details) between 1 and 2000
  ),
  constraint beta_feedback_route_length check (
    route is null or char_length(route) between 1 and 200
  ),
  constraint beta_feedback_version_length check (
    app_version is null or char_length(app_version) between 1 and 40
  ),
  constraint beta_feedback_environment_length check (
    environment is null or char_length(environment) between 1 and 40
  ),
  constraint beta_feedback_user_agent_length check (
    user_agent is null or char_length(user_agent) between 1 and 512
  ),
  constraint beta_feedback_viewport_length check (
    viewport is null or char_length(viewport) between 1 and 32
  )
);

comment on table public.beta_feedback is
  'Structured private-beta feedback. Manual review during beta.';

create index beta_feedback_parent_idx on public.beta_feedback (parent_id);
create index beta_feedback_created_idx on public.beta_feedback (created_at desc);
create index beta_feedback_status_idx on public.beta_feedback (status);

alter table public.beta_feedback enable row level security;

create policy "beta_feedback_select_own"
  on public.beta_feedback for select
  to authenticated
  using (parent_id = auth.uid());

create policy "beta_feedback_insert_own"
  on public.beta_feedback for insert
  to authenticated
  with check (
    parent_id = auth.uid()
    and status = 'new'
  );

create policy "beta_feedback_select_staff"
  on public.beta_feedback for select
  to authenticated
  using (public.is_staff());

grant select, insert on public.beta_feedback to authenticated;
