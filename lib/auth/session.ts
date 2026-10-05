import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { redirect } from "next/navigation";

/**
 * Session helpers for Server Components, Server Actions and Route Handlers.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * SERVER ONLY. Do not import this from a Client Component.
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * FAIL-CLOSED BEHAVIOUR
 *
 * If Supabase is not configured, `getCurrentUser()` returns null and protected
 * pages redirect to /login. That is deliberate and important: a missing env
 * var must make the app CLOSED, never OPEN. If this instead threw, a
 * misconfigured deployment would produce 500s, and worse, any future change
 * that treated "could not verify" as "allowed" would silently disable
 * authentication entirely. Failing closed means the worst case of a
 * configuration mistake is that nobody can log in - not that everybody can.
 *
 * THE ONE FUNCTION THAT MATTERS
 *
 *   getCurrentUser()
 *
 * It calls `supabase.auth.getUser()`, NOT `getSession()`.
 *
 * WHY THE DIFFERENCE MATTERS SO MUCH
 *
 *   getSession() reads the JWT cookie and DECODES it. Decoding is not
 *   verifying - it just base64-decodes the payload, with no signature check.
 *   That is acceptable for showing a name in a header.
 *
 *   getUser() asks the Supabase Auth server whether the token is genuinely
 *   valid and unexpired. It verifies the signature.
 *
 * Using getSession() for an authorisation decision would mean trusting data
 * the client controls. getUser() is the only one safe for deciding "is this
 * person allowed in?".
 *
 * SESSION EXPIRY: because getUser() re-validates on every call, an expired or
 * revoked session returns null and the user is redirected. There is no stale
 * "logged in" state left behind.
 */

/** The authenticated user, or null. */
export async function getCurrentUser() {
  // Fail closed: without configuration, nobody is authenticated.
  if (!isSupabaseConfigured()) {
    console.error(
      "[auth] Supabase is not configured. All protected routes are closed. " +
        "Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local."
    );
    return null;
  }

  try {
    const supabase = await createClient();

    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    // An invalid or expired token is not a failure - it means signed out.
    if (error) return null;

    return user;
  } catch (error) {
    // Fail closed on ANY unexpected error. If we cannot verify the session,
    // the safe answer is "not signed in".
    console.error("[auth] Failed to verify session:", error);
    return null;
  }
}

/**
 * Require a signed-in user, or redirect to /login.
 *
 * `redirect()` throws a control-flow signal that Next.js intercepts, so
 * nothing after this line runs for an unauthenticated visitor.
 */
export async function requireUser(returnTo?: string) {
  const user = await getCurrentUser();

  if (!user) {
    // Preserve where they were heading so login can send them back.
    const target = returnTo ? `?next=${encodeURIComponent(returnTo)}` : "";
    redirect(`/login${target}`);
  }

  return user;
}

/**
 * The user's profile row.
 *
 * RLS guarantees this returns at most one row, and only the caller's own.
 */
export async function getProfile() {
  const user = await getCurrentUser();
  if (!user) return null;

  // Returns null when Supabase is unconfigured, which the shell handles.
  if (!isSupabaseConfigured()) return null;

  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("profiles")
      .select(
        "id, full_name, email, timezone, onboarding_completed, daily_study_goal_minutes"
      )
      .eq("id", user.id)
      .maybeSingle();

    if (error) {
      // Surface the failure honestly rather than pretending the profile is empty.
      console.error("[auth] Failed to load profile:", error.message);
      return null;
    }

    return data;
  } catch (error) {
    console.error("[auth] getProfile threw:", error);
    return null;
  }
}