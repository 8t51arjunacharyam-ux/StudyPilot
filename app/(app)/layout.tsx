import { AppShell } from "@/components/layout/AppShell";
import { requireUser } from "@/lib/auth/session";
import { getProfile } from "@/lib/auth/session";
import { redirect } from "next/navigation";

/**
 * Force these pages to render per-request, never at build time.
 *
 * WHY THIS LINE IS A SECURITY REQUIREMENT, NOT AN OPTIMISATION
 *
 * Every page inside app/(app)/ reads the signed-in user's cookies. If any of
 * them were statically prerendered at build time, one student's HTML would be
 * generated once, cached on a CDN, and then served to EVERY visitor. That is
 * both a data leak and a broken experience.
 *
 * `force-dynamic` guarantees the render happens on the server, per request,
 * with that requester's own cookies. Authenticated pages must never be static.
 *
 * It also has a practical benefit: the build no longer tries to call Supabase
 * at build time, so `next build` succeeds even before environment variables
 * are configured.
 */
export const dynamic = "force-dynamic";

/**
 * Layout for all signed-in application pages.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * THIS IS THE SECURITY CHOKEPOINT
 * ─────────────────────────────────────────────────────────────────────────────
 * Every page inside app/(app)/ - /dashboard, /subjects, /planner, /exams,
 * /memory, /analytics, /settings - inherits this check automatically, because
 * Next.js nests them under this layout. Adding a new page is protected by
 * default rather than by remembering to add a guard.
 *
 * `requireUser()` calls `supabase.auth.getUser()`, which VERIFIES the session
 * token with the Supabase Auth server rather than merely decoding it. An
 * expired or revoked session fails that check and the visitor is redirected to
 * /login. There is no way to reach a child page without a valid session.
 *
 * IMPORTANT: this is not the ONLY layer. Server Actions are reachable by a
 * direct POST, bypassing layouts entirely, so every action re-checks the
 * session itself. RLS is the third layer, at the database.
 */
export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Redirects to /login when there is no valid session.
  await requireUser();

  // Check if onboarding is complete (skip for onboarding page itself)
  const profile = await getProfile();

  // If onboarding is not complete, redirect to onboarding
  // (The onboarding page itself handles its own profile check)
  if (profile && !profile.onboarding_completed) {
    redirect("/onboarding");
  }

  return <AppShell>{children}</AppShell>;
}