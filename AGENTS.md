# StudyPilot — Agent Instructions

This file persists project-specific guidance for future Claude Code sessions on StudyPilot.

## Project
- Full-stack adaptive study planner: StudyPilot
- Stack: Next.js 16.3.8 (App Router) · React 19 · TypeScript strict · Tailwind CSS v4 · Supabase (Postgres + Auth) · OpenAI (optional, server-side only) · Vercel
- Design: Premium, restrained, productive aesthetic — no generic gradient splash, no emoji overload. Deep charcoal text, warm off-white bg, indigo/teal accents, accessible green/amber/red, soft neutral borders.
- Target: College/university students, competitive exam prep, students who miss sessions and need adaptive recovery.

## Critical Rules
- Never hardcode secrets or expose Supabase service_role / OPENAI_API_KEY to client code.
- Never claim tests passed if not actually run (`npm run test:run`, `npm run build`, `npm run lint`).
- Never invent database connections; check `.env.local` and verify Supabase is reachable before assuming integration works.
- Never replace failed functionality with fake/mock data — fix the root cause.
- Preserve existing working config (`postcss.config.mjs`, `tailwindcss` v4, `next.config.ts`). Read docs in `node_modules/next/dist/docs/` before changing Next.js APIs.
- Maintain `docs/PROJECT_PLAN.md`, `docs/ARCHITECTURE.md`, `docs/DATABASE_DESIGN.md`, `docs/PRODUCTION_READINESS.md`. Update after every phase.

## Design System (persistent)
- Font: System sans-serif (Inter-like via Tailwind); avoid loading custom web fonts unless reliable.
- Spacing: consistent scale (4, 8, 12, 16, 24, 32, 48, 64, 96).
- Components to reuse: Button, Card, Badge, Progress, Tabs, Modal, Tooltip, Toast, EmptyState, Skeleton, DateInput, SubjectCard, ExamCard, SessionCard, RecommendationCard.
- Icons: `lucide-react` only; emoji sparingly.

## Five Signature Features (must stay intact)
1. Plan Rescue — deterministic scheduling algorithm (not LLM), detects missed workload, redistributes over future slots, respects daily limits and exam urgency, requires user confirmation.
2. BrainFit Scheduler — schedules by energy profile (high/medium/low) + available slots + daily limits + difficulty. Reusable, testable module.
3. Memory Radar — spaced repetition heuristic (confidence 1-5, elapsed time, previous recall, difficulty). `/memory` page.
4. Difficulty Debt — transparent prioritization score based on exam proximity, remaining workload, difficulty, confidence, recent activity. Unit-tested.
5. Study Now — calculates next session from real user data (urgency, workload, difficulty, confidence, time since review, available time, energy). Not random.

## Database (Supabase PostgreSQL)
- Tables: profiles, subjects, topics, exams, study_preferences, study_availability, study_sessions, memory_reviews, topic_progress, daily_energy, plan_changes, achievements, quiz_attempts.
- RLS: Every user-owned table must have row-level security policies enforcing ownership by `auth.uid()`.
- Migrations in `supabase/migrations/`.
- Never use service_role key for routine user-facing queries.

## Authentication
- Supabase Auth (email/password) with protected routes.
- Routes protected server-side (middleware + route-level checks), not just by hidden nav links.
- Implement: login, register, forgot-password, logout, session refresh, callback routes.

## Onboarding (7 steps)
1. Profile (display name, goal) · 2. Subjects · 3. Topics · 4. Exams · 5. Availability · 6. Energy profile · 7. Confirmation + create plan. Persist to Supabase; allow back-navigation; prevent duplicate submissions.

## Testing Requirements
- Unit tests for algorithms (Plan Rescue scheduling, Difficulty Debt score, BrainFit scheduling, Memory Radar heuristic, Study Now recommendation).
- Integration tests for critical user journeys (auth, onboarding, session start/complete, plan rescue proposal/accept/reject, memory review).
- Always run `npm run typecheck`, `npm run lint`, `npm run test:run` before considering a phase complete.
- Report PASS / FAIL / WARNING / NOT TESTED for each area.

## Security / Privacy
- Validate all user input server-side.
- Enforce ownership checks on every sensitive operation.
- No secrets in `.env` committed; `.env.local` stays out of Git (`.gitignore` verified).
- AI requests server-side only; handle missing `OPENAI_API_KEY` gracefully (rest of app works without it).

## Documentation (update continuously)
- `docs/PROJECT_PLAN.md` — current phase, completed work, remaining issues, next phase.
- `docs/ARCHITECTURE.md` — actual architecture (not initial proposal).
- `docs/DATABASE_DESIGN.md` — tables, relationships, policies.
- `docs/PRODUCTION_READINESS.md` — verification results (build, security, accessibility, responsive audit).
- `README.md` — overview, install, env setup, migrations, auth, AI config, testing, build, deployment.

## Routes (authenticated must enforce auth)
Public: `/`, `/login`, `/register`, `/forgot-password`, `/auth/callback`
Authenticated: `/dashboard`, `/onboarding`, `/today`, `/subjects`, `/subjects/[subjectId]`, `/planner`, `/exams`, `/memory`, `/plan-rescue`, `/analytics`, `/achievements`, `/settings`, `/assistant`

## Deployment Target
- Vercel; production build must succeed (`npm run build`).
- Document environment variables needed; prepare manual deployment steps if credentials missing.
- Verify live site only after deployment URL confirmed; do not claim live before verification.

## Phase Sequence (follow order; don't skip)
1 Inspect/repo · 2 Design system + landing/dashboard/auth screens · 3 DB design + migrations + RLS · 4 Auth + protected routes · 5 Onboarding + preferences · 6 Subjects/topics/exams · 7 Planner + sessions · 8 Study Now · 9 Difficulty Debt · 10 BrainFit · 11 Memory Radar · 12 Plan Rescue · 13 Analytics + achievements · 14 Settings · 15 AI Assistant · 16 Quiz Generator · 17 Syllabus Analyzer · 18 Integration/security/accessibility/responsive audit · 19 Documentation + production build verification · 20 Deploy (only when authorized + credentials ready)

After every phase: summarize, list changed files, run checks, fix failures, document external blockers, update docs, proceed when safe.
