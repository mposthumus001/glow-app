-- =============================================================================
-- Hotfix — Ensure circle_messages.prompt_id exists (production schema drift)
-- =============================================================================
-- Root cause: migration 0006 defines prompt_id, but some environments applied
-- later migrations without this column present (PostgREST PGRST204).
--
-- Safe / idempotent: no-op when column + FK + index already exist.
-- Does not change RLS policies.
-- Prerequisite: public.circle_prompts must exist (from 0006).
-- =============================================================================

do $$
begin
  if to_regclass('public.circle_prompts') is null then
    raise exception
      'public.circle_prompts is missing. Apply migration 0006_circle_prompts_safety.sql before 0011.';
  end if;
end $$;

-- Nullable FK column (prompt-linked messages optional)
alter table public.circle_messages
  add column if not exists prompt_id uuid;

comment on column public.circle_messages.prompt_id is
  'Optional link to circle_prompts when the message responds to the daily prompt.';

-- Foreign key: ON DELETE SET NULL (matches 0006 architecture)
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.circle_messages'::regclass
      and contype = 'f'
      and conname = 'circle_messages_prompt_id_fkey'
  ) then
    alter table public.circle_messages
      add constraint circle_messages_prompt_id_fkey
      foreign key (prompt_id)
      references public.circle_prompts (id)
      on delete set null;
  end if;
end $$;

create index if not exists circle_messages_prompt_id_idx
  on public.circle_messages (prompt_id)
  where prompt_id is not null;

-- ---------------------------------------------------------------------------
-- Verification (run after apply; then reload PostgREST schema if needed)
-- ---------------------------------------------------------------------------
-- select column_name, is_nullable, data_type
-- from information_schema.columns
-- where table_schema = 'public'
--   and table_name = 'circle_messages'
--   and column_name = 'prompt_id';
--
-- select conname, confdeltype
-- from pg_constraint
-- where conrelid = 'public.circle_messages'::regclass
--   and conname = 'circle_messages_prompt_id_fkey';
--
-- -- PostgREST: Dashboard → Project Settings → API → Reload schema
-- -- or: NOTIFY pgrst, 'reload schema';
