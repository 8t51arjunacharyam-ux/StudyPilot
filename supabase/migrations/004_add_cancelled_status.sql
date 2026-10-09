-- ============================================================================
-- StudyPilot — 004 add cancelled session status
-- ============================================================================
--
-- The product requirements specify a "cancelled" status distinct from "skipped".
-- cancelled = student explicitly cancelled before the session
-- skipped = student chose not to do it when it was due
-- Re-running is safe: every statement uses "if not exists" or "drop if exists".
-- ============================================================================

-- Allow sessions to be cancelled.
alter table public.study_sessions
  drop constraint if exists study_sessions_status_check;

alter table public.study_sessions
  add constraint study_sessions_status_check
  check (status in ('planned', 'in_progress', 'completed', 'skipped', 'rescheduled', 'cancelled'));

comment on constraint study_sessions_status_check on public.study_sessions is
  'Valid session lifecycle states. cancelled lets a student explicitly cancel a session before it starts.';