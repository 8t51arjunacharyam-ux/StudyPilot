# StudyPilot — Vercel Deployment Preparation

**Not deployed.** This document prepares the project for manual deployment. No live URL is claimed.

---

## Required Environment Variables (Vercel Dashboard → Settings → Environment Variables)

Add to Production (and Preview if desired):

| Name | Value source | Example / note |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase Project Settings → API | `https://bkkxbfjutikjwareqohc.supabase.co` (from `.env.local`) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase Project Settings → API | `sb_publishable_...` (anon/publishable) |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Same as above (used by server client) | Same value |
| `SUPABASE_SERVICE_ROLE_KEY` | Only if needed for admin scripts | Leave empty unless specifically required |
| `OPENAI_API_KEY` | OpenAI account billing page | Leave empty if AI not configured; app works without it |

**Never** put secrets in `NEXT_PUBLIC_*` variables other than the Supabase publishable key (which is designed to be public).

---

## Before Deploying

1. Fix 8 TypeScript errors (`npm run typecheck`).
2. Apply DB migrations (`001_initial_schema.sql` ... `004...`) via Supabase SQL Editor.
3. Run isolation test (§18 of `001_initial_schema.sql`) to confirm RLS.
4. Run `npm run build` and confirm exit 0.
5. Optionally run `npm run test:run`.
6. Set environment variables in Vercel project.

---

## Manual Deployment Steps

1. Push current branch to GitHub (if not yet pushed):
   `git push origin main`
2. Import repo at https://vercel.com/new (or link existing project).
3. Configure build command: `npm run build` (default for Next.js).
4. Configure output directory: `.next` (default).
5. Add environment variables (see table above).
6. Deploy. Verify build succeeds.
7. After deployment, visit URL and test: login, onboarding (if needed), dashboard, planner.

---

## Post-Deployment

- Configure authenticationredirect URLs in Supabase Auth settings: `https://<your-vercel-url>/auth/callback`
- Confirm `middleware.ts` redirects correctly (`/auth/login` path verified).
- Verify database access from live site (search subjects, create session).
- If using AI: add `OPENAI_API_KEY` to Vercel env; verify `/assistant` loads without error.

---

## What Is Not Done (honest)

- Not deployed. No Vercel URL exists.
- `npm run build` was not executed in this session.
- Remote DB migrations not applied (must be done manually before or after deploy).
- No custom domain configured.
