import {
  getPublicSupabaseUrl,
  getPublicSupabaseAnonKey,
  getServiceRoleKey,
} from "@/lib/supabase/env";

/**
 * Real connection diagnostics.
 *
 * Kept separate from the page component so the checks are testable later and
 * the page stays purely presentational.
 *
 * SECURITY: this module reports only whether a variable is PRESENT, never its
 * value. A health check that echoes a service_role key would itself be a
 * vulnerability.
 */

export type Check = {
  name: string;
  status: "pass" | "fail" | "warn";
  detail: string;
};

export async function runHealthChecks(): Promise<{
  checks: Check[];
  reachable: boolean;
}> {
  const url = getPublicSupabaseUrl();
  const anonKey = getPublicSupabaseAnonKey();
  const serviceKey = getServiceRoleKey();

  const checks: Check[] = [];

  checks.push({
    name: "NEXT_PUBLIC_SUPABASE_URL",
    status: url ? "pass" : "fail",
    detail: url
      ? `Present (${new URL(url).host})`
      : "Missing — add it to .env.local, then restart the dev server",
  });

  checks.push({
    name: "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    status: anonKey ? "pass" : "fail",
    detail: anonKey
      ? "Present (value hidden)"
      : "Missing — use the anon/publishable key, NOT the service_role key",
  });

  // Service role is not needed until auth (Phase 3), so absence is a warning.
  checks.push({
    name: "SUPABASE_SERVICE_ROLE_KEY",
    status: serviceKey ? "pass" : "warn",
    detail: serviceKey
      ? "Present (value hidden)"
      : "Not set — fine for now; needed later for privileged server writes",
  });

  // A real network call. This is what separates "configured" from "working".
  if (url && anonKey) {
    try {
      const response = await fetch(`${url}/rest/v1/profiles?select=id&limit=1`, {
        headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}` },
        cache: "no-store",
      });

      if (response.ok) {
        const body = (await response.json()) as unknown[];
        checks.push({
          name: "Network connection to Supabase",
          status: "pass",
          detail: `Reachable. Query returned ${body.length} row(s) — 0 is correct and means RLS is blocking anonymous access, exactly as intended.`,
        });
      } else {
        const text = await response.text();
        checks.push({
          name: "Network connection to Supabase",
          status: "fail",
          detail: `HTTP ${response.status} ${response.statusText}. ${text.slice(0, 200)}`,
        });
      }
    } catch (error) {
      checks.push({
        name: "Network connection to Supabase",
        status: "fail",
        detail: `Could not reach Supabase: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      });
    }
  } else {
    checks.push({
      name: "Network connection to Supabase",
      status: "warn",
      detail: "Skipped — URL and anon key must both be set before testing",
    });
  }

  return {
    checks,
    reachable: checks.some((c) => c.name === "Network connection to Supabase" && c.status === "pass"),
  };
}