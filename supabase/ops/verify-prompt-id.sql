-- =============================================================================
-- Verification — circle_messages.prompt_id (run in Supabase SQL Editor)
-- After migration 0011. Then reload PostgREST schema.
-- =============================================================================

-- 1) Column exists and is nullable uuid
select
  column_name,
  data_type,
  is_nullable
from information_schema.columns
where table_schema = 'public'
  and table_name = 'circle_messages'
  and column_name = 'prompt_id';
-- Expect: prompt_id | uuid | YES

-- 2) Foreign key exists (SET NULL = confdeltype 'n')
select
  c.conname,
  pg_get_constraintdef(c.oid) as definition
from pg_constraint c
where c.conrelid = 'public.circle_messages'::regclass
  and c.conname = 'circle_messages_prompt_id_fkey';
-- Expect: FK to circle_prompts(id) ON DELETE SET NULL

-- 3) Partial index
select indexname
from pg_indexes
where schemaname = 'public'
  and tablename = 'circle_messages'
  and indexname = 'circle_messages_prompt_id_idx';

-- 4) Reload PostgREST schema cache (required after DDL)
notify pgrst, 'reload schema';

-- 5) App-path check (manual): send a Circle message from Glow UI
--    - without daily prompt → prompt_id null → succeeds
--    - with "Share something" → prompt_id set → succeeds
-- Existing rows remain valid (new nullable column defaults to null).
