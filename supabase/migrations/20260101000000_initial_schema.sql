-- ============================================================================
-- StudyPilot — initial schema
-- ============================================================================
-- Applied once, manually, via the Supabase dashboard SQL Editor.
--
-- HOW TO APPLY
--   1. Open your project at supabase.com
--   2. Click "SQL Editor" in the sidebar -> "New query"
--   3. Paste this entire file
--   4. Click "Run"
--
-- Every object uses "if not exists" / "on conflict" guards, so re-running the
-- whole file is safe.
--
-- THE MOST IMPORTANT SECTION IS 10 (ROW LEVEL SECURITY) AT THE BOTTOM.
-- Read that before anything else.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 1. PROFILES
-- ----------------------------------------------------------------------------
-- One row per student, created automatically the moment someone signs up.
-- Every other table stores a `user_id` pointing at auth.users(id); that single
-- column is what lets us guarantee a student only ever sees their own data.
create table if not exists public.profiles (
  id                        uuid primary key references auth.users (id) on delete cascade,
  email                     text,
  full_name                 text,
  timezone                  text not null default 'UTC',
  onboarding_completed      boolean not null default false,
  daily_study_goal_minutes  integer not null default 120
    check (daily_study_goal_minutes between 0 and 1440),
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now()
);

comment on table public.profiles is
  'One row per student. Auto-created by trigger on signup.';


-- ----------------------------------------------------------------------------
-- 2. Auto-create a profile whenever a new auth user is created
-- ----------------------------------------------------------------------------
-- SECURITY DEFINER allows this trigger to insert into profiles even though the
-- brand-new user cannot yet insert there themselves. It writes exactly one row
-- using only the id and email from the auth row — never user input — so it is
-- not an escalation vector.
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


-- ----------------------------------------------------------------------------
-- 3. Updated-at maintenance helper
-- ----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;


-- ----------------------------------------------------------------------------
-- 4. SUBJECTS
-- ----------------------------------------------------------------------------
create table if not exists public.subjects (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  name       text not null check (length(trim(name)) between 1 and 120),
  color      text not null default '#4f46e5',
  -- 1 = easiest, 5 = hardest. Feeds the scheduler and Difficulty Debt.
  difficulty smallint not null default 3 check (difficulty between 1 and 5),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists subjects_user_id_idx on public.subjects (user_id);

drop trigger if exists subjects_set_updated_at on public.subjects;
create trigger subjects_set_updated_at
  before update on public.subjects
  for each row execute function public.set_updated_at();


-- ----------------------------------------------------------------------------
-- 5. EXAMS
-- ----------------------------------------------------------------------------
create table if not exists public.exams (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  subject_id uuid not null references public.subjects (id) on delete cascade,
  title      text not null check (length(trim(title)) between 1 and 160),
  exam_date  timestamptz not null,
  -- 1 = minor, 5 = the most important exam on the timetable.
  importance smallint not null default 3 check (importance between 1 and 5),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists exams_user_id_idx on public.exams (user_id);
create index if not exists exams_date_idx on public.exams (exam_date);

drop trigger if exists exams_set_updated_at on public.exams;
create trigger exams_set_updated_at
  before update on public.exams


-- ----------------------------------------------------------------------------
-- 6. TOPICS  <- the atom of the entire scheduling system
-- ----------------------------------------------------------------------------
-- Everything placed into the calendar is a topic. This is the table that
-- Difficulty Debt and Memory Radar reason about.
create table if not exists public.topics (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references auth.users (id) on delete cascade,
  subject_id          uuid not null references public.subjects (id) on delete cascade,
  name                text not null check (length(trim(name)) between 1 and 160),

  -- How long one focused session on this topic should take.
  estimated_minutes   integer not null default 45
    check (estimated_minutes between 5 and 480),

  difficulty          smallint not null default 3 check (difficulty between 1 and 5),

  -- CURRENT belief about how well this is known. 0 = forgotten, 100 = solid.
  -- The HISTORY of that belief lives in topic_reviews below. Keeping both lets
  -- us show a trend line without rewriting this row on every review.
  confidence          smallint not null default 50
    check (confidence between 0 and 100),

  last_reviewed_at    timestamptz,

  -- Set once Memory Radar decides this topic needs active recall.
  needs_active_recall boolean not null default false,

  -- TRUE while the topic still needs first-time study (vs. review only).
  is_new              boolean not null default true,

  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index if not exists topics_user_id_idx on public.topics (user_id);
create index if not exists topics_subject_id_idx on public.topics (subject_id);
-- Partial index: makes "which topics still need first-time study" fast.
create index if not exists topics_pending_idx on public.topics (user_id, is_new)
  where is_new = true;

drop trigger if exists topics_set_updated_at on public.topics;
create trigger topics_set_updated_at
  before update on public.topics
  for each row execute function public.set_updated_at();


-- ----------------------------------------------------------------------------
-- 7. AVAILABILITY WINDOWS  (when the student is actually free)
-- ----------------------------------------------------------------------------
-- Recurring weekly blocks, e.g. "Monday 18:00-21:00".
create table if not exists public.availability_windows (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  -- 0 = Sunday ... 6 = Saturday (matches JavaScript Date.getDay()).
  day_of_week smallint not null check (day_of_week between 0 and 6),
  start_time  time not null,
  end_time    time not null,
  created_at  timestamptz not null default now(),

  -- Without this, a 22:00-06:00 window could be saved by mistake.
  constraint valid_time_range check (end_time > start_time)
);

create index if not exists availability_user_id_idx
  on public.availability_windows (user_id, day_of_week);


-- ----------------------------------------------------------------------------
-- 8. ENERGY PREFERENCES  (BrainFit: focus quality by time of day)
-- ----------------------------------------------------------------------------
create table if not exists public.energy_preferences (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users (id) on delete cascade,
  -- e.g. 'morning', 'afternoon', 'evening'
  time_block   text not null check (length(trim(time_block)) between 1 and 40),
  -- 1 = exhausted, 5 = peak focus. Hard topics get placed in high values.
  energy_level smallint not null check (energy_level between 1 and 5),
  created_at   timestamptz not null default now(),

  -- One row per time block per student.
  constraint unique_time_block unique (user_id, time_block)


-- ----------------------------------------------------------------------------
-- 9. STUDY PLANS, SESSIONS, REVIEWS
-- ----------------------------------------------------------------------------

-- Plans are VERSIONED, never overwritten. When Plan Rescue runs it deactivates
-- the old plan and inserts a new one. That preserves an audit trail ("what did
-- the plan look like before I missed three days?") and makes the scheduling
-- algorithm debuggable after the fact.
create table if not exists public.study_plans (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references auth.users (id) on delete cascade,
  name               text not null check (length(trim(name)) between 1 and 120),

  -- Exactly one active plan per student; enforced by a partial unique index
  -- (see below) rather than application code, which could be forgotten.
  is_active          boolean not null default true,

  generated_at       timestamptz not null default now(),

  -- Why this version exists: 'initial', 'plan_rescue', 'manual_regenerate'.
  -- Makes the history of the plan self-explanatory.
  generation_reason  text not null default 'initial'
    check (generation_reason in ('initial', 'plan_rescue', 'manual_regenerate')),

  created_at         timestamptz not null default now()
);

-- Only one plan may be active for a given user at a time.
create unique index if not exists study_plans_one_active_per_user
  on public.study_plans (user_id) where is_active = true;

create index if not exists study_plans_user_id_idx on public.study_plans (user_id);


-- The concrete scheduled work units. This is what the dashboard lists.
create table if not exists public.study_sessions (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users (id) on delete cascade,
  plan_id          uuid references public.study_plans (id) on delete cascade,
  topic_id         uuid not null references public.topics (id) on delete cascade,

  scheduled_start  timestamptz not null,
  scheduled_end    timestamptz not null,
  planned_minutes  integer not null check (planned_minutes between 0 and 1440),

  -- Minutes actually studied. NULL until the student completes a session.
  actual_minutes   integer check (actual_minutes is null or actual_minutes between 0 and 1440),

  status           text not null default 'planned'
    check (status in ('planned', 'completed', 'skipped', 'rescheduled')),

  -- 'peak' | 'steady' | 'light' — how well this session matches the student's
  -- energy at that hour. Written by the scheduler, displayed by the UI.
  energy_match     text check (energy_match in ('peak', 'steady', 'light')),

  completed_at     timestamptz,

  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),

  -- A session cannot end before it starts.
  constraint valid_session_range check (scheduled_end > scheduled_start)
);

-- The dashboard's main query: "my sessions in this date range".
create index if not exists sessions_user_time_idx
  on public.study_sessions (user_id, scheduled_start);
-- Used by Plan Rescue to find everything not yet completed.
create index if not exists sessions_pending_idx
  on public.study_sessions (user_id, status)
  where status in ('planned', 'skipped');

drop trigger if exists sessions_set_updated_at on public.study_sessions;
create trigger sessions_set_updated_at
  before update on public.study_sessions
  for each row execute function public.set_updated_at();


-- APPEND-ONLY review history. Rows are never updated or deleted, because this
-- table is the raw evidence Memory Radar learns from — editing it would
-- corrupt the forgetting-curve calculation.
create table if not exists public.topic_reviews (
  id                  uuid primary key default gen_random_uuid(),


-- ============================================================================
-- 10. ROW LEVEL SECURITY  --  THE MOST IMPORTANT SECTION IN THIS FILE
-- ============================================================================
--
-- Every policy below says: "you may only touch rows whose user_id equals YOUR
-- authenticated id". This is enforced BY THE DATABASE, not by our code.
--
-- That distinction is the whole point. If ownership were checked only in
-- application code, a single forgotten `if` — one bad query, one refactor, a
-- bug written at 2am — would leak another student's data. Policies like these
-- cannot be forgotten: they apply to every query, forever, including code
-- that does not exist yet.
--
-- HOW TO PROVE IT WORKS (do this after applying the file):
--   1. Sign up as User A and add a subject.
--   2. Copy that subject's id from the SQL editor.
--   3. Sign up as User B in a private window; try to read or write it.
--   4. You get zero rows back, or a permission error. THAT IS CORRECT.
--
-- USING      -> who may READ / UPDATE / DELETE existing rows.
-- WITH CHECK -> what a row may CONTAIN on INSERT or UPDATE.
--
-- Omitting `with check` is a classic privilege-escalation bug: a student
-- could INSERT a row belonging to someone else. We set both.
-- ============================================================================

-- Enable RLS on EVERY table. Until this runs, the table is unprotected.
alter table public.profiles            enable row level security;
alter table public.subjects            enable row level security;
alter table public.exams               enable row level security;
alter table public.topics              enable row level security;
alter table public.availability_windows enable row level security;
alter table public.energy_preferences  enable row level security;


-- ----------------------------------------------------------------------------
-- 11. Policies
-- ----------------------------------------------------------------------------
-- The identical ownership pattern per table, written out explicitly rather
-- than generated in a loop: a readable security file matters more than
-- brevity, because you can then audit every table at a glance.

-- profiles: the id IS the user id, so the check differs slightly.
drop policy if exists "Users can view own profile" on public.profiles;
create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

drop policy if exists "Users manage own subjects" on public.subjects;
create policy "Users manage own subjects"
  on public.subjects for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users manage own exams" on public.exams;
create policy "Users manage own exams"
  on public.exams for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users manage own topics" on public.topics;
create policy "Users manage own topics"
  on public.topics for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users manage own availability" on public.availability_windows;
create policy "Users manage own availability"
  on public.availability_windows for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users manage own energy preferences" on public.energy_preferences;
create policy "Users manage own energy preferences"
  on public.energy_preferences for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users manage own plans" on public.study_plans;
create policy "Users manage own plans"
  on public.study_plans for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users manage own sessions" on public.study_sessions;
create policy "Users manage own sessions"
  on public.study_sessions for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Reviews are append-only: students may add and read their own, but never
-- edit or delete history (that would corrupt Memory Radar's data).
drop policy if exists "Users read own reviews" on public.topic_reviews;
create policy "Users read own reviews"
  on public.topic_reviews for select
  using (auth.uid() = user_id);

drop policy if exists "Users add own reviews" on public.topic_reviews;
create policy "Users add own reviews"
  on public.topic_reviews for insert
  with check (auth.uid() = user_id);

-- No UPDATE or DELETE policy for topic_reviews, on purpose. Without a policy
-- those operations are denied by default — exactly right for an audit log.


-- ----------------------------------------------------------------------------
-- 12. VERIFICATION HELPER (optional)
-- ----------------------------------------------------------------------------
-- Run this after applying the file. Every table should show rowsecurity = true
-- and a policy count > 0. A count of 0 on any table other than topic_reviews
-- (intentionally select + insert only) means something was missed.
--
--   select tablename, rowsecurity, count(p.policyname) as policies
--   from pg_tables t
--   left join pg_policies p on p.tablename = t.tablename
--   where t.schemaname = 'public'
--   group by tablename, rowsecurity
--   order by tablename;
--
-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
alter table public.study_plans         enable row level security;
alter table public.study_sessions      enable row level security;
alter table public.topic_reviews       enable row level security;
  user_id             uuid not null references auth.users (id) on delete cascade,
  topic_id            uuid not null references public.topics (id) on delete cascade,

  reviewed_at         timestamptz not null default now(),
  -- Confidence AFTER this review, 0-100.
  confidence_after    smallint not null check (confidence_after between 0 and 100),
  -- Did active recall actually work? Feeds the memory model's accuracy.
  recalled_correctly  boolean,
  -- Free-text note on what was forgotten, for the student to review later.
  note                text,

  created_at          timestamptz not null default now()
);

create index if not exists reviews_topic_time_idx
  on public.topic_reviews (topic_id, reviewed_at desc);
create index if not exists reviews_user_id_idx on public.topic_reviews (user_id);
);

create index if not exists energy_user_id_idx on public.energy_preferences (user_id);
  for each row execute function public.set_updated_at();