import { Clock3, CheckCircle2, Flame, Target } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Progress } from "@/components/ui/Progress";
import type { mockStudyHealth } from "@/lib/mock-data";

/**
 * StudyHealthCard — a summary of how the week is going.
 *
 * All numbers are hand-written constants from lib/mock-data.ts. The
 * percentages below are simple arithmetic on those constants for display;
 * they are not a real health score. The real score comes from Difficulty Debt
 * once the domain engine exists.
 */
export function StudyHealthCard({
  data,
}: {
  data: typeof mockStudyHealth;
}) {
  const completionRate =
    data.sessionsPlanned > 0
      ? (data.sessionsCompleted / data.sessionsPlanned) * 100
      : 0;

  const stats = [
    {
      icon: Clock3,
      label: "Hours this week",
      value: `${data.weeklyHoursCompleted} / ${data.weeklyHoursPlanned}h`,
    },
    {
      icon: CheckCircle2,
      label: "Sessions done",
      value: `${data.sessionsCompleted} / ${data.sessionsPlanned}`,
    },
    {
      icon: Flame,
      label: "Day streak",
      value: `${data.streakDays} days`,
    },
    {
      icon: Target,
      label: "On track",
      value: data.healthLabel,
    },
  ];

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle>Study health</CardTitle>
      </CardHeader>

      <CardContent className="space-y-5">
        <Progress
          value={completionRate}
          label="Weekly session completion"
          tone={completionRate >= 75 ? "success" : completionRate >= 50 ? "warning" : "danger"}
        />

        <dl className="grid grid-cols-2 gap-x-4 gap-y-4">
          {stats.map((stat) => (
            <div key={stat.label} className="space-y-1">
              <dt className="flex items-center gap-1.5 text-xs text-muted">
                <stat.icon className="size-3.5" aria-hidden="true" />
                {stat.label}
              </dt>
              <dd className="text-sm font-semibold tabular-nums">{stat.value}</dd>
            </div>
          ))}
        </dl>
      </CardContent>
    </Card>
  );
}