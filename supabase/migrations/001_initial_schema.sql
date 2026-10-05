-- ============================================================================
-- StudyPilot â€” 001 initial schema
-- ============================================================================
--
-- HOW TO APPLY THIS FILE
--   1. Open your project at https://supabase.com
--   2. Sidebar -> "SQL Editor" -> "New query"
--   3. Paste this ENTIRE file
--   4. Click "Run"
--
-- Full design and rationale: docs/DATABASE_DESIGN.md
--
-- ---------------------------------------------------------------------------
-- SECURITY RULES OBSERVED IN THIS FILE
-- ---------------------------------------------------------------------------
--   * NO SECRETS. Only SQL here. No URLs, no API keys, no passwords.
--     Keys live solely in .env.local, which is gitignored.
--   * NO PASSWORDS STORED BY US. Credentials live only in Supabase's
--     auth.users table. No table below has a password column.
--   * RLS ENABLED ON EVERY TABLE. A table without RLS is a table that leaks.
--   * EVERY POLICY CHECKS auth.uid(), which Supabase derives from the verified
--     session token. A client cannot forge it.
--   * NO PUBLIC READ POLICIES. An anonymous visitor matches zero rows.
--
-- Re-running is safe: every object uses "if not exists" guards.
-- ============================================================================


-- ============================================================================
-- 1. EXTENSIONS
-- ============================================================================
-- pgcrypto provides gen_random_uuid() and is already enabled on Supabase.
-- This call is a no-op if present, and safe if not.
create extension if not exists pgcrypto;


-- ============================================================================
-- 2. HELPER: keep updated_at current
-- ============================================================================
-- Applied as a BEFORE UPDATE trigger. Without this, updated_at silently goes
-- stale and "last modified" becomes a lie.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;


-- ============================================================================
-- 3. PROFILES
-- ============================================================================
-- One row per student, created automatically at signup (section 4).
--
-- NOTE THE ABSENCE OF A PASSWORD COLUMN. That is deliberate. We never store,
-- hash, or even see a student's password; Supabase Auth owns credentials.
-- If this database leaked, no passwords would be in it.
--
-- The primary key is the SAME uuid as auth.users.id, not a separate id. That is
-- what lets RLS compare a row's owner against the caller with one equality.
create table if not exists public.profiles (
  id                       uuid primary key
                           references auth.users (id) on delete cascade,
  email                    text,
  full_name                text,
  timezone                 text not null default 'UTC',
  onboarding_completed     boolean not null default false,
  daily_study_goal_minutes integer not null default 120
                           check (daily_study_goal_minutes between 0 and 1440),
  current_streak_days      integer not null default 0
                           check (current_streak_days >= 0),
  longest_streak_days      integer not null default 0
                           check (longest_streak_days >= 0),
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now()
);

comment on table public.profiles is
  'One row per student. NO password column - credentials live in auth.users.';

-- Light sanity check on timezone: must look like an IANA zone name. Catches
-- the common typo without being so strict it rejects valid zones.
alter table public.profiles
  drop constraint if exists profiles_timezone_format;
alter table public.profiles
  add constraint profiles_timezone_format
  check (timezone ~ '^[A-Za-z]+(/[A-Za-z_+-]+)+$|^UTC$');

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();


-- ============================================================================
-- 4. AUTO-CREATE A PROFILE ON SIGNUP
-- ============================================================================
-- WHY A TRIGGER: the new student cannot insert their own profile row. RLS
-- would block it, because at insert time no row authorises them yet.
--
-- WHY THAT IS SAFE: the function writes exactly one row, using only new.id and
-- new.email, which come from the VERIFIED auth record - never user input.
--
-- WHY "security definer": so the trigger is not itself blocked by RLS.
--
-- WHY "set search_path = public": hardening. Without it, someone able to create
-- objects in an earlier schema could shadow this function and hijack it.
--
-- WHY "on conflict do nothing": makes the trigger safe to run twice.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();


-- ============================================================================
-- 5. SUBJECTS
-- ============================================================================
-- A subject the student is taking, e.g. "Calculus".
--
-- user_id is the ownership anchor: every RLS policy on this table compares it
-- against auth.uid(). ON DELETE CASCADE means deleting the auth user removes
-- their subjects, and by extension topics, exams and sessions.
create table if not exists public.subjects (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  name        text not null check (length(trim(name)) between 1 and 120),
  color       text not null default '#4f46e5',
  difficulty  smallint not null default 3 check (difficulty between 1 and 5),
  -- Soft-hide a past semester without destroying its history.
  archived_at timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

comment on table public.subjects is
  'A subject. Deleting cascades to topics, exams and sessions.';

drop trigger if exists subjects_set_updated_at on public.subjects;
create trigger subjects_set_updated_at
  before update on public.subjects
  for each row execute function public.set_updated_at();


-- ============================================================================
-- 6. EXAMS
-- ============================================================================
-- An exam date, which drives urgency weighting in Difficulty Debt.
create table if not exists public.exams (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users (id) on delete cascade,
  subject_id    uuid not null references public.subjects (id) on delete cascade,
  title         text not null check (length(trim(title)) between 1 and 160),
  exam_date     timestamptz not null,
  importance    smallint not null default 3 check (importance between 1 and 5),
  -- Topics in scope for this exam.
  --
  -- A deliberate exception to normalisation: a join table would be three
  -- tables' worth of machinery for a list we only ever read whole, never
  -- filtered by membership. Entries may dangle after a topic is deleted; we
  -- ignore unknown ids when reading.
  topics_covered uuid[] not null default '{}',
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

comment on table public.exams is
  'Exam dates driving urgency. exam_date may be in the past (retroactive entry).';

-- Deliberately NOT constrained to the future: a student may record an exam
-- that has already happened.
drop trigger if exists exams_set_updated_at on public.exams;
create trigger exams_set_updated_at
  before update on public.exams
  for each row execute function public.set_updated_at();


-- ============================================================================
-- 7. TOPICS
-- ============================================================================
-- The atom of the entire scheduling system. Everything placed into a calendar
-- is a topic.
--
-- WHY "confidence" LIVES HERE BUT HISTORY LIVES IN memory_reviews:
--   confidence is the CURRENT belief - cheap to read, fast to sort by, no join
--   needed for the dashboard or Memory Radar's at-risk list.
--   memory_reviews is the APPEND-ONLY history.
-- Folding history into this row would force a rewrite on every review and
-- destroy the evidence trail the forgetting curve depends on.
create table if not exists public.topics (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references auth.users (id) on delete cascade,
  subject_id          uuid not null references public.subjects (id) on delete cascade,
  name                text not null check (length(trim(name)) between 1 and 160),
  -- Length of one focused session on this topic.
  estimated_minutes   integer not null default 45 check (estimated_minutes between 5 and 480),
  difficulty          smallint not null default 3 check (difficulty between 1 and 5),
  -- CURRENT belief: 0 = forgotten, 100 = solid.
  confidence          smallint not null default 50 check (confidence between 0 and 100),
  last_reviewed_at    timestamptz,
  needs_active_recall boolean not null default false,
  -- True while first-time study is outstanding.
  is_new              boolean not null default true,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

comment on table public.topics is
  'The scheduling atom. confidence is the current belief; memory_reviews is the history.';

drop trigger if exists topics_set_updated_at on public.topics;
create trigger topics_set_updated_at
  before update on public.topics


-- ============================================================================
-- 8. STUDY_PREFERENCES
-- ============================================================================
-- "When am I free, and how well do I focus then?" - one concept, one row.
--
-- Example: day_of_week = 1, start 18:00, end 21:00, energy_level 4.
--
-- energy_level here is the student's ROUTINE: what they usually manage in that
-- slot. The energy they ACTUALLY felt on a given day is recorded separately in
-- daily_energy. Keeping the two apart is what lets Plan Rescue detect reality
-- diverging from the plan - merging them would destroy that signal.
create table if not exists public.study_preferences (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users (id) on delete cascade,
  -- 0 = Sunday ... 6 = Saturday. Matches JavaScript's Date.getDay().
  day_of_week  smallint not null check (day_of_week between 0 and 6),
  start_time   time not null,
  end_time     time not null,
  energy_level smallint not null default 3 check (energy_level between 1 and 5),
  -- Pause a recurring window without deleting it.
  is_active    boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),

  -- Stops a student saving 22:00-06:00 by accident.
  constraint study_preferences_valid_range check (end_time > start_time)
);

comment on table public.study_preferences is
  'Recurring weekly availability + routine energy. Actual daily energy is in daily_energy.';

-- Prevent two identical windows; the app still checks for overlaps before insert.
create unique index if not exists study_preferences_unique_slot
  on public.study_preferences (user_id, day_of_week, start_time);

drop trigger if exists study_preferences_set_updated_at on public.study_preferences;
create trigger study_preferences_set_updated_at
  before update on public.study_preferences
  for each row execute function public.set_updated_at();


-- ============================================================================
-- 9. DAILY_ENERGY
-- ============================================================================
-- What the student ACTUALLY felt on a specific day.
--
-- WHY THIS IS SEPARATE FROM study_preferences:
--   preference   = my routine (what I usually can do)
--   daily_energy = reality (what I actually managed today)
-- Plan Rescue exists to detect that gap, and this table is the evidence.
--
-- WHY "date" AND NOT "timestamptz":
--   Energy is a feeling about a DAY, not an instant. A timestamp would create
--   phantom timezone bugs - "Monday's energy" must not shift when a student
--   travels. We store the local calendar date and never convert it.
create table if not exists public.daily_energy (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users (id) on delete cascade,
  log_date     date not null,
  energy_level smallint not null check (energy_level between 1 and 5),
  note         text check (note is null or length(note) <= 280),
  created_at   timestamptz not null default now()
);

comment on table public.daily_energy is
  'Actual energy logged per calendar day. One entry per day per user.';

-- One entry per day: re-logging updates rather than duplicating.
create unique index if not exists daily_energy_one_per_day
  on public.daily_energy (user_id, log_date);


-- ============================================================================
-- 10. ACHIEVEMENTS
-- ============================================================================
-- SERVER-WRITTEN ONLY.
--
-- WHY: a student-writable achievements table is trivially cheatable - one
-- insert call and every badge is yours. The entire value of an achievement
-- comes from the server having independently decided you earned it.
--
-- RLS gives students SELECT only. There is NO INSERT policy, so a client
-- cannot grant itself a badge; only our server code can write these rows.
create table if not exists public.achievements (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users (id) on delete cascade,
  -- Stable identifier, e.g. 'first_session', 'streak_7'.
  achievement_key text not null check (length(trim(achievement_key)) between 1 and 60),
  -- Display text is denormalised so past awards keep their original wording.
  title           text not null check (length(trim(title)) between 1 and 120),
  description     text,
  icon            text,
  earned_at       timestamptz not null default now(),
  created_at      timestamptz not null default now()
);

comment on table public.achievements is
  'Server-awarded milestones. Students have read-only access (no INSERT policy).';

-- A badge cannot be earned twice.
create unique index if not exists achievements_unique_per_user
  on public.achievements (user_id, achievement_key);

-- ============================================================================
-- 11. STUDY_PLANS
-- ============================================================================
-- Plans are VERSIONED, never overwritten.
--
-- When Plan Rescue redistributes missed work, the old plan is marked inactive
-- and a new one is created. This preserves an audit trail ("what did the plan
-- look like before I missed three days?") and makes the scheduling algorithm
-- debuggable after the fact.
create table if not exists public.study_plans (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users (id) on delete cascade,
  name              text not null check (length(trim(name)) between 1 and 120),
  is_active         boolean not null default true,
  -- Why this version exists.
  generation_reason text not null default 'initial'
                     check (generation_reason in ('initial', 'plan_rescue', 'manual_regenerate')),
  -- When the ALGORITHM produced this, as opposed to when the row was written.
  generated_at      timestamptz not null default now(),
  plan_start_date   date not null,
  plan_end_date     date not null,
  created_at        timestamptz not null default now(),

  constraint study_plans_valid_range check (plan_end_date >= plan_start_date)
);

comment on table public.study_plans is
  'Versioned plans. Exactly one active plan per user, enforced by a partial unique index.';


-- ============================================================================
-- 12. STUDY_SESSIONS
-- ============================================================================
-- The concrete scheduled work units - what the dashboard lists.
create table if not exists public.study_sessions (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users (id) on delete cascade,
  plan_id           uuid references public.study_plans (id) on delete cascade,
  topic_id          uuid not null references public.topics (id) on delete cascade,
  scheduled_start   timestamptz not null,
  scheduled_end     timestamptz not null,
  planned_minutes   integer not null check (planned_minutes between 0 and 1440),
  -- NULL until the student completes the session.
  actual_minutes    integer check (actual_minutes is null or actual_minutes between 0 and 1440),
  status            text not null default 'planned'
                    check (status in ('planned', 'completed', 'skipped', 'rescheduled')),
  -- BrainFit result: how well the work matched the energy of that hour.
  energy_match      text check (energy_match in ('peak', 'steady', 'light')),
  -- Lineage: which missed session this rescued work came from. Makes Plan
  -- Rescue auditable ("this hour exists because you missed Tuesday").
  rescued_from_id   uuid references public.study_sessions (id) on delete set null,
  completed_at      timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),

  constraint study_sessions_valid_range check (scheduled_end > scheduled_start)
);

comment on table public.study_sessions is
  'Scheduled work units. scheduled_start is NOT constrained to the future.';

drop trigger if exists study_sessions_set_updated_at on public.study_sessions;
create trigger study_sessions_set_updated_at
  before update on public.study_sessions
  for each row execute function public.set_updated_at();


-- ============================================================================
-- 13. MEMORY_REVIEWS
-- ============================================================================
-- APPEND-ONLY. The raw evidence Memory Radar learns from.
--
-- WHY APPEND-ONLY: if recall history could be edited, a student could quietly
-- delete their own failures and make the forgetting curve report they are
-- ready when they are not. RLS below grants SELECT and INSERT only - with no
-- UPDATE or DELETE policy, both are denied by Postgres by default.
create table if not exists public.memory_reviews (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references auth.users (id) on delete cascade,
  topic_id           uuid not null references public.topics (id) on delete cascade,
  reviewed_at        timestamptz not null default now(),
  confidence_after   smallint not null check (confidence_after between 0 and 100),
  -- NULL means active recall was not attempted.
  recalled_correctly boolean,
  -- Different methods yield different retention, so the method is recorded.
  review_type        text not null default 'active_recall'
                     check (review_type in ('active_recall', 'passive_re-read', 'mock_exam')),
  note               text check (note is null or length(note) <= 500),
  created_at         timestamptz not null default now()
);

comment on table public.memory_reviews is
  'Append-only recall history. No UPDATE/DELETE policy exists by design.';

-- ============================================================================
-- 14. INDEXES
-- ============================================================================
-- Every index below serves a specific known query. Nothing here is
-- speculative: adding indexes "just in case" slows every write, so each one
-- must earn its place.
-- ============================================================================

-- subjects: list, plus the active-only filter the dashboard uses constantly.
create index if not exists subjects_user_id_idx
  on public.subjects (user_id);
create index if not exists subjects_user_active_idx
  on public.subjects (user_id) where archived_at is null;

-- topics: the scheduler's hot path is "what still needs first-time study",
-- and Memory Radar orders by lowest confidence.
create index if not exists topics_user_id_idx
  on public.topics (user_id);
create index if not exists topics_subject_id_idx
  on public.topics (subject_id);
create index if not exists topics_pending_idx
  on public.topics (user_id, difficulty, estimated_minutes)
  where is_new = true;
create index if not exists topics_at_risk_idx
  on public.topics (user_id, confidence, last_reviewed_at);

-- exams: upcoming-exams list and per-subject lookup.
create index if not exists exams_user_id_idx
  on public.exams (user_id);
create index if not exists exams_subject_id_idx
  on public.exams (subject_id);
create index if not exists exams_date_idx
  on public.exams (user_id, exam_date);

-- study_preferences: availability lookup by weekday.
create index if not exists study_preferences_user_day_idx
  on public.study_preferences (user_id, day_of_week);
create index if not exists study_preferences_active_idx
  on public.study_preferences (user_id) where is_active;

-- daily_energy: the energy trend chart.
create index if not exists daily_energy_user_date_idx
  on public.daily_energy (user_id, log_date desc);

-- study_plans: exactly ONE active plan per user. A partial unique index
-- enforces this in the DATABASE, so a concurrent second attempt fails loudly
-- instead of silently producing two active plans.
create unique index if not exists study_plans_one_active_per_user
  on public.study_plans (user_id) where is_active = true;

-- study_sessions: the dashboard's main query (sessions in a date range).
create index if not exists study_sessions_user_time_idx
  on public.study_sessions (user_id, scheduled_start);
-- Plan Rescue scans exactly these rows to find missed work.
create index if not exists study_sessions_pending_idx
  on public.study_sessions (user_id, scheduled_start)
  where status in ('planned', 'skipped');
create index if not exists study_sessions_topic_id_idx
  on public.study_sessions (topic_id);
create index if not exists study_sessions_plan_id_idx
  on public.study_sessions (plan_id);

-- memory_reviews: a topic's history in order, plus the activity feed.
create index if not exists memory_reviews_topic_time_idx
  on public.memory_reviews (topic_id, reviewed_at desc);
create index if not exists memory_reviews_user_time_idx
  on public.memory_reviews (user_id, reviewed_at desc);

-- achievements: badge display.
create index if not exists achievements_user_earned_idx
  on public.achievements (user_id, earned_at desc);


-- ============================================================================
-- 15. ROW LEVEL SECURITY - ENABLE
-- ============================================================================
-- This is the single most important section in the file.
--
-- Until a table has RLS ENABLED, the anon key can read and write every row in
-- it. Enabling RLS is what makes the policies in section 16 take effect.
--
-- Every table must appear here. A table that is easy to forget is exactly the
-- kind of thing that leaks.
alter table public.profiles            enable row level security;
alter table public.subjects            enable row level security;
alter table public.topics              enable row level security;
alter table public.exams               enable row level security;
alter table public.study_sessions      enable row level security;
alter table public.study_preferences   enable row level security;
alter table public.memory_reviews      enable row level security;
alter table public.daily_energy        enable row level security;
alter table public.achievements        enable row level security;
alter table public.study_plans         enable row level security;

-- ============================================================================
-- 16. ROW LEVEL SECURITY - POLICIES
-- ============================================================================
--
-- HOW THIS WORKS
--   auth.uid() returns the caller's uuid, derived by Supabase from the
--   VERIFIED session token. A client cannot forge it. With no valid session it
--   returns NULL, and "auth.uid() = user_id" is then false - so an anonymous
--   visitor matches ZERO rows.
--
--   USING      -> who may read / update / delete EXISTING rows.
--   WITH CHECK -> what a row may CONTAIN on insert or update.
--
--   Both are required. Omitting WITH CHECK is a classic privilege-escalation
--   bug: a student could INSERT a row belonging to someone else.
--
-- THREE SHAPES ARE USED
--   A. full ownership - subjects, topics, exams, study_preferences,
--      daily_energy, study_plans, study_sessions
--   B. append-only    - memory_reviews (no update/delete policy at all)
--   C. read-only      - achievements (no insert policy at all)
-- ============================================================================

-- ---- 16.1 profiles -------------------------------------------------------
-- Different shape: the primary key IS the user id, so the check is id = uid().
-- There is deliberately NO INSERT policy - profiles are created by the signup
-- trigger. Allowing inserts would let a student fabricate rows for others.
drop policy if exists "Users read own profile" on public.profiles;
create policy "Users read own profile"
  on public.profiles for select
  using (auth.uid() = id);

drop policy if exists "Users update own profile" on public.profiles;
create policy "Users update own profile"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- ---- 16.2 subjects -------------------------------------------------------
drop policy if exists "Users manage own subjects" on public.subjects;
create policy "Users manage own subjects"
  on public.subjects for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ---- 16.3 topics ---------------------------------------------------------
drop policy if exists "Users manage own topics" on public.topics;
create policy "Users manage own topics"
  on public.topics for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ---- 16.4 exams ----------------------------------------------------------
drop policy if exists "Users manage own exams" on public.exams;
create policy "Users manage own exams"
  on public.exams for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ---- 16.5 study_preferences ----------------------------------------------
drop policy if exists "Users manage own preferences" on public.study_preferences;
create policy "Users manage own preferences"
  on public.study_preferences for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ---- 16.6 daily_energy ---------------------------------------------------
drop policy if exists "Users manage own daily energy" on public.daily_energy;
create policy "Users manage own daily energy"
  on public.daily_energy for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ---- 16.7 study_plans ----------------------------------------------------
drop policy if exists "Users manage own plans" on public.study_plans;
create policy "Users manage own plans"
  on public.study_plans for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ---- 16.8 study_sessions -------------------------------------------------
drop policy if exists "Users manage own sessions" on public.study_sessions;
create policy "Users manage own sessions"
  on public.study_sessions for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ---- 16.9 memory_reviews - APPEND-ONLY ------------------------------------
-- SELECT and INSERT only. With NO update policy and NO delete policy, Postgres
-- denies both by default. That is exactly what we want: recall history is
-- evidence, and evidence must not be editable by the student being assessed.
drop policy if exists "Users read own reviews" on public.memory_reviews;
create policy "Users read own reviews"
  on public.memory_reviews for select
  using (auth.uid() = user_id);

drop policy if exists "Users add own reviews" on public.memory_reviews;
create policy "Users add own reviews"
  on public.memory_reviews for insert
  with check (auth.uid() = user_id);

-- NO update policy. NO delete policy. Intentional.

-- ---- 16.10 achievements - READ-ONLY ---------------------------------------
-- SELECT only. With no INSERT policy, a client cannot grant itself a badge;
-- only server-side code can award achievements. Without this, a single insert
-- call would hand every student every achievement.
drop policy if exists "Users read own achievements" on public.achievements;
create policy "Users read own achievements"
  on public.achievements for select
  using (auth.uid() = user_id);

-- NO insert / update / delete policy. Intentional.

-- ============================================================================
-- 17. VERIFICATION QUERIES
-- ============================================================================
-- Read-only. Run these after applying this file to confirm the schema is
-- correct. They change nothing.
-- ============================================================================

-- ---- 17.1 Confirm every table exists and has RLS enabled --------------------
-- EXPECTED: all 10 tables, every rowsecurity = true, policies > 0.
-- memory_reviews has 2 policies and achievements has 1 - that is CORRECT, they
-- are intentionally narrower than the rest.
--
--   select tablename, rowsecurity, count(p.policyname) as policies
--   from pg_tables t
--   left join pg_policies p on p.tablename = t.tablename
--   where t.schemaname = 'public'
--   group by tablename, rowsecurity
--   order by tablename;

-- ---- 17.2 Confirm no table lacks RLS (the critical check) -------------------
-- EXPECTED: ZERO rows. Any row here means a table is unprotected and leaks.
--
--   select tablename
--   from pg_tables
--   where schemaname = 'public'
--     and rowsecurity = false;

-- ---- 17.3 Confirm no password or secret column exists anywhere -------------
-- EXPECTED: ZERO rows. Credentials belong to Supabase Auth, not to us.
--
--   select table_name, column_name
--   from information_schema.columns
--   where table_schema = 'public'
--     and (column_name like '%password%'
--          or column_name like '%passwd%'
--          or column_name like '%secret%'
--          or column_name like '%token%');

-- ---- 17.4 Confirm foreign keys cascade as designed -------------------------
-- EXPECTED: every child FK to auth.users / subjects / topics on delete
-- CASCADE, and study_sessions.rescued_from_id on delete SET NULL.
--
--   select tc.table_name, kcu.column_name,
--          ccu.table_name as references_table, rc.delete_rule
--   from information_schema.table_constraints tc
--   join information_schema.key_column_usage kcu
--     on tc.constraint_name = kcu.constraint_name
--   join information_schema.constraint_column_usage ccu
--     on ccu.constraint_name = tc.constraint_name
--   join information_schema.referential_constraints rc
--     on rc.constraint_name = tc.constraint_name
--   where tc.constraint_type = 'FOREIGN KEY'
--     and tc.table_schema = 'public'
--   order by tc.table_name;

-- ---- 17.5 Confirm indexes exist --------------------------------------------
--   select tablename, indexname
--   from pg_indexes
--   where schemaname = 'public'
--   order by tablename, indexname;

-- ---- 17.6 Confirm the signup trigger exists --------------------------------
-- EXPECTED: rows for on_auth_user_created and handle_new_user.
--
--   select tgname, tgrelid::regclass as on_table
--   from pg_trigger
--   where not tgisinternal
--   order by tgname;


-- ============================================================================
-- 18. THE ISOLATION TEST - THE ONE THAT ACTUALLY PROVES IT WORKS
-- ============================================================================
-- Structure can look correct and still leak. This is the real proof.
--
--   1. Sign up as User A (the browser). Add one subject.
--   2. Open the SQL Editor and note that subject's id.
--   3. Sign up as User B in a private/incognito window.
--   4. As User B, try to READ User A's subject by that id.
--        EXPECTED: zero rows, or a permission error.  <-- CORRECT BEHAVIOUR
--   5. As User B, try to UPDATE or DELETE it.
--        EXPECTED: zero rows affected.              <-- CORRECT BEHAVIOUR
--   6. Sign back in as User A and confirm the subject is untouched.
--
-- If step 4 returns User A's data, STOP. RLS is not working and no feature
-- work should begin until it is fixed.
-- ============================================================================


-- ============================================================================
-- 19. HOW TO UNDO
-- ============================================================================
-- There is deliberately NO automated down-migration. "drop table" destroys
-- student data, and that must never happen automatically.
--
-- To reset a database that has no real data yet, run these in this order:
--
--   drop table if exists public.memory_reviews    cascade;
--   drop table if exists public.study_sessions    cascade;
--   drop table if exists public.study_plans       cascade;
--   drop table if exists public.achievements      cascade;
--   drop table if exists public.daily_energy      cascade;
--   drop table if exists public.study_preferences cascade;
--   drop table if exists public.topics            cascade;
--   drop table if exists public.exams             cascade;
--   drop table if exists public.subjects          cascade;
--   drop table if exists public.profiles          cascade;
--   drop trigger if exists on_auth_user_created on auth.users;
--
-- Once real student data exists, the correct rollback is a Supabase
-- point-in-time restore - not a drop.
-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
