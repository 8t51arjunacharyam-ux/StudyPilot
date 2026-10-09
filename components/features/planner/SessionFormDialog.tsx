"use client";

import { useEffect, useState } from "react";
import { X, CalendarCheck, Plus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Field";
import { type Subject } from "@/lib/data/subjects";
import { type Topic } from "@/lib/data/topics";
import { type StudySessionWithDetails } from "@/lib/data/study_sessions";

interface SessionFormDialogProps {
  isOpen: boolean;
  onClose: () => void;
  subjects: Subject[];
  topics: Topic[];
  initialData?: StudySessionWithDetails;
  onSubmit: (formData: FormData) => void;
  isLoading: boolean;
}

export function SessionFormDialog({
  isOpen,
  onClose,
  subjects,
  topics,
  initialData,
  onSubmit,
  isLoading,
}: SessionFormDialogProps) {
  const isEditing = !!initialData;
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>(() => {
    if (isEditing && initialData) return initialData.subject_id;
    if (subjects.length > 0) return subjects[0].id;
    return "";
  });

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  const filteredTopics = topics.filter((t) => t.subject_id === selectedSubjectId);

  if (!isOpen) return null;

  return (
    <dialog
      id="session-form-dialog"
      className="max-w-md w-full max-h-[90vh] overflow-y-auto rounded-xl border border-border bg-surface p-6 shadow-overlay"
      onClose={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-lg font-semibold">{isEditing ? "Edit Session" : "Add Session"}</h3>
          <p className="text-sm text-muted">
            {isEditing ? "Update the session details below." : "Enter the session details below."}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-field p-1.5 text-muted hover:text-foreground hover:bg-surface-muted transition-colors"
          aria-label="Close dialog"
        >
          <X className="size-4" />
        </button>
      </div>

      <form onSubmit={(e) => { e.preventDefault(); onSubmit(new FormData(e.currentTarget)); }} className="mt-6 space-y-4">
        {isEditing && (
          <input type="hidden" name="id" value={initialData!.id} />
        )}

        <div className="space-y-1.5">
          <Label htmlFor="subject_id">Subject</Label>
          <select
            id="subject_id"
            name="subject_id"
            required
            disabled={isLoading}
            value={selectedSubjectId}
            onChange={(e) => setSelectedSubjectId(e.target.value)}
            className="h-10 w-full rounded-field border border-border bg-surface px-3 text-sm outline-none focus:border-primary"
          >
            <option value="">Select a subject</option>
            {subjects.map((subject) => (
              <option key={subject.id} value={subject.id}>
                {subject.name}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="topic_id">Topic</Label>
          <select
            id="topic_id"
            name="topic_id"
            required
            disabled={isLoading || filteredTopics.length === 0}
            defaultValue={initialData?.topic_id ?? ""}
            className="h-10 w-full rounded-field border border-border bg-surface px-3 text-sm outline-none focus:border-primary"
          >
            {filteredTopics.length === 0 ? (
              <option value="">Select a subject first</option>
            ) : (
              <>
                <option value="">Select a topic</option>
                {filteredTopics.map((topic) => (
                  <option key={topic.id} value={topic.id}>
                    {topic.name}
                  </option>
                ))}
              </>
            )}
          </select>
          {filteredTopics.length === 0 && selectedSubjectId && (
            <p className="text-xs text-muted">No topics found for this subject. Add topics in the Subjects page.</p>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="scheduled_start">Start Date & Time</Label>
            <Input
              id="scheduled_start"
              name="scheduled_start"
              type="datetime-local"
              required
              disabled={isLoading}
              defaultValue={initialData?.scheduled_start?.slice(0, 16)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="scheduled_end">End Date & Time</Label>
            <Input
              id="scheduled_end"
              name="scheduled_end"
              type="datetime-local"
              required
              disabled={isLoading}
              defaultValue={initialData?.scheduled_end?.slice(0, 16)}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="planned_minutes">Planned Minutes</Label>
          <Input
            id="planned_minutes"
            name="planned_minutes"
            type="number"
            min={5}
            max={480}
            step={5}
            required
            disabled={isLoading}
            defaultValue={String(initialData?.planned_minutes ?? 60)}
          />
        </div>

        <div className="flex gap-3 pt-4">
          <Button type="button" variant="secondary" onClick={onClose} disabled={isLoading} className="flex-1">
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={isLoading} className="flex-1">
            {isLoading ? "Saving..." : isEditing ? "Update Session" : "Create Session"}
          </Button>
        </div>
      </form>
    </dialog>
  );
}