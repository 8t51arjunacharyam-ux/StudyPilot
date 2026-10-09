"use client";

import { useMemo } from "react";
import { CalendarCheck, Play, SkipForward, CalendarDays, Trash2, Clock, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { type StudySessionWithDetails } from "@/lib/data/study_sessions";

type SessionStatus = "planned" | "in_progress" | "completed" | "skipped" | "rescheduled" | "cancelled";

interface SessionCardProps {
  session: StudySessionWithDetails;
  onStart: (id: string) => void;
  onComplete: (id: string, actualMinutes: number) => void;
  onSkip: (id: string) => void;
  onReschedule: (id: string, newStart: string, newEnd: string) => void;
  onDelete: (id: string) => void;
  onCancel: (id: string) => void;
  isLoading: boolean;
}

export function SessionCard({
  session,
  onStart,
  onComplete,
  onSkip,
  onReschedule,
  onDelete,
  onCancel,
  isLoading,
}: SessionCardProps) {
  const statusConfig = useMemo(() => {
    switch (session.status as SessionStatus) {
      case "completed":
        return { label: "Completed", tone: "success" as const, icon: CheckCircle2 };
      case "in_progress":
        return { label: "In Progress", tone: "info" as const, icon: Play };
      case "skipped":
        return { label: "Skipped", tone: "warning" as const, icon: SkipForward };
      case "rescheduled":
        return { label: "Rescheduled", tone: "info" as const, icon: CalendarDays };
      case "cancelled":
        return { label: "Cancelled", tone: "danger" as const, icon: Trash2 };
      default:
        return { label: "Planned", tone: "neutral" as const, icon: CalendarCheck };
    }
  }, [session.status]);

  const StatusIcon = statusConfig.icon;

  const startTime = useMemo(() => {
    return new Date(session.scheduled_start).toLocaleTimeString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
    });
  }, [session.scheduled_start]);

  const endTime = useMemo(() => {
    return new Date(session.scheduled_end).toLocaleTimeString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
    });
  }, [session.scheduled_end]);

  const isPast = useMemo(() => {
    return new Date(session.scheduled_end) < new Date();
  }, [session.scheduled_end]);

  const isActionable = session.status === "planned" && !isPast;
  const isInProgress = session.status === "in_progress";

  function handleStart() {
    onStart(session.id);
  }

  function handleComplete() {
    const minutes = prompt("How many minutes did you actually study?", String(session.planned_minutes));
    if (minutes !== null) {
      const actualMinutes = parseInt(minutes, 10);
      if (!isNaN(actualMinutes) && actualMinutes >= 0) {
        onComplete(session.id, actualMinutes);
      }
    }
  }

  function handleSkip() {
    if (confirm(`Skip "${session.topic_name}"? This session will be marked as skipped.`)) {
      onSkip(session.id);
    }
  }

  function handleReschedule() {
    const newDate = prompt("Enter new date and time (YYYY-MM-DDTHH:MM):", session.scheduled_start.slice(0, 16));
    if (newDate) {
      const endDate = new Date(new Date(newDate).getTime() + session.planned_minutes * 60000).toISOString().slice(0, 16);
      onReschedule(session.id, newDate, endDate);
    }
  }

  function handleDelete() {
    if (confirm(`Delete this session? This cannot be undone.`)) {
      onDelete(session.id);
    }
  }

  function handleCancel() {
    if (confirm(`Cancel "${session.topic_name}"? This session will be marked as cancelled.`)) {
      onCancel(session.id);
    }
  }

  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <div
              className="flex size-9 shrink-0 items-center justify-center rounded-field text-sm font-semibold"
              style={{ backgroundColor: session.subject_color + "20", color: session.subject_color }}
              aria-hidden="true"
            >
              <CalendarCheck className="size-4" />
            </div>
            <h3 className="font-semibold truncate">{session.topic_name}</h3>
          </div>
          <p className="mt-1 text-sm text-muted">{session.subject_name}</p>
        </div>
        <Badge tone={statusConfig.tone}>
          <StatusIcon className="size-3 mr-1.5" aria-hidden="true" />
          {statusConfig.label}
        </Badge>
      </div>

      <div className="flex items-center gap-4 text-sm text-muted">
        <span className="flex items-center gap-1">
          <Clock className="size-3.5" aria-hidden="true" />
          {startTime} – {endTime}
        </span>
        <span className="flex items-center gap-1">
          <span>{session.planned_minutes} min planned</span>
        </span>
      </div>

      {isActionable && (
        <div className="flex items-center gap-2 pt-2 border-t border-border">
          <Button
            variant={isInProgress ? "secondary" : "primary"}
            size="sm"
            onClick={isInProgress ? handleComplete : handleStart}
            disabled={isLoading}
            className="flex-1"
          >
            {isInProgress ? "Complete" : "Start Session"}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSkip}
            disabled={isLoading}
            className="text-warning hover:bg-warning-soft"
            aria-label="Skip session"
          >
            <SkipForward className="size-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCancel}
            disabled={isLoading}
            className="text-danger hover:bg-danger-soft"
            aria-label="Cancel session"
          >
            <XCircle className="size-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleReschedule}
            disabled={isLoading}
            className="text-muted hover:bg-surface-muted"
            aria-label="Reschedule session"
          >
            <CalendarDays className="size-3.5" />
          </Button>
        </div>
      )}

      {session.status === "completed" && session.actual_minutes !== null && (
        <div className="text-sm text-success">
          Completed · {session.actual_minutes} minutes actual
        </div>
      )}

      {(session.status === "planned" || session.status === "in_progress") && isPast && (
        <div className="text-sm text-warning">
          This session was scheduled in the past.
        </div>
      )}
    </Card>
  );
}