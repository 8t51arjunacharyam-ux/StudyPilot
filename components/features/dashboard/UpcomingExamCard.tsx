import { CalendarClock, Layers } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import type { MockExam } from "@/lib/mock-data";

/**
 * UpcomingExamCard — the next exam and how much is left to cover.
 *
 * Urgency tone is derived from `daysAway` with simple thresholds so the
 * visual urgency is consistent everywhere. The real Difficulty Debt engine
 * will combine this with difficulty, confidence and remaining workload —
 * this card only shows the date-based part of that picture.
 */
export function UpcomingExamCard({ exam }: { exam: MockExam }) {
  const tone =
    exam.daysAway <= 7 ? "danger" : exam.daysAway <= 14 ? "warning" : "info";

  const urgency =
    exam.daysAway <= 7
      ? "Very soon"
      : exam.daysAway <= 14
        ? "Approaching"
        : "Upcoming";

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between pb-4">
        <CardTitle>Upcoming exam</CardTitle>
        <Badge tone={tone}>{urgency}</Badge>
      </CardHeader>

      <CardContent className="space-y-4">
        <div>
          <p className="text-base font-semibold">{exam.title}</p>
          <p className="mt-0.5 text-sm text-muted">{exam.subjectName}</p>
        </div>

        <dl className="space-y-2.5 border-t border-border pt-4 text-sm">
          <div className="flex items-center justify-between gap-3">
            <dt className="flex items-center gap-2 text-muted">
              <CalendarClock className="size-4" aria-hidden="true" />
              Date
            </dt>
            <dd className="font-medium">{exam.dateLabel}</dd>
          </div>
          <div className="flex items-center justify-between gap-3">
            <dt className="flex items-center gap-2 text-muted">
              <Layers className="size-4" aria-hidden="true" />
              Topics remaining
            </dt>
            <dd className="font-medium tabular-nums">{exam.topicsRemaining}</dd>
          </div>
          <div className="flex items-center justify-between gap-3">
            <dt className="text-muted">Time left</dt>
            <dd className="font-medium">
              {exam.daysAway} {exam.daysAway === 1 ? "day" : "days"}
            </dd>
          </div>
        </dl>
      </CardContent>
    </Card>
  );
}