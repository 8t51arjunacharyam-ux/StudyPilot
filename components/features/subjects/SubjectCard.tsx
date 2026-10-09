"use client";

import { useState, useMemo } from "react";
import { Archive, FolderOpen, Edit, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Progress } from "@/components/ui/Progress";
import { Badge } from "@/components/ui/Badge";
import { SubjectFormDialog } from "./SubjectFormDialog";
import { type SubjectWithProgress } from "@/lib/data/subjects";

export function SubjectCard({
  subject,
  onArchive,
  onUnarchive,
  isLoading,
}: {
  subject: SubjectWithProgress;
  onArchive: (id: string) => void;
  onUnarchive: (id: string) => void;
  isLoading: boolean;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const daysUntilExam = useMemo(() => {
    if (!subject.exam_date) return null;
    const now = Date.now();
    return Math.ceil((new Date(subject.exam_date).getTime() - now) / (1000 * 60 * 60 * 24));
  }, [subject.exam_date]);

  function handleArchiveClick() {
    if (confirm(`Archive "${subject.name}"? This will hide it from your active subjects.`)) {
      onArchive(subject.id);
    }
  }

  function handleUnarchiveClick() {
    if (confirm(`Restore "${subject.name}" to your active subjects?`)) {
      onUnarchive(subject.id);
    }
  }

  function handleEditClick() {
    setShowForm(true);
  }

  function handleSaveSubject(data: {
    name: string;
    color?: string;
    difficulty: number;
    importance: number;
  }) {
    setShowForm(false);
    // Could trigger a reload or state update here
    window.location.reload();
  }

  return (
    <Card className="p-5 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <div
              className="flex size-9 shrink-0 items-center justify-center rounded-field text-sm font-semibold"
              style={{ backgroundColor: subject.color + "20", color: subject.color }}
              aria-hidden="true"
            >
              {subject.name.charAt(0).toUpperCase()}
            </div>
            <h3 className="font-semibold truncate">{subject.name}</h3>
          </div>
          <p className="mt-1 text-sm text-muted">
            {subject.topics_completed} of {subject.topics_total} topics completed
          </p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {isEditing ? (
            <Button
              type="button"
              onClick={() => {
                setShowForm(false);
                window.location.reload();
              }}
              disabled={isLoading}
              className="rounded-field p-1.5 text-foreground hover:bg-primary-soft transition-colors disabled:opacity-50"
            >
              <X className="size-4" /> Save
            </Button>
          ) : (
            <Button
              type="button"
              onClick={handleEditClick}
              disabled={isLoading}
              className="rounded-field p-1.5 text-muted hover:text-foreground hover:bg-surface-muted transition-colors disabled:opacity-50"
              aria-label={isEditing ? "Cancel editing" : "Edit subject"}
            >
              {isEditing ? (
                <div className="flex size-4 shrink-0 items-center justify-center">
                  <span className="size-4" aria-hidden="true" />
                </div>
              ) : <Edit className="size-4" />}
            </Button>
          )}
        </div>
      </div>

      <Progress
        value={subject.progress}
        label={`${subject.name} progress`}
        tone={subject.progress === 100 ? "success" : "primary"}
      />

      <div className="flex flex-wrap items-center gap-2">
        <Badge tone="neutral">Difficulty: {subject.difficulty}/10</Badge>
        <Badge tone="neutral">Importance: {subject.importance}/5</Badge>
        {daysUntilExam !== null && (
          <Badge
            tone={
              daysUntilExam < 0 ? "danger" :
              daysUntilExam <= 7 ? "warning" :
              daysUntilExam <= 14 ? "info" : "success"
            }
          >
            {daysUntilExam < 0 ? "Exam passed" : `Exam in ${daysUntilExam} days`}
          </Badge>
        )}
        {subject.remaining_minutes > 0 && (
          <Badge tone="info">{Math.round(subject.remaining_minutes / 60)}h remaining</Badge>
        )}
      </div>

      <div className="flex items-center justify-between pt-2 border-t border-border">
        <div className="flex items-center gap-2">
          {subject.archived_at ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleUnarchiveClick}
              disabled={isLoading}
              className="text-success hover:bg-success-soft"
            >
              <FolderOpen className="size-3.5 mr-1.5" aria-hidden="true" />
              Restore
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleArchiveClick}
              disabled={isLoading}
              className="text-muted hover:text-foreground hover:bg-surface-muted"
            >
              <Archive className="size-3.5 mr-1.5" aria-hidden="true" />
              Archive
            </Button>
          )}
        </div>
        <a
          href={`/subjects/${subject.id}`}
          className="text-sm font-medium text-primary hover:underline"
        >
          View details
          <FolderOpen className="size-3.5 ml-1" aria-hidden="true" />
        </a>
      </div>

      {/* Subject Form Dialog */}
      <SubjectFormDialog
        isOpen={showForm}
        onClose={() => setShowForm(false)}
        initialData={subject}
        onSubmit={handleSaveSubject}
        isLoading={isLoading}
      />
    </Card>
  );
}