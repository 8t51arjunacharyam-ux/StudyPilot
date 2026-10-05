import type { Metadata } from "next";
import { CheckCircle2, XCircle, AlertTriangle } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { runHealthChecks } from "@/lib/supabase/health";

export const metadata: Metadata = {
  title: "Connection health check",
};

/** Never cache this — it must always report the live state. */
export const dynamic = "force-dynamic";

/**
 * Health check page — verifies the Supabase connection honestly.
 *
 * WHY THIS EXISTS
 *
 * The dangerous failure mode for a database integration is a page that *looks*
 * fine because an error was swallowed. This page does the opposite: it runs
 * real checks and reports exactly what it found, including failures. That is
 * rule #11 — no pretending something works.
 *
 * It reports CONFIGURATION state only and never prints a secret value.
 *
 * Unauthenticated and read-only: remove or gate it before production launch.
 */
export default async function HealthPage() {
  const { checks, reachable } = await runHealthChecks();

  const failures = checks.filter((c) => c.status === "fail").length;
  const allPass = failures === 0 && reachable;

  return (
    <Container size="narrow" className="py-12">
      <div className="space-y-6">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight">Supabase health check</h1>
          <p className="text-sm leading-relaxed text-muted">
            Live diagnostic of your database connection. Secret values are never
            displayed — only whether each variable is present.
          </p>
        </div>

        <Card>
          <CardHeader className="flex-row items-center justify-between pb-4">
            <CardTitle>Overall status</CardTitle>
            {/* Badge tones are a fixed semantic set, so map our result onto
                an existing tone rather than inventing "fail". */}
            <Badge tone={allPass ? "success" : "danger"}>
              {allPass
                ? "Connected"
                : failures > 0
                  ? "Not connected"
                  : "Partially configured"}
            </Badge>
          </CardHeader>
          <CardContent>
            <ul className="space-y-4">
              {checks.map((check) => (
                <li key={check.name} className="flex items-start gap-3">
                  {check.status === "pass" ? (
                    <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" aria-hidden="true" />
                  ) : check.status === "fail" ? (
                    <XCircle className="mt-0.5 size-4 shrink-0 text-danger" aria-hidden="true" />
                  ) : (
                    <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden="true" />
                  )}
                  <div className="min-w-0 space-y-0.5">
                    <p className="font-mono text-xs font-medium break-all">{check.name}</p>
                    <p className="text-xs leading-relaxed text-muted">{check.detail}</p>
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle>Next step</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm leading-relaxed text-muted">
            {allPass ? (
              <p>
                Connection confirmed. Now apply the schema: open{" "}
                <code className="rounded bg-surface-muted px-1 py-0.5 font-mono text-xs">
                  supabase/migrations/20260101000000_initial_schema.sql
                </code>{" "}
                in the Supabase SQL Editor and run it. That creates all 9 tables
                with Row Level Security enabled on each.
              </p>
            ) : (
              <p>
                Fill in the missing values in{" "}
                <code className="rounded bg-surface-muted px-1 py-0.5 font-mono text-xs">
                  .env.local
                </code>
                , then restart the dev server (<code>npm run dev</code>) — env
                files are read at startup, not on every request. Full
                instructions are in <code>.env.example</code>.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </Container>
  );
}