import { CheckCircle2, Circle, Zap, Play } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import type { StudySessionWithDetails } from "@/lib/types/database";

/**
 * TodaySessionsCard — the day's scheduled sessions.
 */
export function TodaySessionsCard({
  sessions,
}: {
  sessions: StudySessionWithDetails[];
}) {
  const getEnergyTone = (energyMatch: StudySessionWithDetails["energy_match"]) => {
    switch (energyMatch) {
      case "peak": return "primary";
      case "steady": return "info";
      case "light": return "neutral";
      default: return "neutral";
    }
  };

  const getEnergyLabel = (energyMatch: StudySessionWithDetails["energy_match"]) => {
    switch (energyMatch) {
      case "peak": return "Peak focus";
      case "steady": return "Steady";
      case "light": return "Light";
      default: return "—";
    }
  };

  const formatTime = (isoString: string) => {
    return new Date(isoString).toLocaleTimeString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between pb-4">
        <CardTitle>Today&apos;s sessions</CardTitle>
        <span className="text-xs text-muted">{sessions.length} planned</span>
      </CardHeader>

      <CardContent>
        {sessions.length === 0 ? (
          <p className="text-sm text-muted text-center py-4">No sessions scheduled for today.</p>
        ) : (
          <ul className="divide-y divide-border">
            {sessions.map((session) => {
              const done = session.status === "completed";
              const inProgress = session.status === "in_progress";

              return (
                <li
                  key={session.id}
                  className="flex items-center gap-4 py-3 first:pt-0 last:pb-0"
                >
                  <span className="shrink-0" aria-hidden="true">
                    {done ? (
                      <CheckCircle2 className="size-5 text-success" />
                    ) : inProgress ? (
                      <Play className="size-5 text-primary" />
                    ) : (
                      <Circle className="size-5 text-border-strong" />
                    )}
                  </span>

                  <span className="shrink-0 text-xs font-medium tabular-nums text-muted">
                    {formatTime(session.scheduled_start)}
                    <span className="mx-1 text-subtle">–</span>
                    {formatTime(session.scheduled_end)}
                  </span>

                  <span className="min-w-0 flex-1">
                    <span
                      className={`block truncate text-sm font-medium ${
                        done ? "text-muted line-through" : inProgress ? "text-primary" : ""
                      }`}
                    >
                      {session.topic.name}
                    </span>
                    <span className="flex items-center gap-1.5 text-xs text-subtle">
                      <span
                        className="size-2 shrink-0 rounded-full"
                        style={{ backgroundColor: session.subject.color }}
                        aria-hidden="true"
                      />
                      {session.subject.name}
                    </span>
                  </span>

                  <Badge tone={getEnergyTone(session.energy_match)} className="hidden sm:inline-flex">
                    {session.energy_match === "peak" && <Zap className="size-3" aria-hidden="true" />}
                    {getEnergyLabel(session.energy_match)}
                  </Badge>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function formatTime(isoString: string) {
  return new Date(isoString).toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });
}