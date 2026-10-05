import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Progress } from "@/components/ui/Progress";
import type { SubjectProgress } from "@/lib/mock-data";

/**
 * SubjectProgressCard — per-subject completion.
 *
 * `progress` and `topicsDone/total` are hardcoded mock values. When this
 * becomes real, progress should be computed from completed sessions rather
 * than stored, so the two can never disagree with each other.
 */
export function SubjectProgressCard({
  subjects,
}: {
  subjects: SubjectProgress[];
}) {
  return (
    <Card>
      <CardHeader className="pb-5">
        <CardTitle>Subject progress</CardTitle>
      </CardHeader>

      <CardContent className="space-y-5">
        {subjects.map((subject) => (
          <div key={subject.id} className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <span className="flex min-w-0 items-center gap-2">
                <span
                  className="size-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: subject.color }}
                  aria-hidden="true"
                />
                <span className="truncate text-sm font-medium">{subject.name}</span>
              </span>
              <span className="shrink-0 text-xs text-muted tabular-nums">
                {subject.topicsDone}/{subject.topicsTotal} topics
              </span>
            </div>

            <Progress
              value={subject.progress}
              label=""
              showValue={false}
              size="sm"
              tone={
                subject.progress >= 75
                  ? "success"
                  : subject.progress >= 40
                    ? "warning"
                    : "danger"
              }
            />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}