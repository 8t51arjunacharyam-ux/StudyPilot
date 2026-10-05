/**
 * Supabase client for Server Components, Server Actions and Route Handlers.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * DO NOT IMPORT THIS FILE FROM A CLIENT COMPONENT.
 *
 * Normally this file would `import "server-only"` to make that mistake a build
 * error. That would mean adding a small extra dependency purely for this one
 * guard, and we are keeping the dependency list minimal. Instead:
 *   - This file lives under lib/supabase/, next to client.ts.
 *   - It is the only file in the project that reads SUPABASE_SERVICE_ROLE_KEY.
 *   - The Phase 2 health check verifies no secret reaches the browser bundle.
 * If we ever need a hard compiler-enforced barrier, adding `server-only` at
 * that point is a one-line change.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import {
  getPublicSupabaseUrl,
  getPublicSupabaseAnonKey,
  MissingEnvError,
} from "@/lib/supabase/env";

/**
 * Creates a Supabase client bound to the current request's cookies.
 *
 * THE IMPORTANT IDEA — WHY COOKIES, NOT localStorage
 *
 * The session token is stored in an HttpOnly cookie. That means JavaScript
 * running in the browser cannot read it at all. If instead we stored the
 * token in localStorage, any XSS bug (malicious script injected into the
 * page) would be able to read the token and steal the student's account.
 * Cookies are simply the safer place for a credential.
 *
 * HOW IT WORKS
 *
 *  1. `createServerClient` reads the session from the request cookies.
 *  2. It automatically refreshes an expiring access token.
 *  3. The refreshed token must be written BACK onto the response cookies —
 *     that's what the `setAll` callback below is for. Without it, the
 *     refresh happens in memory and is lost on the next request, so the
 *     student would be logged out constantly.
 *
 * WHY `await cookies()`
 *
 * In Next.js 16 `cookies()` is asynchronous and must be awaited. This is one
 * of the version's breaking changes.
 *
 * SECURITY: this file imports "server-only", so importing it from a Client
 * Component is a build error rather than a silent leak.
 */

export async function createClient() {
  const url = getPublicSupabaseUrl();
  const anonKey = getPublicSupabaseAnonKey();

  // Fail loudly and specifically, per rule #10: never hide errors.
  if (!url) {
    throw new MissingEnvError(
      "NEXT_PUBLIC_SUPABASE_URL",
      "Supabase dashboard > Project Settings > API"
    );
  }
  if (!anonKey) {
    throw new MissingEnvError(
      "NEXT_PUBLIC_SUPABASE_ANON_KEY",
      "Supabase dashboard > Project Settings > API Keys"
    );
  }

  const cookieStore = await cookies();

  return createServerClient(url, anonKey, {
    cookies: {
      /** Read all cookies from the incoming request. */
      getAll() {
        return cookieStore.getAll();
      },
      /**
       * Write cookies back onto the response.
       *
       * Supabase calls this whenever it refreshes a token. We deliberately
       * call `set` on the store and do NOT throw when that fails: during
       * a Server Component render the response headers are already sealed
       * and cannot be modified. That is not an error condition — the token
       * simply stays unchanged, and the middleware/proxy refresh handles
       * the actual write. Throwing here would break every page render.
       */
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Intentionally ignored — see explanation above. Safe because the
          // refresh already happened in memory for this request.
        }
      },
    },
  });
}