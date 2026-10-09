"use client";

import { useMemo } from "react";
import { CalendarCheck, Trash2, Edit } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Progress } from "@/components/ui/Progress";
import { type ExamWithSubject } from "@/lib/data/exams";

export function ExamCard({
  exam,
  onEdit,
  onDelete,
  isLoading,
}: {
  exam: ExamWithSubject;
  onEdit: (exam: ExamWithSubject) => void;
  onDelete: (id: string) => void;
  isLoading: boolean;
}) {
  const riskTone = useMemo(() => {
    switch (exam.risk_level) {
      case "critical": return "danger";
      case "high": return "warning";
      case "medium": return "info";
      default: return "success";
    }
  }, [exam.risk_level]);

  const daysLabel = useMemo(() => {
    if (exam.is_past) return "Exam passed";
    if (exam.days_until === 0) return "Exam today";
    if (exam.days_until === 1) return "Exam tomorrow";
    return `Exam in ${exam.days_until} days`;
  }, [exam.is_past, exam.days_until]);

  function handleDeleteClick() {
    if (confirm(`Delete "${exam.title}"? This cannot be undone.`)) {
      onDelete(exam.id);
    }
  }

  return (
    <Card className="p-5 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <div
              className="flex size-9 shrink-0 items-center justify-center rounded-field text-sm font-semibold"
              style={{ backgroundColor: exam.subject_color + "20", color: exam.subject_color }}
              aria-hidden="true"
            >
              <CalendarCheck className="size-4" />
            </div>
            <h3 className="font-semibold truncate">{exam.title}</h3>
          </div>
          <p className="mt-1 text-sm text-muted">{exam.subject_name}</p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onEdit(exam)}
            disabled={isLoading}
            className="text-muted hover:text-foreground hover:bg-surface-muted transition-colors disabled:opacity-50"
            aria-label={`Edit ${exam.title}`}
          >
            <Edit className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDeleteClick}
            disabled={isLoading}
            className="text-danger hover:bg-danger-soft transition-colors disabled:opacity-50"
            aria-label={`Delete ${exam.title}`}
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex size-10 items-center justify-center rounded-field bg-surface-muted">
          <CalendarCheck className="size-5 text-muted" aria-hidden="true" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium">{daysLabel}</p>
          <p className="text-xs text-muted">
            {new Date(exam.exam_date).toLocaleDateString(undefined, {
              weekday: "short",
              month: "short",
              day: "numeric",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Badge tone="neutral">Importance: {exam.importance}/5</Badge>
        <Badge tone="neutral">Difficulty: {exam.difficulty}/5</Badge>
        <Badge tone={exam.is_past ? "neutral" : riskTone}>
          {exam.is_past ? "Past" : exam.risk_level.charAt(0).toUpperCase() + exam.risk_level.slice(1)} Risk
        </Badge>
      </div>

      <Progress
        value={exam.risk_score}
        label="Risk Score"
        tone={riskTone}
        showValue={true}
      />

      <p className="text-xs text-muted">
        This risk score is an application-generated planning metric based on days remaining, subject
        difficulty, remaining workload, and preparation percentage. It does not predict actual exam
        performance.
      </p>
    </Card>
  );
}