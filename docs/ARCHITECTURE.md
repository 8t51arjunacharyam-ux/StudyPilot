# StudyPilot — Architecture

**Status:** Reference architecture for implementation
**Applies to:** Phases 2–20 of [`PROJECT_PLAN.md`](PROJECT_PLAN.md)
**Last updated:** 2026-10-09

---

## 1. Overview

StudyPilot is a full-stack adaptive study planner. It ingests a student's
subjects, topics, exams, availability, and energy profile; records what
they actually study; and continuously recomputes what to do next.

The core of the product is **deterministic planning logic** — not an LLM.
AI (OpenAI) is an optional enhancement layered on top, never the source of
truth for scheduling, scoring, or recommendations.

```
┌──────────────────────────────────────────────────────────────┐
│  Browser (Next.js App Router + React 19 + Tailwind v4)        │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐              │
│  │ Landing    │  │ Auth       │  │ App        │              │
│  │ /          │  │ /login     │  │ /dashboard │              │
│  │            │  │ /register  │  │ /today     │              │
│  │            │  │ /forgot    │  │ /subjects  │              │
│  │            │  │            │  │ /planner   │              │
│  │            │  │            │  │ /exams     │              │
│  │            │  │            │  │ /memory    │              │
│  │            │  │            │  │ /plan-rescue│             │
│  │            │  │            │  │ /analytics │              │
│  │            │  │            │  │ /achievements│            │
│  │            │  │            │  │ /settings  │              │
│  │            │  │            │  │ /assistant │              │
│  └────────────┘  └────────────┘  └────────────┘              │
└──────────────────────────────────────────────────────────────┘
          │                    │                    │
          ▼                    ▼                    ▼
   Server Components    Server Actions     Route Handlers
   (read-only views)    (mutations)        (AI / quiz APIs)
          │                    │                    │
          └────────────────────┼────────────────────┘
                               ▼
                    ┌──────────────────────┐
                    │ Supabase (Postgres)  │
                    │  · profiles          │
                    │  · subjects          │
                    │  · topics            │
                    │  · exams             │
                    │  · study_preferences │
                    │  · study_availability│
                    │  · study_sessions    │
                    │  · memory_reviews    │
                    │  · topic_progress    │
                    │  · daily_energy      │
                    │  · plan_changes      │
                    │  · achievements      │
                    │  · quiz_attempts     │
                    │  RLS on every table  │
                    └──────────────────────┘
                               ▲
                               │ (server-side only, never from browser)
                    ┌──────────────────────┐
                    │ OpenAI API (optional)│
                    │ Assistant, Quiz,     │
                    │ Syllabus Analyzer    │
                    └──────────────────────┘
```

## 2. Layering

```
app/                    Route tree (App Router)
  (marketing)/          Public landing page + auth screens
  (app)/                Authenticated app (layout + protected routes)
  api/                  Route handlers (AI, quiz, callbacks)
components/
  ui/                   Design-system primitives (button, card, modal, …)
  features/             Feature-scoped components (dashboard, planner, …)
lib/
  supabase/             Server + client Supabase clients
  db/                   Data-access layer (typed queries, ownership enforced)
  engine/               Deterministic planning engine (pure, testable)
    study-now.ts        Study Now recommendation
    difficulty-debt.ts  Difficulty Debt prioritization score
    brainfit.ts         Energy-aware scheduling
    memory-radar.ts     Spaced-repetition heuristic
    plan-rescue.ts      Missed-workload redistribution
  ai/                   Server-side OpenAI wrappers (structured output)
hooks/                  Reusable React hooks
supabase/migrations/    Ordered SQL migrations
docs/                   Living documentation
```

### 2.1 Rules of the layers

- **The engine (`lib/engine/`) is pure.** No Supabase, no React, no `Date.now()`
  unless passed in. Every function takes data in, returns data out. This makes
  the five signature features unit-testable in isolation.
- **`lib/db/` is the only place that talks to Supabase** (besides auth helpers).
  Every query is scoped to `auth.uid()`. Components never build SQL.
- **Server Components read; Server Actions mutate.** Mutations go through
  validated input types (zod or hand-rolled parsers) before touching the DB.
- **Route handlers** are reserved for streaming AI responses and the auth
  callback. Everything else is a Server Action.

## 3. The Planning Engine

All five signature features share a common input shape — the "student
context" — so they compose:

```ts
interface StudentContext {
  subjects:    Subject[];
  topics:      Topic[];
  exams:       Exam[];
  sessions:    StudySession[];
  reviews:     MemoryReview[];
  preferences: StudyPreferences;   // max daily minutes, energy profile
  availability: AvailabilityWindow[];
  now:         Date;               // injected for testability
}
```

Each feature exposes:

- a **score / decision function** (pure),
- a **reason generator** (human-readable explanation strings),
- an **action** that is applied only after user confirmation where the
  change is destructive (Plan Rescue, BrainFit rescheduling).

Because the engine is deterministic and time-injected, the same input always
yields the same output — which is what makes the required unit tests meaningful.

### 3.1 Study Now (`/dashboard`, `/today`)

Inputs: exam urgency, remaining workload, difficulty, confidence,
time since last review, available time today, current energy window,
pending revisions.

Output: one recommended session (subject, topic, duration, activity type,
priority score, reasons, expected session structure).

Never random; never permanently hardcoded; recomputed on every page load
from real data.

### 3.2 Difficulty Debt (`/dashboard`, `/analytics`)

Transparent score combining: exam proximity, remaining workload, topic
difficulty, syllabus completion, confidence, recent activity, available time.
Each factor is normalized 0–1 and weighted; the weights are exported so the
score is auditable. Displays risk level, score, top reasons, suggested next
action.

**The score is a planning heuristic. It is not a prediction of marks.**

### 3.3 BrainFit Scheduler (`/planner`)

Schedules sessions into the student's declared availability windows, matching
task difficulty to energy level:

- High energy → hard problems, DSA, math, mocks
- Medium energy → new concepts, structured revision
- Low energy → flashcards, light revision, reading

Constraints: no overlaps, never outside availability, never above daily limit,
respects exam urgency. Explanations are attached to each placement.

### 3.4 Memory Radar (`/memory`)

Spaced-repetition heuristic over topics:

- confidence 1–5 (self-reported)
- elapsed time since last review
- previous recall outcomes
- topic difficulty

Statuses: Strong / Needs Review / At Risk. Each review records confidence,
recall outcome, and the next recommended review date computed by the heuristic.
Launching a recall session and recording results adjusts the interval.

**It does not measure the student's brain or predict forgetting precisely.**

### 3.5 Plan Rescue (`/plan-rescue`)

Detects unfinished workload (planned minutes − actual minutes for sessions
that are overdue or partially completed), then redistributes it across future
available slots:

- respects remaining workload, upcoming exams, subject priority, topic difficulty
- never exceeds daily max
- never double-books a slot
- avoids overloading the next day
- shows original vs. proposed schedule with reasons
- requires explicit accept/reject; accepted changes are recorded in `plan_changes`
- handles the "insufficient remaining time" case explicitly

## 4. Data Flow (example: completing a session)

```
1. User clicks "Start" on a session card
   → Server Action `startSession(id)`
   → validates ownership (session.user_id === auth.uid())
   → sets status = 'in_progress', started_at = now

2. User clicks "Complete" (with actual minutes)
   → Server Action `completeSession(id, actualMinutes, notes?)`
   → validates ownership
   → sets status = 'completed', actual_minutes, completed_at
   → upserts topic_progress (time spent, NOT confidence)
   → may enqueue a memory-review prompt (confidence is NOT auto-increased)

3. Dashboard / Study Now / Difficulty Debt recompute on next render
   from the updated rows.
```

Key invariant: **time spent ≠ understanding.** Completing a session updates
progress metrics but never silently raises topic confidence.

## 5. Authentication & Authorization

- Supabase Auth, email + password.
- `middleware.ts` protects `(app)` routes: unauthenticated users are
  redirected to `/login`.
- Every Server Action and DB query re-checks ownership server-side —
  middleware is a UX guard, not a security boundary.
- RLS policies on every user table: `auth.uid() = user_id`.
- Service-role key is **never** used in user-facing code paths.

## 6. AI Integration (optional, phases 15–17)

- All OpenAI calls are server-side (route handlers / server actions).
- `OPENAI_API_KEY` missing → AI features show a clear "not configured"
  state; the rest of the app is fully functional.
- Structured outputs validated against a schema before use; malformed model
  output is rejected, never trusted.
- The Assistant explains existing engine recommendations; it does not silently
  rewrite the schedule. Any schedule change it proposes still requires the
  standard Plan Rescue confirmation flow.
- Quiz generation produces MCQs and short-answer items with answers and
  explanations; results recorded in `quiz_attempts`.
- Syllabus analyzer accepts pasted text (and optionally a document), extracts
  structure, and requires explicit confirmation before inserting topics.

## 7. Performance & Accessibility

- Server Components by default; client components only where interactivity
  requires them.
- Bounded queries (paginate or limit historical scans; dashboards aggregate
  over a window, not all history).
- Indexes on `user_id`, `subject_id`, `topic_id`, `scheduled_start`,
  `exam_date`, `review_date`.
- Semantic HTML, keyboard navigation, visible focus, ARIA where needed,
  color contrast ≥ WCAG AA, `prefers-reduced-motion` respected.
- Responsive at 360 / 390 / 414 / 768 / 1024 / 1440 px.

## 8. Deployment

- Target: Vercel. `npm run build` must pass with zero type errors.
- Environment variables documented in `.env.example` and `README.md`.
- Migrations are applied manually via Supabase SQL editor or CLI; documented
  in `README.md` and `docs/DATABASE_DESIGN.md`.
- No development-only data; no seeded fake users.

## 9. What is deliberately NOT in the architecture

- No client-side state-management framework (React state + server re-fetch
  is sufficient at this scale).
- No separate charting library (lightweight SVG components; avoids a heavy
  dependency for a handful of charts).
- No redundant databases; Supabase Postgres is the single source of truth.
- No LLM-driven scheduling, scoring, or prioritization.
