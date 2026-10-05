"use client";

import { createBrowserClient } from "@supabase/ssr";
import {
  getPublicSupabaseUrl,
  getPublicSupabaseAnonKey,
  MissingEnvError,
} from "@/lib/supabase/env";

/**
 * Supabase client for Client Components.
 *
 * WHEN DO WE NEED THIS?
 *
 * Most of the app should read data on the server (Server Components), which
 * needs no browser client at all. This exists for the specific cases where we
 * genuinely need Supabase from the browser — for example subscribing to
 * realtime updates or calling auth directly from an interactive form.
 *
 * We add it lazily rather than at module scope so that simply importing this
 * file on a page that never uses it does nothing.
 *
 * SECURITY NOTE: only the anon key reaches this code. That is correct and
 * safe — Row Level Security is what protects the data, not key secrecy.
 */
let cachedClient: ReturnType<typeof createBrowserClient> | null = null;

export function createClient() {
  const url = getPublicSupabaseUrl();
  const anonKey = getPublicSupabaseAnonKey();

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

  // Reuse one instance rather than creating a new client on every render.
  if (!cachedClient) {
    cachedClient = createBrowserClient(url, anonKey);
  }

  return cachedClient;
}
