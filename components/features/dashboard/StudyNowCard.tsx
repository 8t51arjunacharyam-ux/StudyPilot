import { Clock, PlayCircle, TrendingDown } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import type { MockStudyNow } from "@/lib/mock-data";

/**
 * StudyNowCard — the single recommended session.
 *
 * Note this card is intentionally the most prominent element on the
 * dashboard. "What should I do right now?" is the single most frequent
 * question a student has, so answering it should never require hunting.
 *
 * The Start button is disabled because session execution is not built yet.
 */
export function StudyNowCard({ data }: { data: MockStudyNow }) {
  const lowConfidence = data.confidence < 50;

  return (
    <Card className="border-primary/25 bg-surface">
      <CardHeader className="flex-row items-start justify-between gap-4 pb-3">
        <div className="flex items-center gap-2.5">
          <span
            className="size-2.5 shrink-0 rounded-full"
            style={{ backgroundColor: data.color }}
            aria-hidden="true"
          />
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-primary">
              Study Now
            </p>
            <CardTitle className="mt-0.5 text-lg">{data.topicName}</CardTitle>
          </div>
        </div>
        <Badge tone={lowConfidence ? "danger" : "warning"}>
          <TrendingDown className="size-3" aria-hidden="true" />
          {data.confidence}% confidence
        </Badge>
      </CardHeader>

      <CardContent className="space-y-4">
        <p className="text-sm leading-relaxed text-muted">{data.whyThis}</p>

        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-muted">
          <span className="inline-flex items-center gap-1.5">
            <Clock className="size-3.5" aria-hidden="true" />
            {data.durationMinutes} minutes
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span
              className="size-2 rounded-full"
              style={{ backgroundColor: data.color }}
              aria-hidden="true"
            />
            {data.subjectName}
          </span>
        </div>
      </CardContent>

      <CardFooter className="justify-between">
        <p className="text-xs text-subtle">Session execution not built yet.</p>
        <Button disabled>
          <PlayCircle className="size-4" aria-hidden="true" />
          Start session
        </Button>
      </CardFooter>
    </Card>
  );
}