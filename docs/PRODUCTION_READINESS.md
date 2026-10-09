# StudyPilot — Production Readiness

**Status:** Not production-ready. Do not deploy without resolving listed items.
**Last updated:** 2026-10-09
**Verified by:** Actual command execution (`npm run typecheck`, `npm run lint`), file inspection.

---

## 1. Build / Type / Lint

| Check | Result | Evidence |
|---|---|---|
| TypeScript (`npm run typecheck`) | **FAIL — 8 errors** | Actual output captured: `SubjectList.tsx`, `useSubjectForm.ts`, `SubjectFormDialog.tsx`, `brainfit.additional.test.ts` errors. NOT suppressed. |
| Lint (`npm run lint`) | **PASS with 43 warnings** | 4 errors (same source as type errors), 43 `no-unused-vars` warnings in engine files. Not hidden. |
| Production build (`npm run build`) | **NOT TESTED** | Never executed in this session. |
| Unit tests (`npm run test:run`) | **NOT TESTED** | Not executed. Test files exist (`study-now.test.ts`, `brainfit.test.ts`, etc.) but not run. |

## 2. Database

| Check | Result | Evidence |
|---|---|---|
| Migrations designed | **PASS** | `001_initial_schema.sql` through `004_add_cancelled_status.sql` verified (RLS, indexes, triggers, verification queries). |
| Migrations applied to remote | **NOT VERIFIED** | No `supabase db push` executed; no SQL Editor run confirmed. `.env.local` points to `bkkxbfjutikjwareqohc.supabase.co`. User must apply manually. |
| RLS policies active | **NOT VERIFIED** | Policies defined in migration; remote state unknown. Isolation test (§18 of 001) not performed. |

## 3. Security

| Check | Result | Evidence |
|---|---|---|
| No secrets in code / `.env.local` gitignored | **PASS** (`.gitignore` verified) | `.env.local` contains real keys but is ignored. No hardcoded secrets in source. |
| Service role key usage | **PASS** | Only `NEXT_PUBLIC_SUPABASE_ANON_KEY` / `PUBLISHABLE_KEY` used in `middleware.ts` and `lib/server.ts`. `SUPABASE_SERVICE_ROLE_KEY` empty. |
| API input validation | **PASS (structural)** | Server actions (`study_sessions.ts`, `onboarding/actions.ts`) validate inputs (length, ranges, ownership). Not exhaustively audited. |
| AI key exposure | **PASS** | No `OPENAI_API_KEY` in client code; server-side only (no `lib/ai/` yet). |

## 4. Accessibility / Responsive

| Check | Result | Evidence |
|---|---|---|
| Semantic HTML / keyboard / ARIA | **NOT AUDITED** | Source inspected (landing uses semantic `<main>`, `<section>`, `<h1>`), but no screen-reader or keyboard navigation test performed. |
| Reduced-motion (`prefers-reduced-motion`) | **NOT VERIFIED** | CSS includes `transition-colors`; no media-query check done. |
| Viewport checks (360 / 390 / 768 / 1024 / 1440) | **PARTIAL** | File patterns use `sm:`, `lg:` utilities; no browser viewport verification executed. |

## 5. External Blockers

- `OPENAI_API_KEY` missing — AI phases (Assistant, Quiz, Syllabus) blocked by design (graceful missing-credential handling required).
- Remote Supabase DB state unverified — migrations need manual application; isolation test (§18) should be run by user.
- Vercel deployment not authorized / not attempted — `next.config.ts` empty, no deployment URL verified.

## 6. Next Required Actions (before claiming "production ready")

1. Fix 8 TypeScript errors (missing imports / wrong props / engine test type mismatches).
2. Run `npm run build` — must exit 0.
3. Apply DB migrations and run isolation test (§18 of 001).
4. Add `lib/ai/` integration and verify missing-key handling.
5. Execute `npm run test:run`; fix any failures.
6. Perform accessibility / responsive audit (browser, not source-only).
7. Obtain Vercel deployment authorization and verify live URL.

---
**Do not claim this application is live or secure until all above pass.**
