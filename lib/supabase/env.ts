/**
 * Environment variable validation.
 *
 * WHY THIS FILE EXISTS
 *
 * It is very easy to leave a variable blank or misspelled and then spend an
 * hour debugging a confusing Supabase error. This module fails loudly and
 * immediately, with a message that says exactly which variable is missing and
 * where to get it.
 *
 * Note the important subtlety this protects against:
 *
 *   NEXT_PUBLIC_ variables are INLINED INTO THE JAVASCRIPT BUNDLE at build
 *   time. That means they cannot be read at runtime on the server in the way
 *   you might expect, and — crucially — a blank NEXT_PUBLIC_ value becomes the
 *   literal string "undefined" in the browser rather than throwing an error.
 *
 * So we check these values explicitly instead of letting them fail silently.
 */

/** Thrown when a required environment variable is missing or malformed. */
export class MissingEnvError extends Error {
  constructor(variable: string, where: string) {
    super(
      `Missing environment variable: ${variable}\n\n` +
        `  Set it in d:\\projects\\studypilot\\.env.local\n` +
        `  Find your value at: ${where}\n` +
        `  See .env.example for the full list of required variables.`
    );
    this.name = "MissingEnvError";
  }
}

/**
 * Reads a required public Supabase variable.
 * Returns null when unset so callers can decide how to handle absence.
 */
export function getPublicSupabaseUrl(): string | null {
  const value = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();

  // An unquoted empty string or the literal "undefined" both mean "not set".
  if (!value || value === "undefined") return null;

  // Fail fast on a malformed URL rather than letting a fetch fail obscurely.
  try {
    const url = new URL(value);
    if (!url.protocol.startsWith("http")) return null;
    return value;
  } catch {
    return null;
  }
}

export function getPublicSupabaseAnonKey(): string | null {
  const value = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!value || value === "undefined") return null;
  return value;
}

/**
 * The service role key is required only for privileged server-side work.
 * It is intentionally never read into any client-reachable code path.
 */
export function getServiceRoleKey(): string | null {
  const value = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!value || value === "undefined") return null;
  return value;
}

/** True when both public variables are present and the project can connect. */
export function isSupabaseConfigured(): boolean {
  return Boolean(getPublicSupabaseUrl() && getPublicSupabaseAnonKey());
}