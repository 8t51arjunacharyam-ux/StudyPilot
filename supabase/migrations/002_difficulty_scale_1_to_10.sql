-- ============================================================================
-- StudyPilot — 002 widen difficulty scale to 1-10
-- ============================================================================
--
-- WHY
-- The product spec asks for a 1-10 difficulty scale, which gives students more
-- granularity when describing a genuinely hard topic. The initial schema
-- (001) constrained difficulty to 1-5, which is too coarse for that.
--
-- HOW TO APPLY
--   Supabase dashboard -> SQL Editor -> New query -> paste -> Run
--
-- Run this AFTER 001_initial_schema.sql.
--
-- SCOPE: this changes difficulty scales only. It does NOT touch importance,
-- which stays 1-5 in both the subjects and exams tables.
--
-- ROLLBACK (safe: it only widens a constraint):
--   alter table public.subjects
--     drop constraint if exists subjects_difficulty_check,
--     add constraint subjects_difficulty_check check (difficulty between 1 and 5);
--   alter table public.topics
--     drop constraint if exists topics_difficulty_check,
--     add constraint topics_difficulty_check check (difficulty between 1 and 5);
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. subjects.difficulty: 1-5 -> 1-10
-- ----------------------------------------------------------------------------
-- Postgres names unnamed check constraints automatically as
-- "<table>_<column>_check", which is what we drop here.
alter table public.subjects
  drop constraint if exists subjects_difficulty_check;

alter table public.subjects
  add constraint subjects_difficulty_check
  check (difficulty between 1 and 10);

comment on column public.subjects.difficulty is
  'Subject difficulty, 1 (easiest) to 10 (hardest).';

-- ----------------------------------------------------------------------------
-- 2. topics.difficulty: 1-5 -> 1-10
-- ----------------------------------------------------------------------------
alter table public.topics
  drop constraint if exists topics_difficulty_check;

alter table public.topics
  add constraint topics_difficulty_check
  check (difficulty between 1 and 10);

comment on column public.topics.difficulty is
  'Topic difficulty, 1 (easiest) to 10 (hardest).';

-- ----------------------------------------------------------------------------
-- 3. subjects.importance — needed by the onboarding flow
-- ----------------------------------------------------------------------------
-- The 001 schema has importance on exams but not on subjects. Onboarding asks
-- the student to rate how important each subject is, which is a different
-- question from how hard it is. A student might find a subject easy but it
-- still counts for a large share of their grade.
--
-- Kept at 1-5 to match exams.importance. Consistency matters here because the
-- Difficulty Debt engine will compare the two values directly.
alter table public.subjects
  add column if not exists importance smallint;

update public.subjects
  set importance = 3
  where importance is null;

alter table public.subjects
  alter column importance set default 3;

alter table public.subjects
  alter column importance set not null;

alter table public.subjects
  drop constraint if exists subjects_importance_check;

alter table public.subjects
  add constraint subjects_importance_check
  check (importance between 1 and 5);

comment on column public.subjects.importance is
  'How much this subject counts, 1 (minor) to 5 (major). Distinct from difficulty.';

-- ----------------------------------------------------------------------------
-- 4. profiles.study_goal — needed by the onboarding flow
-- ----------------------------------------------------------------------------
-- A short free-text statement of what the student is aiming for, e.g.
-- "Get above 80% in my finals". Capped at 280 characters.
alter table public.profiles
  add column if not exists study_goal text
  check (study_goal is null or length(study_goal) <= 280);

comment on column public.profiles.study_goal is
  'The student''s own goal statement, captured during onboarding.';

-- ----------------------------------------------------------------------------
-- 5. VERIFY (read-only)
-- ----------------------------------------------------------------------------
-- EXPECTED: both rows show the 1-10 range.
--
--   select conrelid::regclass as table_name, conname,
--          pg_get_constraintdef(oid) as definition
--   from pg_constraint
--   where conname in ('subjects_difficulty_check', 'topics_difficulty_check')
--   order by conname;
--
-- EXPECTED: 1 row for subjects.importance and 1 for profiles.study_goal.
--
--   select table_name, column_name, data_type, is_nullable
--   from information_schema.columns
--   where table_schema = 'public'
--     and ((table_name = 'subjects' and column_name = 'importance')
--       or (table_name = 'profiles' and column_name = 'study_goal'));
--
-- END OF MIGRATION
-- ============================================================================