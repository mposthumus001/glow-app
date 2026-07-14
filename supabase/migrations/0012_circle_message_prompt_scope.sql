-- =============================================================================
-- Hotfix — Scope circle_messages.prompt_id to the message's circle
-- =============================================================================
-- When a parent moves circles (e.g. manual QA assignment), a stale prompt_id
-- from another circle must not block sends. Nullify invalid cross-circle links
-- before insert/update. Does not change RLS.
-- Prerequisite: public.circle_prompts (migration 0006).
-- =============================================================================

do $$
begin
  if to_regclass('public.circle_prompts') is null then
    raise exception
      'public.circle_prompts is missing. Apply migration 0006 before 0012.';
  end if;
end $$;

create or replace function public.guard_circle_message_prompt_scope()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.prompt_id is null then
    return new;
  end if;

  if not exists (
    select 1
    from public.circle_prompts cp
    where cp.id = new.prompt_id
      and cp.circle_id = new.circle_id
      and cp.is_active = true
  ) then
    new.prompt_id := null;
  end if;

  return new;
end;
$$;

comment on function public.guard_circle_message_prompt_scope() is
  'Nullifies prompt_id when it does not belong to the message circle (stale prompt after reassignment).';

drop trigger if exists circle_messages_prompt_scope on public.circle_messages;

create trigger circle_messages_prompt_scope
  before insert or update of prompt_id, circle_id
  on public.circle_messages
  for each row
  execute function public.guard_circle_message_prompt_scope();
