import { CheckCircle2, Circle, Zap } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import type { MockSession } from "@/lib/mock-data";

/**
 * TodaySessionsCard — the day's scheduled sessions.
 *
 * The energy label (Peak focus / Steady / Light) represents the BrainFit
 * concept: matching work difficulty to the student's energy at that hour.
 * These labels are hardcoded per session in mock data; no energy matching is
 * actually performed.
 */
export function TodaySessionsCard({
  sessions,
}: {
  sessions: MockSession[];
}) {
  const energyTone = {
    "Peak focus": "primary",
    Steady: "info",
    Light: "neutral",
  } as const;

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between pb-4">
        <CardTitle>Today&apos;s sessions</CardTitle>
        <span className="text-xs text-muted">{sessions.length} planned</span>
      </CardHeader>

      <CardContent>
        {/*
          A real <ul> of <li> items, because this genuinely is a list of
          sessions. Semantic markup matters for screen readers and is free.
        */}
        <ul className="divide-y divide-border">
          {sessions.map((session) => {
            const done = session.status === "completed";

            return (
              <li
                key={session.id}
                className="flex items-center gap-4 py-3 first:pt-0 last:pb-0"
              >
                <span className="shrink-0" aria-hidden="true">
                  {done ? (
                    <CheckCircle2 className="size-5 text-success" />
                  ) : (
                    <Circle className="size-5 text-border-strong" />
                  )}
                </span>

                <span className="shrink-0 text-xs font-medium tabular-nums text-muted">
                  {session.startTime}
                  <span className="mx-1 text-subtle">–</span>
                  {session.endTime}
                </span>

                <span className="min-w-0 flex-1">
                  <span
                    className={`block truncate text-sm font-medium ${
                      done ? "text-muted line-through" : ""
                    }`}
                  >
                    {session.topicName}
                  </span>
                  <span className="flex items-center gap-1.5 text-xs text-subtle">
                    <span
                      className="size-2 shrink-0 rounded-full"
                      style={{ backgroundColor: session.color }}
                      aria-hidden="true"
                    />
                    {session.subjectName}
                  </span>
                </span>

                <Badge tone={energyTone[session.energyLabel]} className="hidden sm:inline-flex">
                  {session.energyLabel === "Peak focus" && (
                    <Zap className="size-3" aria-hidden="true" />
                  )}
                  {session.energyLabel}
                </Badge>
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}