-- ============================================================================
-- StudyPilot â€” 002 add in_progress session status
-- ============================================================================
--
-- The initial schema constrained study_sessions.status to planned/completed/
-- skipped/rescheduled. The product needs a distinct "in_progress" state so a
-- student can start a session, have it persist across reloads, and complete it
-- later.
--
-- Re-running is safe: every statement uses "if not exists" or "drop if exists".
-- ============================================================================

-- Allow sessions to be actively in progress.
alter table public.study_sessions
  drop constraint if exists study_sessions_status_check;

alter table public.study_sessions
  add constraint study_sessions_status_check
  check (status in ('planned', 'in_progress', 'completed', 'skipped', 'rescheduled'));

comment on constraint study_sessions_status_check on public.study_sessions is
  'Valid session lifecycle states. in_progress lets a student start a session and complete it later.';
