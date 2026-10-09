import { CalendarClock, Layers } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import type { ExamWithSubject } from "@/lib/types/database";

/**
 * UpcomingExamCard — the next exam and how much is left to cover.
 */
export function UpcomingExamCard({ exam }: { exam: ExamWithSubject | null }) {
  if (!exam) {
    return (
      <Card>
        <CardHeader className="pb-4">
          <CardTitle>Upcoming exam</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted">No exams scheduled. Add an exam to see it here.</p>
        </CardContent>
      </Card>
    );
  }

  const now = Date.now();
  const examTime = new Date(exam.exam_date).getTime();
  const daysUntil = Math.ceil((examTime - now) / (1000 * 60 * 60 * 24));
  const isPast = daysUntil < 0;

  const tone =
    isPast ? "neutral" : daysUntil <= 7 ? "danger" : daysUntil <= 14 ? "warning" : "info";

  const urgency =
    isPast
      ? "Past"
      : daysUntil <= 7
        ? "Very soon"
        : daysUntil <= 14
          ? "Approaching"
          : "Upcoming";

  const subject = exam.subject as { name: string; color: string } | null;
  const subjectName = subject?.name ?? "Unknown";

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between pb-4">
        <CardTitle>Upcoming exam</CardTitle>
        <Badge tone={tone}>{urgency}</Badge>
      </CardHeader>

      <CardContent className="space-y-4">
        <div>
          <p className="text-base font-semibold">{exam.title}</p>
          <p className="mt-0.5 text-sm text-muted">{subjectName}</p>
        </div>

        <dl className="space-y-2.5 border-t border-border pt-4 text-sm">
          <div className="flex items-center justify-between gap-3">
            <dt className="flex items-center gap-2 text-muted">
              <CalendarClock className="size-4" aria-hidden="true" />
              Date
            </dt>
            <dd className="font-medium">
              {new Date(exam.exam_date).toLocaleDateString(undefined, {
                weekday: "short",
                month: "short",
                day: "numeric",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </dd>
          </div>
          <div className="flex items-center justify-between gap-3">
            <dt className="flex items-center gap-2 text-muted">
              <Layers className="size-4" aria-hidden="true" />
              Topics remaining
            </dt>
            <dd className="font-medium tabular-nums">{exam.topics_covered?.length ?? 0}</dd>
          </div>
          <div className="flex items-center justify-between gap-3">
            <dt className="text-muted">Time left</dt>
            <dd className="font-medium">
              {isPast ? "Exam passed" : `${daysUntil} ${daysUntil === 1 ? "day" : "days"}`}
            </dd>
          </div>
        </dl>
      </CardContent>
    </Card>
  );
}