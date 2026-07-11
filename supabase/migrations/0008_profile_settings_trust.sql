-- =============================================================================
-- Sprint 5.4 — Profile, Settings, Privacy & Trust
-- =============================================================================
-- account_deletion_requests — private beta deletion request path (manual process)
-- app_feedback — private in-app feedback / technical issues
-- No service-role in client. Users cannot mark deletion as processed.
-- =============================================================================

create type public.account_deletion_status as enum (
  'pending',
  'cancelled',
  'processed'
);

create type public.app_feedback_category as enum (
  'feedback',
  'technical',
  'safety',
  'other'
);

-- ---------------------------------------------------------------------------
-- account_deletion_requests
-- ---------------------------------------------------------------------------
create table public.account_deletion_requests (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid not null references public.parents (id) on delete cascade,
  status public.account_deletion_status not null default 'pending',
  reason text,
  requested_at timestamptz not null default timezone('utc', now()),
  processed_at timestamptz,
  updated_at timestamptz not null default timezone('utc', now()),

  constraint account_deletion_reason_length check (
    reason is null or char_length(reason) between 1 and 500
  ),
  constraint account_deletion_processed_consistency check (
    (status = 'processed' and processed_at is not null)
    or (status <> 'processed' and processed_at is null)
  )
);

comment on table public.account_deletion_requests is
  'Private beta account deletion requests. Staff processing is manual/deferred.';

create unique index account_deletion_one_pending_per_parent
  on public.account_deletion_requests (parent_id)
  where status = 'pending';

create index account_deletion_parent_idx
  on public.account_deletion_requests (parent_id);

create trigger account_deletion_requests_set_updated_at
  before update on public.account_deletion_requests
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- app_feedback
-- ---------------------------------------------------------------------------
create table public.app_feedback (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid not null references public.parents (id) on delete cascade,
  category public.app_feedback_category not null default 'feedback',
  message text not null,
  app_version text,
  route_context text,
  created_at timestamptz not null default timezone('utc', now()),

  constraint app_feedback_message_length check (
    char_length(message) between 1 and 2000
  ),
  constraint app_feedback_version_length check (
    app_version is null or char_length(app_version) between 1 and 40
  ),
  constraint app_feedback_route_length check (
    route_context is null or char_length(route_context) between 1 and 200
  )
);

comment on table public.app_feedback is
  'Private in-app feedback. Only the author (and future staff tools) can read.';

create index app_feedback_parent_idx on public.app_feedback (parent_id);
create index app_feedback_created_idx on public.app_feedback (created_at desc);

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.account_deletion_requests enable row level security;
alter table public.app_feedback enable row level security;

-- Deletion: own rows only. Users may insert pending, select own, cancel own pending.
-- Users cannot set status = processed or write processed_at.
create policy "account_deletion_select_own"
  on public.account_deletion_requests for select
  to authenticated
  using (parent_id = auth.uid());

create policy "account_deletion_insert_own"
  on public.account_deletion_requests for insert
  to authenticated
  with check (
    parent_id = auth.uid()
    and status = 'pending'
    and processed_at is null
  );

create policy "account_deletion_update_own_cancel"
  on public.account_deletion_requests for update
  to authenticated
  using (
    parent_id = auth.uid()
    and status = 'pending'
  )
  with check (
    parent_id = auth.uid()
    and status = 'cancelled'
    and processed_at is null
  );

create policy "account_deletion_select_staff"
  on public.account_deletion_requests for select
  to authenticated
  using (public.is_staff());

create policy "account_deletion_update_staff"
  on public.account_deletion_requests for update
  to authenticated
  using (public.is_staff())
  with check (public.is_staff());

-- Feedback: own insert + select only; staff can read later.
create policy "app_feedback_select_own"
  on public.app_feedback for select
  to authenticated
  using (parent_id = auth.uid());

create policy "app_feedback_insert_own"
  on public.app_feedback for insert
  to authenticated
  with check (parent_id = auth.uid());

create policy "app_feedback_select_staff"
  on public.app_feedback for select
  to authenticated
  using (public.is_staff());

grant select, insert, update on public.account_deletion_requests to authenticated;
grant select, insert on public.app_feedback to authenticated;
