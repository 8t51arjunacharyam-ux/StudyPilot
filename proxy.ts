import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";

/**
 * Session refresh (Next.js 16's replacement for the old `middleware.ts`).
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * WHAT THIS DOES AND — MORE IMPORTANT — WHAT IT DOES NOT DO
 * ─────────────────────────────────────────────────────────────────────────────
 * This file REFRESHES the session cookie. It is NOT the security boundary.
 *
 * A common and dangerous mistake is to treat middleware/proxy as the thing
 * protecting your routes. It is not:
 *
 *   - It runs before rendering, on the edge of the request.
 *   - It can be bypassed by anything that reaches a Server Action directly.
 *   - Our real protections are (1) the `requireUser()` check in
 *     app/(app)/layout.tsx, (2) a session check inside every Server Action,
 *     and (3) Row Level Security in the database.
 *
 * So this file deliberately does NOT try to be a gatekeeper. It does one job:
 * keep the session alive.
 *
 * WHY REFRESHING IS NECESSARY
 *
 * Supabase access tokens are short-lived. Without a refresh, every student
 * would be silently signed out roughly an hour in, mid-session, which is
 * infuriating and looks broken. Calling getUser() here gives @supabase/ssr a
 * chance to issue a fresh token and write it back onto the request cookies.
 *
 * NOTE ON AUTHENTICATION ERRORS: if env vars are missing, createServerClient
 * throws. We let that propagate rather than swallowing it - a silent catch
 * here would make a misconfiguration look like a working app.
 */
export async function proxy(request: NextRequest) {
  /**
   * Fail closed AND stay reachable.
   *
   * Without this guard, an unconfigured deployment throws from here and every
   * page returns 500 - including the login page, so nobody could even diagnose
   * it. Returning `next()` unchanged keeps the app in a usable, CLOSED state:
   * the proxy does nothing, and the layout guard does the real work of
   * redirecting unauthenticated visitors to /login.
   */
  if (!isSupabaseConfigured()) {
    return NextResponse.next({ request });
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        /**
         * Write refreshed cookies onto BOTH the request (so downstream server
         * components see them) and the response (so the browser stores them).
         * Miss either one and refresh silently fails.
         */
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          response = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
        },
      },
    }
  );

  /**
   * IMPORTANT: this call is what triggers the refresh. We do not use its
   * result. Calling getUser() here is purely so @supabase/ssr can validate
   * the token and rotate it if needed.
   *
   * getSession() would NOT work here: it only decodes the token locally and
   * would never trigger a refresh.
   */
  await supabase.auth.getUser();

  return response;
}

export const config = {
  matcher: [
    /**
     * Run on every path EXCEPT static assets and images.
     *
     * Excluding them is a performance decision: refreshing a cookie while
     * serving a CSS file or a logo is wasted work on every single asset.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};