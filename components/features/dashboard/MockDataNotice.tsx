import { FlaskConical } from "lucide-react";

/**
 * MockDataNotice — the prominent banner shown above mock content.
 *
 * This exists because of project rule #11: never use fake functionality and
 * pretend it is working. A polished dashboard full of invented numbers can
 * easily be mistaken for a working product by anyone reviewing it — including
 * us, three weeks from now.
 *
 * So every screen showing invented data says so, loudly and permanently, in
 * the first thing the eye lands on. This banner is deleted only when the real
 * data layer replaces lib/mock-data.ts.
 */
export function MockDataNotice({
  what = "All figures below are development mock data.",
}: {
  what?: string;
}) {
  return (
    <div
      role="status"
      className="flex items-start gap-3 rounded-card border border-warning/30 bg-warning-soft p-4"
    >
      <FlaskConical className="mt-0.5 size-4.5 shrink-0 text-warning" aria-hidden="true" />
      <div className="space-y-0.5">
        <p className="text-sm font-semibold text-warning">
          Development preview — mock data
        </p>
        <p className="text-xs leading-relaxed text-muted">
          {what} No account is signed in, no database is connected, and none of
          the scheduling, memory or risk calculations below are actually
          running. These values are hardcoded examples for layout review only.
        </p>
      </div>
    </div>
  );
}