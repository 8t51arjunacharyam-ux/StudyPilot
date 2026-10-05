import { Radar } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/Card";
import { ButtonLink } from "@/components/ui/Button";
import type { RadarTopic } from "@/lib/mock-data";

/**
 * MemoryRadarCard — topics most at risk of being forgotten.
 *
 * The confidence numbers here are hand-written constants, NOT the output of
 * any forgetting-curve calculation. The real Memory Radar will derive this
 * from each topic's `last_reviewed_at` and its review history in
 * `topic_reviews`, using a spaced-repetition model.
 *
 * Confidence is shown with a coloured bar *and* a number, never colour
 * alone — colour-blind users must be able to read the value too.
 */
export function MemoryRadarCard({ topics }: { topics: RadarTopic[] }) {
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between pb-4">
        <div className="flex items-center gap-2.5">
          <Radar className="size-4 text-primary" aria-hidden="true" />
          <CardTitle>Memory radar</CardTitle>
        </div>
        <span className="text-xs text-muted">At-risk topics</span>
      </CardHeader>

      <CardContent>
        <ul className="space-y-4">
          {topics.map((topic) => {
            const tone =
              topic.confidence < 45 ? "danger" : topic.confidence < 70 ? "warning" : "success";

            return (
              <li key={topic.id} className="space-y-1.5">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="min-w-0 truncate text-sm font-medium">
                    {topic.topicName}
                  </span>
                  <span
                    className={`shrink-0 text-xs font-semibold tabular-nums ${
                      tone === "danger"
                        ? "text-danger"
                        : tone === "warning"
                          ? "text-warning"
                          : "text-success"
                    }`}
                  >
                    {topic.confidence}%
                  </span>
                </div>

                <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-muted">
                  <div
                    className={`h-full rounded-full ${
                      tone === "danger"
                        ? "bg-danger"
                        : tone === "warning"
                          ? "bg-warning"
                          : "bg-success"
                    }`}
                    style={{ width: `${topic.confidence}%` }}
                  />
                </div>

                <p className="text-xs text-subtle">
                  {topic.subjectName} · last reviewed {topic.daysSinceReview}{" "}
                  {topic.daysSinceReview === 1 ? "day" : "days"} ago
                </p>
              </li>
            );
          })}
        </ul>
      </CardContent>

      <CardFooter>
        <ButtonLink href="/progress" variant="ghost" size="sm">
          View all topics
        </ButtonLink>
      </CardFooter>
    </Card>
  );
}