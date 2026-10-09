"use client";

import { useState, useTransition } from "react";
import { Plus, Trash2, Edit, ArrowLeft, CheckCircle2, Circle, Play, X, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Progress } from "@/components/ui/Progress";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { Input, Label } from "@/components/ui/Field";
import {
  createTopicAction,
  updateTopicAction,
  deleteTopicAction,
  completeTopicAction,
  uncompleteTopicAction,
} from "@/lib/actions/topics";
import { type SubjectWithProgress } from "@/lib/data/subjects";
import { type Topic } from "@/lib/data/topics";

interface SubjectDetailProps {
  subject: SubjectWithProgress;
  initialTopics: Topic[];
}

export function SubjectDetail({ subject, initialTopics }: SubjectDetailProps) {
  const [topics, setTopics] = useState<Topic[]>(initialTopics);
  const [isLoading, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingTopic, setEditingTopic] = useState<Topic | null>(null);

  async function handleCreateTopic(formData: FormData) {
    const name = formData.get("name") as string;
    const difficulty = parseInt(formData.get("difficulty") as string, 10);
    const estimated_minutes = parseInt(formData.get("estimated_minutes") as string, 10);
    const confidence = parseInt(formData.get("confidence") as string, 10) || 50;

    setError(null);
    startTransition(async () => {
      const result = await createTopicAction({ subject_id: subject.id, name, difficulty, estimated_minutes, confidence });
      if (!result.ok) {
        setError(result.error);
      } else {
        setShowCreateDialog(false);
        window.location.reload();
      }
    });
  }

  async function handleUpdateTopic(formData: FormData) {
    const id = formData.get("id") as string;
    const name = formData.get("name") as string;
    const difficulty = parseInt(formData.get("difficulty") as string, 10);
    const estimated_minutes = parseInt(formData.get("estimated_minutes") as string, 10);
    const confidence = parseInt(formData.get("confidence") as string, 10) || 50;

    setError(null);
    startTransition(async () => {
      const result = await updateTopicAction({ id, name, difficulty, estimated_minutes, confidence });
      if (!result.ok) {
        setError(result.error);
      } else {
        setEditingTopic(null);
        window.location.reload();
      }
    });
  }

  async function handleDeleteTopic(id: string) {
    setError(null);
    startTransition(async () => {
      const result = await deleteTopicAction(id);
      if (!result.ok) {
        setError(result.error);
      } else {
        setTopics((prev) => prev.filter((t) => t.id !== id));
      }
    });
  }

  async function handleCompleteTopic(id: string) {
    setError(null);
    startTransition(async () => {
      const result = await completeTopicAction(id);
      if (!result.ok) {
        setError(result.error);
      } else {
        window.location.reload();
      }
    });
  }

  async function handleUncompleteTopic(id: string) {
    setError(null);
    startTransition(async () => {
      const result = await uncompleteTopicAction(id);
      if (!result.ok) {
        setError(result.error);
      } else {
        window.location.reload();
      }
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => window.history.back()}>
          <ArrowLeft className="size-4 mr-1.5" aria-hidden="true" />
          Back
        </Button>
        <div>
          <h1 className="text-2xl font-bold">{subject.name}</h1>
          <p className="text-sm text-muted">
            {subject.topics_completed} of {subject.topics_total} topics completed
          </p>
        </div>
      </div>

      {error && <ErrorState title="Error" message={error} onRetry={() => setError(null)} />}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Progress
          value={subject.progress}
          label={`${subject.name} progress`}
          tone={subject.progress === 100 ? "success" : "primary"}
        />

        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="neutral">Difficulty: {subject.difficulty}/10</Badge>
          <Badge tone="neutral">Importance: {subject.importance}/5</Badge>
          {subject.remaining_minutes > 0 && (
            <Badge tone="info">{Math.round(subject.remaining_minutes / 60)}h remaining</Badge>
          )}
        </div>

        <Button
          variant="primary"
          onClick={() => setShowCreateDialog(true)}
          className="w-full sm:w-auto"
        >
          <Plus className="size-4 mr-2" aria-hidden="true" />
          Add Topic
        </Button>
      </div>

      {topics.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="No topics yet"
          description="Add your first topic to start building this subject."
          action={
            <Button variant="primary" onClick={() => setShowCreateDialog(true)}>
              <Plus className="size-4 mr-2" aria-hidden="true" />
              Add Topic
            </Button>
          }
        />
      ) : (
        <div className="space-y-4">
          {topics.map((topic) => (
            <TopicCard
              key={topic.id}
              topic={topic}
              subjectColor={subject.color}
              onEdit={setEditingTopic}
              onDelete={handleDeleteTopic}
              onComplete={handleCompleteTopic}
              onUncomplete={handleUncompleteTopic}
              isLoading={isLoading}
            />
          ))}
        </div>
      )}

      <TopicFormDialog
        isOpen={showCreateDialog}
        onClose={() => setShowCreateDialog(false)}
        subjectId={subject.id}
        onSubmit={handleCreateTopic}
        isLoading={isLoading}
      />

      <TopicFormDialog
        isOpen={!!editingTopic}
        onClose={() => setEditingTopic(null)}
        subjectId={subject.id}
        initialData={editingTopic ?? undefined}
        onSubmit={handleUpdateTopic}
        isLoading={isLoading}
      />
    </div>
  );
}

function TopicCard({
  topic,
  subjectColor,
  onEdit,
  onDelete,
  onComplete,
  onUncomplete,
  isLoading,
}: {
  topic: Topic;
  subjectColor: string;
  onEdit: (topic: Topic) => void;
  onDelete: (id: string) => void;
  onComplete: (id: string) => void;
  onUncomplete: (id: string) => void;
  isLoading: boolean;
}) {
  const isCompleted = !!topic.completed_at;

  function handleDeleteClick() {
    if (confirm(`Delete "${topic.name}"? This cannot be undone.`)) {
      onDelete(topic.id);
    }
  }

  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <div
              className="flex size-9 shrink-0 items-center justify-center rounded-field text-sm font-semibold"
              style={{ backgroundColor: subjectColor + "20", color: subjectColor }}
              aria-hidden="true"
            >
              {topic.name.charAt(0).toUpperCase()}
            </div>
            <h3 className={`font-semibold truncate ${isCompleted ? "line-through text-muted" : ""}`}>
              {topic.name}
            </h3>
            {isCompleted && (
              <span className="text-xs text-success font-medium">Completed</span>
            )}
          </div>
          <p className="mt-1 text-sm text-muted">
            Difficulty: {topic.difficulty}/10 · {topic.estimated_minutes} min
          </p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {!isCompleted && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onEdit(topic)}
              disabled={isLoading}
              className="text-muted hover:text-foreground hover:bg-surface-muted"
              aria-label={`Edit ${topic.name}`}
            >
              <Edit className="size-4" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={isCompleted ? () => onUncomplete(topic.id) : () => onComplete(topic.id)}
            disabled={isLoading}
            className={isCompleted ? "text-success hover:bg-success-soft" : "text-primary hover:bg-primary-soft"}
            aria-label={isCompleted ? `Mark ${topic.name} as incomplete` : `Mark ${topic.name} as complete`}
          >
            {isCompleted ? <Circle className="size-3.5" /> : <CheckCircle2 className="size-3.5" />}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDeleteClick}
            disabled={isLoading}
            className="text-danger hover:bg-danger-soft"
            aria-label={`Delete ${topic.name}`}
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Badge tone="neutral">Confidence: {topic.confidence}%</Badge>
        {topic.completed_at && <Badge tone="success">Completed</Badge>}
      </div>
    </Card>
  );
}

function TopicFormDialog({
  isOpen,
  onClose,
  subjectId,
  initialData,
  onSubmit,
  isLoading,
}: {
  isOpen: boolean;
  onClose: () => void;
  subjectId: string;
  initialData?: Topic;
  onSubmit: (formData: FormData) => void;
  isLoading: boolean;
}) {
  if (!isOpen) return null;

  return (
    <dialog
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <form
        method="dialog"
        className="w-full max-w-md bg-background rounded-xl border border-border p-6 space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          const formData = new FormData(e.currentTarget);
          if (initialData) formData.set("id", initialData.id);
          onSubmit(formData);
        }}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">
            {initialData ? "Edit Topic" : "Add Topic"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-muted hover:text-foreground"
            aria-label="Close dialog"
          >
            <X className="size-5" />
          </button>
        </div>

        <input type="hidden" name="subject_id" value={subjectId} />
        {initialData && <input type="hidden" name="id" value={initialData.id} />}

        <div className="space-y-1.5">
          <Label htmlFor="name">Topic name</Label>
          <Input
            id="name"
            name="name"
            defaultValue={initialData?.name ?? ""}
            placeholder="e.g., Binary Search Trees"
            required
            maxLength={160}
            disabled={isLoading}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label htmlFor="difficulty">Difficulty (1-10)</Label>
            <Input
              id="difficulty"
              name="difficulty"
              type="number"
              min={1}
              max={10}
              defaultValue={initialData?.difficulty ?? 5}
              required
              disabled={isLoading}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="estimated_minutes">Estimated minutes</Label>
            <Input
              id="estimated_minutes"
              name="estimated_minutes"
              type="number"
              min={5}
              max={480}
              step={5}
              defaultValue={initialData?.estimated_minutes ?? 45}
              required
              disabled={isLoading}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="confidence">Initial confidence (0-100)</Label>
            <Input
              id="confidence"
              name="confidence"
              type="number"
              min={0}
              max={100}
              defaultValue={initialData?.confidence ?? 50}
              required
              disabled={isLoading}
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
          <Button type="button" variant="ghost" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={isLoading}>
            {isLoading ? "Saving..." : initialData ? "Save changes" : "Add topic"}
          </Button>
        </div>
      </form>
    </dialog>
  );
}