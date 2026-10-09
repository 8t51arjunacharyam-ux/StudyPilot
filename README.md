/# StudyPilot

An adaptive study planning system. Your study plan adapts to your real progress.

StudyPilot is not a calendar or a todo list. When a student misses a session, the
plan recalculates the unfinished workload and redistributes it across the time
actually remaining — without overloading them.

## Core capabilities

| Capability | What it does |
| --- | --- |
| **Plan Rescue** | Recalculates and redistributes missed work across remaining available time |
| **BrainFit Scheduler** | Places difficult subjects in high-energy periods, lighter work in low-energy ones |
| **Memory Radar** | Tracks topic confidence and revision history to flag material about to be forgotten |
| **Difficulty Debt** | Weighs difficulty, exam urgency, remaining workload and confidence to show what is slipping |
| **Study Now** | Recommends the single most useful session to perform right now |

## Tech stack

- **Framework:** Next.js 16 (App Router) · React 19 · TypeScript
- **Styling:** Tailwind CSS v4 (CSS-first `@theme` tokens)
- **Icons:** lucide-react
- **Database:** Supabase PostgreSQL *(planned)*
- **Auth:** Supabase Auth *(planned)*
- **AI:** OpenAI *(planned, later phase)*
- **Deploy:** Vercel

## Current status — Phase 1 (UI foundation)

The interface is built. The intelligence is not.

**Working:** design system, responsive app shell (desktop sidebar + mobile
drawer + topbar), UI primitives, and the landing, auth and dashboard routes.

**Not built yet:** authentication, database, and all scheduling / rescue /
memory / risk logic. Every figure currently shown on the dashboard comes from
one static file of hand-written constants in `lib/mock-data.ts`, and the UI
labels itself accordingly. The auth forms are deliberately disabled rather
than pretending to work.

This is intentional. The full architecture and phased build order are documented
in [`docs/PROJECT_PLAN.md`](docs/PROJECT_PLAN.md).

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

| Route | Description |
| --- | --- |
| `/` | Landing page |
| `/login` | Sign in (not yet connected) |
| `/register` | Create account (not yet connected) |
| `/dashboard` | Student dashboard (mock data) |

## Quality checks

All three must pass before any phase is considered complete:

```bash
npx tsc --noEmit   # types
npm run lint       # lint
npm run build      # production build
```

## Project structure

```
app/
├── (marketing)/     Public landing page
├── (auth)/          Login and registration
├── (app)/           Signed-in shell + dashboard
├── globals.css      Design tokens (Tailwind v4 @theme)
└── layout.tsx       Root layout

components/
├── ui/              Primitives: Button, Card, Badge, Progress, states
├── layout/          AppShell, Sidebar, Topbar, MobileNav
└── features/        Feature components (dashboard/*)

lib/
├── mock-data.ts     TEMPORARY — hardcoded dev data, delete later
└── utils.ts         Shared helpers

docs/
└── PROJECT_PLAN.md  Architecture and development phases
```

## Development principles

- No fake functionality — if it does not work, the UI says so
- No hidden errors — errors surface with real messages and real logs
- Pure, testable domain logic — no I/O inside business rules
- Minimal dependencies, each justified before it is added

## License

Private project.