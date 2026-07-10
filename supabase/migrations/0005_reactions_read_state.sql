-- =============================================================================
-- Sprint 4.5 — Reactions & Read State
-- =============================================================================
-- Curated reaction types + message-id read marker on circle_members.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Reaction types (curated set — no arbitrary emoji)
-- ---------------------------------------------------------------------------
alter type public.reaction_type rename to reaction_type_legacy;

create type public.reaction_type as enum (
  'support',
  'with_you',
  'tiny_win',
  'sending_care'
);

alter table public.circle_message_reactions
  alter column reaction_type type public.reaction_type
  using (
    case reaction_type::text
      when 'heart' then 'support'::public.reaction_type
      when 'hug' then 'with_you'::public.reaction_type
      when 'support' then 'support'::public.reaction_type
      when 'celebrate' then 'tiny_win'::public.reaction_type
      else 'support'::public.reaction_type
    end
  );

drop type public.reaction_type_legacy;

comment on type public.reaction_type is
  'Curated Circle reactions: support, with_you, tiny_win, sending_care.';

-- ---------------------------------------------------------------------------
-- Read marker (message-id primary; timestamp secondary)
-- ---------------------------------------------------------------------------
alter table public.circle_members
  add column if not exists last_read_message_id uuid
    references public.circle_messages (id) on delete set null;

create index if not exists circle_members_last_read_message_id_idx
  on public.circle_members (last_read_message_id)
  where last_read_message_id is not null;

comment on column public.circle_members.last_read_message_id is
  'Private read marker for this parent in this circle. Monotonic forward only.';

-- ---------------------------------------------------------------------------
-- Monotonic read advance (never moves backwards)
-- ---------------------------------------------------------------------------
create or replace function public.advance_circle_read_state(
  p_circle_id uuid,
  p_message_id uuid
)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_membership_id uuid;
  v_msg record;
  v_current_id uuid;
  v_current record;
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;

  select cm.id, cm.last_read_message_id
  into v_membership_id, v_current_id
  from public.circle_members cm
  where cm.parent_id = v_uid
    and cm.circle_id = p_circle_id
    and cm.status = 'active'
    and cm.deleted_at is null
  limit 1;

  if v_membership_id is null then
    raise exception 'Not an active circle member';
  end if;

  select m.id, m.created_at, m.circle_id
  into v_msg
  from public.circle_messages m
  where m.id = p_message_id
    and m.circle_id = p_circle_id
    and m.deleted_at is null
    and m.moderation_status <> 'removed';

  if not found then
    raise exception 'Message not found in circle';
  end if;

  if v_current_id is not null then
    select m.id, m.created_at
    into v_current
    from public.circle_messages m
    where m.id = v_current_id;

    if found then
      if v_msg.created_at < v_current.created_at
        or (v_msg.created_at = v_current.created_at and v_msg.id <= v_current.id)
      then
        return jsonb_build_object(
          'advanced', false,
          'last_read_message_id', v_current_id
        );
      end if;
    end if;
  end if;

  update public.circle_members
  set
    last_read_message_id = p_message_id,
    last_read_at = timezone('utc', now())
  where id = v_membership_id;

  return jsonb_build_object(
    'advanced', true,
    'last_read_message_id', p_message_id
  );
end;
$$;

comment on function public.advance_circle_read_state(uuid, uuid) is
  'Advance private read marker monotonically for auth.uid() in p_circle_id.';

grant execute on function public.advance_circle_read_state(uuid, uuid) to authenticated;
