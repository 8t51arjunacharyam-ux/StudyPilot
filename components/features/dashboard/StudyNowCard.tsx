"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Clock, PlayCircle, TrendingDown, X, RefreshCw } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { type StudyNowRecommendation } from "@/lib/types/database";
import { createStudySessionFromRecommendationAction } from "@/lib/actions/study_sessions";

const activityTypeLabels: Record<string, string> = {
  learn: "Learn",
  practice: "Practice",
  active_recall: "Active Recall",
  revision: "Revision",
  mock_test: "Mock Test",
};

const activityTypeColors: Record<string, string> = {
  learn: "#4f46e5",
  practice: "#0891b2",
  active_recall: "#ca8a04",
  revision: "#7c3aed",
  mock_test: "#dc2626",
};

interface StudyNowCardProps {
  data: StudyNowRecommendation | null;
  onDismiss?: () => void;
}

export function StudyNowCard({ data, onDismiss }: StudyNowCardProps) {
  const router = useRouter();
  const [isLoading, startTransition] = useTransition();
  const [dismissed, setDismissed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!data) {
    return (
      <Card className="border-primary/25 bg-surface">
        <CardHeader className="flex-row items-start justify-between gap-4 pb-3">
          <div className="flex items-center gap-2.5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-primary">
                Study Now
              </p>
              <CardTitle className="mt-0.5 text-lg">No recommendation yet</CardTitle>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm leading-relaxed text-muted">
            Add subjects, topics, and exams to get personalized study recommendations.
          </p>
        </CardContent>
        <CardFooter>
          <Link href="/subjects" className="text-sm font-medium text-primary hover:underline">
            Set up your subjects
          </Link>
        </CardFooter>
      </Card>
    );
  }

  if (dismissed) {
    return (
      <Card className="border-primary/25 bg-surface">
        <CardHeader className="flex-row items-start justify-between gap-4 pb-3">
          <div className="flex items-center gap-2.5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-primary">
                Study Now
              </p>
              <CardTitle className="mt-0.5 text-lg">Recommendation dismissed</CardTitle>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm leading-relaxed text-muted">
            Tap &ldquo;Choose Another&rdquo; to get a new recommendation.
          </p>
        </CardContent>
        <CardFooter className="justify-between">
          <Button
            variant="secondary"
            onClick={() => setDismissed(false)}
            disabled={isLoading}
            className="flex-1"
          >
            <RefreshCw className="size-4 mr-2" aria-hidden="true" />
            Choose Another
          </Button>
        </CardFooter>
      </Card>
    );
  }

  // TypeScript narrowing: data is non-null here
  const recommendation = data;
  const lowConfidence = recommendation.confidence < 50;

  async function handleStartSession() {
    setError(null);
    startTransition(async () => {
      const result = await createStudySessionFromRecommendationAction(
        recommendation.topicId,
        recommendation.durationMinutes
      );
      if (!result.ok) {
        setError(result.error);
      } else {
        // Redirect to planner to show the active session
        router.push("/planner");
      }
    });
  }

  function handleDismiss() {
    if (onDismiss) onDismiss();
    setDismissed(true);
  }

  function handleChooseAnother() {
    // For now, just dismiss and let the server re-render with a new recommendation
    // In a more advanced implementation, we'd exclude this topic and re-run the engine
    handleDismiss();
  }

  return (
    <Card className="border-primary/25 bg-surface">
      {error && (
        <div className="mb-4 p-3 text-sm text-danger bg-danger-soft rounded-field" role="alert">
          {error}
        </div>
      )}

      <CardHeader className="flex-row items-start justify-between gap-4 pb-3">
        <div className="flex items-center gap-2.5 flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span
              className="size-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: recommendation.subjectColor }}
              aria-hidden="true"
            />
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wider text-primary">
                Study Now
              </p>
              <CardTitle className="mt-0.5 text-lg truncate">{recommendation.topicName}</CardTitle>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge tone={lowConfidence ? "danger" : "warning"}>
            <TrendingDown className="size-3" aria-hidden="true" />
            {recommendation.confidence}% confidence
          </Badge>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDismiss}
            disabled={isLoading}
            aria-label="Dismiss recommendation"
            className="h-8 p-1.5"
          >
            <X className="size-4" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <p className="text-sm leading-relaxed text-muted">{recommendation.reason}</p>

        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-muted">
          <span className="inline-flex items-center gap-1.5">
            <Clock className="size-3.5" aria-hidden="true" />
            {recommendation.durationMinutes} minutes
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span
              className="size-2 rounded-full"
              style={{ backgroundColor: recommendation.subjectColor }}
              aria-hidden="true"
            />
            {recommendation.subjectName}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span
              className="size-2 rounded-full"
              style={{
                backgroundColor: activityTypeColors[recommendation.activityType] ?? "#6b7280",
              }}
              aria-hidden="true"
            />
            {activityTypeLabels[recommendation.activityType] ?? recommendation.activityType}
          </span>
        </div>

        <div className="pt-2 border-t border-border">
          <div className="text-xs text-muted mb-2 font-medium">Priority: {recommendation.priorityScore}%</div>
          <div className="w-full bg-surface-muted rounded-full h-2">
            <div
              className="bg-primary h-2 rounded-full transition-all duration-300"
              style={{ width: `${recommendation.priorityScore}%` }}
              role="progressbar"
              aria-valuenow={recommendation.priorityScore}
              aria-valuemin={0}
              aria-valuemax={100}
            />
          </div>
        </div>
      </CardContent>

      <CardFooter className="justify-between gap-3 flex-wrap">
        <Button
          variant="secondary"
          onClick={handleChooseAnother}
          disabled={isLoading}
          className="flex-1 min-w-[140px]"
        >
          <RefreshCw className="size-4 mr-2" aria-hidden="true" />
          Choose Another
        </Button>
        <Button
          variant="primary"
          onClick={handleStartSession}
          disabled={isLoading}
          className="flex-1 min-w-[140px]"
        >
          {isLoading ? (
            <>
              <span className="size-4 mr-2 animate-spin border-2 border-current border-t-transparent rounded-full" />
              Starting...
            </>
          ) : (
            <>
              <PlayCircle className="size-4 mr-2" aria-hidden="true" />
              Start Session
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}