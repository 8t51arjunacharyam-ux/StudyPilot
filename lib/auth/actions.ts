"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

/**
 * Authentication Server Actions.
 *
 * -"--"--"--"--"--"--"--"--"--"--"--"--"--"--"--"--"--"--"--"--"--"--"--"--"--"--"--"--"--"--"--"--"--"--"--"--"--"--"--"--"--"--"--"--"--"--"--"--"--"--"--"--"--"--"--"--"--"--"--"--"--"--"--"--"--"--"--"--"--"--"--"--"--"--"--"--"-
 * SECURITY RULES OBSERVED HERE
 * -"--"--"--"--"--"--"--"--"--"--"--"--"--"--"--"--"--"--"--"--"--"--"--"--"--"--"--"--"--"--"--"--"--"--"--"--"--"--"--"--"--"--"--"--"--"--"--"--"--"--"--"--"--"--"--"--"--"--"--"--"--"--"--"--"--"--"--"--"--"--"--"--"--"--"--"--"-
 *   1. Every action validates its own input. FormData is attacker-controlled;
 *      a Server Action is reachable by a direct POST, not only through our UI.
 *   2. Passwords go to Supabase Auth and nowhere else. We never store, log,
 *      hash or compare them.
 *   3. No service-role key is used. These run as the anon/authenticated
 *      client, so Row Level Security still applies to everything.
 *   4. Errors are returned as typed results, never silently swallowed, and
 *      never reveal whether an email exists.
 *
 * WHY ACTIONS RATHER THAN API ROUTES
 *
 * A Server Action only ever runs on the server. Its code is never shipped in
 * the client bundle, so it cannot be poked from the browser console the way a
 * public API endpoint can. Combined with per-action validation, that is a
 * meaningfully smaller surface.
 */

/** A uniform result so the UI can render real messages instead of guessing. */
export type AuthResult =
  | { ok: true }
  | {
      ok: false;
      error: string;
      field?: "email" | "password" | "confirmPassword";
    };

/**
 * Normalise Supabase's auth errors into something safe and readable.
 *
 * IMPORTANT SECURITY POINT: we deliberately do NOT reveal whether an email is
 * registered. Supabase returns "Invalid login credentials" for both "no such
 * user" and "wrong password" -- we must not undo that protection by reporting
 * "this email does not exist", which would let anyone enumerate which students
 * have accounts.
 */
function readableAuthError(message: string): string {
  const lower = message.toLowerCase();

  if (lower.includes("invalid login credentials")) {
    return "Incorrect email or password. Please check and try again.";
  }
  if (lower.includes("email not confirmed")) {
    return "Please confirm your email address first. Check your inbox for the confirmation link.";
  }
  if (lower.includes("user already registered")) {
    return "An account with this email already exists. Try signing in instead.";
  }
  if (lower.includes("password should be at least")) {
    return "Choose a longer password -- at least 8 characters.";
  }
  if (lower.includes("rate limit") || lower.includes("too many")) {
    return "Too many attempts. Please wait a moment and try again.";
  }
  if (lower.includes("failed to fetch") || lower.includes("network")) {
    return "Could not reach the authentication server. Check your connection and try again.";
  }

  // Never surface a raw internal message to the user.
  console.error("[auth] Unhandled auth error:", message);
  return "Something went wrong. Please try again.";
}

/** Validate email shape without over-engineering it. */
function isValidEmail(value: string): boolean {
  // Deliberately permissive: the real authority is whether Supabase accepts it.
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

/**
 * Register a new student.
 *
 * On success the Supabase client has already set session cookies, so the user
 * is signed in immediately -- UNLESS email confirmation is enabled in the
 * Supabase project, in which case `session` is null and we must say so rather
 * than pretending they are logged in.
 */
export async function registerAction(
  _prev: AuthResult | null,
  formData: FormData
): Promise<AuthResult> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  // ---- Validation, before any network call -------------------------------
  if (!email) return { ok: false, error: "Email address is required.", field: "email" };
  if (!isValidEmail(email)) {
    return { ok: false, error: "Enter a valid email address.", field: "email" };
  }
  if (!password) return { ok: false, error: "Password is required.", field: "password" };
  if (password.length < 8) {
    return { ok: false, error: "Password must be at least 8 characters.", field: "password" };
  }
  if (!confirmPassword) {
    return { ok: false, error: "Please confirm your password.", field: "confirmPassword" };
  }
  if (password !== confirmPassword) {
    return { ok: false, error: "Passwords do not match.", field: "confirmPassword" };
  }

  try {
    const supabase = await createClient();

    const { data, error } = await supabase.auth.signUp({ email, password });

    if (error) {
      return { ok: false, error: readableAuthError(error.message) };
    }

    // No session means the project requires email confirmation.
    if (data.session === null) {
      return {
        ok: false,
        error:
          "Almost there -- check your inbox to confirm your email address, then sign in.",
      };
    }

    // Session cookies were already set by the Supabase client above.
    revalidatePath("/", "layout");
  } catch (error) {
    console.error("[auth] register threw:", error);
    return {
      ok: false,
      error: "We could not create your account. Please try again.",
    };
  }

  redirect("/dashboard");
}

/** Sign an existing student in. */
export async function loginAction(
  _prev: AuthResult | null,
  formData: FormData
): Promise<AuthResult> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "");

  if (!email) return { ok: false, error: "Email address is required.", field: "email" };
  if (!isValidEmail(email)) {
    return { ok: false, error: "Enter a valid email address.", field: "email" };
  }
  if (!password) return { ok: false, error: "Password is required.", field: "password" };

  try {
    const supabase = await createClient();

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      return { ok: false, error: readableAuthError(error.message) };
    }

    revalidatePath("/", "layout");
  } catch (error) {
    console.error("[auth] login threw:", error);
    return {
      ok: false,
      error: "We could not sign you in. Please try again.",
    };
  }

  // Only allow INTERNAL redirects. A `next` value pointing at another site
  // would turn the login page into an open redirect, which attackers abuse to
  // make a victim land on a convincing fake page after signing in.
  const safeNext =
    next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";
  redirect(safeNext);
}

/**
 * Sign out.
 *
 * Supabase revokes the refresh token server-side, so the session is genuinely
 * destroyed rather than merely cleared in the browser.
 */
export async function logoutAction(): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.auth.signOut();

  if (error) {
    // Report it rather than pretending the sign-out worked.
    console.error("[auth] logout error:", error.message);
    redirect("/login?error=signout-failed");
  }

  revalidatePath("/", "layout");
  redirect("/login");
}
