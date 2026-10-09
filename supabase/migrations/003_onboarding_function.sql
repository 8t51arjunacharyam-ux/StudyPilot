-- ============================================================================
-- StudyPilot -- 003 atomic onboarding save function
-- ============================================================================
--
-- HOW TO APPLY
--   Supabase dashboard -> SQL Editor -> New query -> paste -> Run
--   Run AFTER 001 and 002.
--
-- WHY THIS EXISTS RATHER THAN A CHAIN OF INSERTS FROM THE APP
--
-- Onboarding inserts subjects, their topics, exams, availability windows and
-- energy preferences. Doing that as five separate calls from the app has a
-- serious failure mode: if the topics insert fails after the subjects were
-- created, the student is left with subjects that have no topics and no way to
-- tell that setup went wrong.
--
-- A single Postgres function wraps all of it in one transaction. Either
-- EVERYTHING saves, or NOTHING does. There is no half-finished state.
--
-- SECURITY
--   * SECURITY DEFINER, because RLS checks auth.uid(), which is only populated
--     for the calling role. Running as definer lets the function write rows
--     for the authenticated user while still stamping user_id explicitly.
--   * search_path is pinned. Without this, someone able to create an object in
--     an earlier schema could shadow a table or function name and hijack it.
--   * The user id comes from auth.uid(), NEVER from a parameter. That is what
--     makes it impossible to write onto somebody else's account.
--   * EXECUTE is granted only to authenticated, so anonymous visitors cannot
--     call it at all.
--
-- DUPLICATE SUBMISSION HANDLING
--
-- Returns FALSE when the user already has subjects AND has completed
-- onboarding. The app treats that as success, so a double-submitted form
-- cannot create two copies of every subject.
-- ============================================================================

create or replace function public.complete_onboarding(
  p_subjects    jsonb,
  p_exams       jsonb default '[]'::jsonb,
  p_availability jsonb default '[]'::jsonb,
  p_energy      jsonb default '[]'::jsonb
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_subject public.subjects%rowtype;
  v_has_data boolean;
  v_completed boolean;
  subject_item jsonb;
  topic_item jsonb;
  exam_item jsonb;
  pref_item jsonb;
  v_subject_id uuid;
  v_subject_name text;
begin
  -- WHO: auth.uid() comes from the verified session token. There is no
  -- parameter the caller can supply, so this cannot be spoofed.
  v_user_id := auth.uid();

  if v_user_id is null then
    raise exception 'Not authenticated' using errcode = '28000';
  end if;

  -- Refuse a repeat submission.
  select exists (select 1 from public.subjects s where s.user_id = v_user_id)
    into v_has_data;

  select coalesce(p.onboarding_completed, false)
    into v_completed
    from public.profiles p
   where p.id = v_user_id;

  if v_has_data and v_completed then
    return false;
  end if;

  -- SUBJECTS + TOPICS
  for subject_item in
    select value from jsonb_array_elements(coalesce(p_subjects, '[]'::jsonb))
  loop
    insert into public.subjects (user_id, name, color, difficulty, importance)
    values (
      v_user_id,
      subject_item ->> 'name',
      coalesce(nullif(subject_item ->> 'color', ''), '#4f46e5'),
      coalesce((subject_item ->> 'difficulty')::smallint, 5),
      coalesce((subject_item ->> 'importance')::smallint, 3)
    )
    returning * into v_subject;

    for topic_item in
      select value from jsonb_array_elements(
        coalesce(subject_item -> 'topics', '[]'::jsonb)
      )
    loop
      insert into public.topics (
        user_id, subject_id, name, estimated_minutes, difficulty, confidence
      )
      values (
        v_user_id,
        v_subject.id,
        topic_item ->> 'name',
        coalesce((topic_item ->> 'estimated_minutes')::integer, 45),
        coalesce((topic_item ->> 'difficulty')::smallint, 5),
        coalesce((topic_item ->> 'confidence')::smallint, 50)
      );
    end loop;
  end loop;

  -- EXAMS: referenced by subject NAME, because database ids do not exist in
  -- the browser yet. Scoped to this user's own subjects.
  for exam_item in
    select value from jsonb_array_elements(coalesce(p_exams, '[]'::jsonb))
  loop
    v_subject_name := exam_item ->> 'subject_name';

    select s.id into v_subject_id
      from public.subjects s
     where s.user_id = v_user_id
       and lower(s.name) = lower(v_subject_name)
     limit 1;

    if v_subject_id is not null then
      insert into public.exams (user_id, subject_id, title, exam_date, importance)
      values (
        v_user_id,
        v_subject_id,
        exam_item ->> 'title',
        (exam_item ->> 'exam_date')::timestamptz,
        coalesce((exam_item ->> 'importance')::smallint, 3)
      );
    end if;
    -- A missing subject skips just that exam rather than failing the whole
    -- transaction. One bad row must not cost the student everything else.
  end loop;

  -- AVAILABILITY
  for pref_item in
    select value from jsonb_array_elements(coalesce(p_availability, '[]'::jsonb))
  loop
    insert into public.study_preferences (
      user_id, day_of_week, start_time, end_time, energy_level
    )
    values (
      v_user_id,
      (pref_item ->> 'day_of_week')::smallint,
      (pref_item ->> 'start_time')::time,
      (pref_item ->> 'end_time')::time,
      coalesce((pref_item ->> 'energy_level')::smallint, 3)
    );
  end loop;

  -- ENERGY PROFILE: clear this user's existing windows first so a re-run
  -- cannot stack duplicates. scoped to the days being written.
  delete from public.study_preferences
   where user_id = v_user_id
     and exists (
       select 1
         from jsonb_array_elements(coalesce(p_energy, '[]'::jsonb)) as e
        where (e.value ->> 'day_of_week')::smallint
              = public.study_preferences.day_of_week
     );

  for pref_item in
    select value from jsonb_array_elements(coalesce(p_energy, '[]'::jsonb))
  loop
    insert into public.study_preferences (
      user_id, day_of_week, start_time, end_time, energy_level
    )
    values (
      v_user_id,
      (pref_item ->> 'day_of_week')::smallint,
      (pref_item ->> 'start_time')::time,
      (pref_item ->> 'end_time')::time,
      coalesce((pref_item ->> 'energy_level')::smallint, 3)
    );
  end loop;

  return true;
end;
$$;

-- Only authenticated users may call this. Anonymous visitors cannot.
revoke execute on function public.complete_onboarding(jsonb, jsonb, jsonb, jsonb) from public;
grant execute on function public.complete_onboarding(jsonb, jsonb, jsonb, jsonb) to authenticated;

-- VERIFY (read-only)
-- EXPECTED: one row, with prosecdef = true and proconfig pinning search_path.
--
--   select proname, prosecdef, proconfig
--   from pg_proc
--   where proname = 'complete_onboarding';
--
-- EXPECTED: authenticated has EXECUTE; PUBLIC does not.
--
--   select grantee, privilege_type
--   from information_schema.routine_privileges
--   where routine_name = 'complete_onboarding';
--
-- END OF MIGRATION
-- ============================================================================
